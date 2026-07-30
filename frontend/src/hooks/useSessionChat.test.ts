import { renderHook, act } from '@testing-library/react';
import { useSessionChat } from './useSessionChat';
import { logAction } from '../utils/userActionLogger';

jest.mock('../utils/userActionLogger', () => ({ logAction: jest.fn() }));

const mockedLogAction = logAction as jest.Mock;

/** Minimal stand-in for an open socket that records what was sent. */
function makeSocket(readyState = WebSocket.OPEN) {
    const sent: string[] = [];
    return {
        ref: { current: { readyState, send: (d: string) => sent.push(d) } as unknown as WebSocket },
        sent,
    };
}

/** Server echo payload as SessionConsumer emits it. */
const echo = (body: string, username: string, messageId = 'msg-1') => ({
    type: 'chat_message',
    message_id: messageId,
    body,
    sender_id: 'uid-1',
    sender_username: username,
    sender_name: 'Test User',
    sent_at: '2026-07-30T12:00:00+00:00',
});

const ctx = { shareToken: 'token-abc', hostId: 'host-123' };

beforeEach(() => mockedLogAction.mockClear());

describe('useSessionChat logging', () => {
    it('logs a sent message with session identifiers when the echo arrives', () => {
        const { ref } = makeSocket();
        const { result } = renderHook(() => useSessionChat(ref, 'alice', ctx));

        act(() => { result.current.send('hello team'); });
        expect(mockedLogAction).not.toHaveBeenCalled();   // not logged until echoed

        act(() => { result.current.ingest(echo('hello team', 'alice')); });

        expect(mockedLogAction).toHaveBeenCalledTimes(1);
        const [, payload] = mockedLogAction.mock.calls[0];
        expect(payload).toEqual({
            chat_message: 'hello team',
            session_token: 'token-abc',
            host_id: 'host-123',
            message_id: 'msg-1',
            sent_at: '2026-07-30T12:00:00+00:00',
        });
    });

    it('does not log messages received from other people', () => {
        const { ref } = makeSocket();
        const { result } = renderHook(() => useSessionChat(ref, 'alice', ctx));

        act(() => { result.current.ingest(echo('hi from bob', 'bob')); });

        expect(mockedLogAction).not.toHaveBeenCalled();
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].isOwn).toBe(false);
    });

    it('does not double-log when the same account has a second tab open', () => {
        // Two hooks, same user, but only the first one actually sent the message.
        const a = makeSocket();
        const b = makeSocket();
        const tabA = renderHook(() => useSessionChat(a.ref, 'alice', ctx));
        const tabB = renderHook(() => useSessionChat(b.ref, 'alice', ctx));

        act(() => { tabA.result.current.send('sent from tab A'); });

        const payload = echo('sent from tab A', 'alice');
        act(() => { tabA.result.current.ingest(payload); });
        act(() => { tabB.result.current.ingest(payload); });

        expect(mockedLogAction).toHaveBeenCalledTimes(1);
    });

    it('logs each occurrence when the same text is sent twice', () => {
        const { ref } = makeSocket();
        const { result } = renderHook(() => useSessionChat(ref, 'alice', ctx));

        act(() => { result.current.send('same text'); });
        act(() => { result.current.send('same text'); });
        act(() => { result.current.ingest(echo('same text', 'alice', 'msg-1')); });
        act(() => { result.current.ingest(echo('same text', 'alice', 'msg-2')); });

        expect(mockedLogAction).toHaveBeenCalledTimes(2);
        expect(mockedLogAction.mock.calls[0][1].message_id).toBe('msg-1');
        expect(mockedLogAction.mock.calls[1][1].message_id).toBe('msg-2');
    });

    it('refuses to send on a closed socket and logs nothing', () => {
        const { ref, sent } = makeSocket(WebSocket.CLOSED);
        const { result } = renderHook(() => useSessionChat(ref, 'alice', ctx));

        let ok = true;
        act(() => { ok = result.current.send('never delivered'); });

        expect(ok).toBe(false);
        expect(sent).toHaveLength(0);
        expect(mockedLogAction).not.toHaveBeenCalled();
    });

    it('ignores non-chat socket traffic', () => {
        const { ref } = makeSocket();
        const { result } = renderHook(() => useSessionChat(ref, 'alice', ctx));

        let handled = true;
        act(() => { handled = result.current.ingest({ type: 'workspace_update' }); });

        expect(handled).toBe(false);
        expect(result.current.messages).toHaveLength(0);
    });

    it('keeps ingest referentially stable so the socket effect never re-keys', () => {
        const { ref } = makeSocket();
        const { result, rerender } = renderHook(
            ({ u }) => useSessionChat(ref, u, ctx),
            { initialProps: { u: 'alice' } }
        );
        const first = result.current.ingest;
        rerender({ u: 'alice-renamed' });
        expect(result.current.ingest).toBe(first);
    });

    it('counts unread only while the panel is closed', () => {
        const { ref } = makeSocket();
        const { result } = renderHook(() => useSessionChat(ref, 'alice', ctx));

        act(() => { result.current.ingest(echo('one', 'bob', 'm1')); });
        expect(result.current.unreadCount).toBe(1);

        act(() => { result.current.setPanelOpen(true); });
        expect(result.current.unreadCount).toBe(0);

        act(() => { result.current.ingest(echo('two', 'bob', 'm2')); });
        expect(result.current.unreadCount).toBe(0);
    });
});
