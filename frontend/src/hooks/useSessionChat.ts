import { useCallback, useEffect, useRef, useState } from 'react';
import { logAction } from '../utils/userActionLogger';

export type ChatMessage = {
    id: string;
    body: string;
    senderUsername: string;
    senderName: string;
    sentAt: string;
    isOwn: boolean;
};

/** Chat is deliberately ephemeral; cap the transcript so a long session can't grow unbounded. */
const MAX_MESSAGES = 200;

/**
 * Session chat over the WebSocket the page already owns.
 *
 * Messages are relayed by SessionConsumer and never stored server-side, so the transcript
 * lives only in this component's state — it is gone on reload, by design. Each sent message
 * is additionally written to the action log, which is the only durable record.
 *
 * `ingest` is intentionally stable across renders: the pages register their socket handler
 * inside an effect keyed on the share token, so a changing callback identity would either
 * be captured stale or force the socket to reconnect. It reads mutable inputs via refs.
 */
export function useSessionChat(
    socketRef: React.MutableRefObject<WebSocket | null>,
    selfUsername: string | null
) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const selfUsernameRef = useRef(selfUsername);
    useEffect(() => {
        selfUsernameRef.current = selfUsername;
    }, [selfUsername]);

    // Whether the panel is currently visible, so we only count unread while it's closed.
    const panelOpenRef = useRef(false);

    /** Returns true if the message was a chat message and has been handled. */
    const ingest = useCallback((data: any): boolean => {
        if (!data || data.type !== 'chat_message' || typeof data.body !== 'string') {
            return false;
        }

        const senderUsername = data.sender_username || 'unknown';
        const isOwn = Boolean(selfUsernameRef.current) && senderUsername === selfUsernameRef.current;

        const message: ChatMessage = {
            // Fall back to a local id if the server payload predates message_id.
            id: data.message_id || `${senderUsername}-${data.sent_at || ''}-${Math.random()}`,
            body: data.body,
            senderUsername,
            senderName: data.sender_name || senderUsername,
            sentAt: data.sent_at || new Date().toISOString(),
            isOwn,
        };

        setMessages(prev => {
            const next = [...prev, message];
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
        });

        if (!isOwn && !panelOpenRef.current) {
            setUnreadCount(count => count + 1);
        }

        return true;
    }, []);

    /** Returns false if the socket isn't open, so the UI can say so rather than losing text. */
    const send = useCallback((body: string): boolean => {
        const trimmed = body.trim();
        if (!trimmed) return false;

        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return false;

        socket.send(JSON.stringify({ type: 'chat_message', body: trimmed }));

        // Research record: nothing persists this server-side, so the action log is the
        // only durable copy of session discourse.
        logAction(
            { actionType: 'click', elementId: 'session-chat-send' },
            { chat_message: trimmed }
        );

        return true;
    }, [socketRef]);

    const setPanelOpen = useCallback((open: boolean) => {
        panelOpenRef.current = open;
        if (open) setUnreadCount(0);
    }, []);

    return { messages, unreadCount, ingest, send, setPanelOpen };
}
