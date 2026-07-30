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

/** Identifies which session a logged message belongs to, so conversations can be grouped. */
export type ChatSessionContext = {
    /** Session share token — the grouping key for a conversation. */
    shareToken: string | null;
    /** Workspace owner, i.e. whose project is being discussed. */
    hostId: string | null;
};

/** Chat is deliberately ephemeral; cap the transcript so a long session can't grow unbounded. */
const MAX_MESSAGES = 200;

/** Safety valve on the unmatched-send buffer; see pendingSendsRef below. */
const MAX_PENDING_SENDS = 50;

/**
 * Session chat over the WebSocket the page already owns.
 *
 * Messages are relayed by SessionConsumer and never stored server-side, so the transcript
 * lives only in this component's state — it is gone on reload, by design. The durable record
 * is the action log: each message the local user sends is written to user_actions once the
 * server echoes it back.
 *
 * Logging on the echo rather than at send time is deliberate. The echo carries the server's
 * message_id and sent_at, which give every participant's copy of a conversation the same
 * identifiers and the same ordering — the log row's own timestamp only records when the log
 * POST happened to arrive, which can reorder messages from different senders. It also means
 * the log reflects messages actually relayed rather than merely attempted.
 *
 * `ingest` is intentionally stable across renders: the pages register their socket handler
 * inside an effect keyed on the share token, so a changing callback identity would either
 * be captured stale or force the socket to reconnect. It reads mutable inputs via refs.
 */
export function useSessionChat(
    socketRef: React.MutableRefObject<WebSocket | null>,
    selfUsername: string | null,
    sessionContext?: ChatSessionContext
) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const selfUsernameRef = useRef(selfUsername);
    useEffect(() => {
        selfUsernameRef.current = selfUsername;
    }, [selfUsername]);

    const sessionContextRef = useRef<ChatSessionContext | undefined>(sessionContext);
    useEffect(() => {
        sessionContextRef.current = sessionContext;
    }, [sessionContext]);

    // Whether the panel is currently visible, so we only count unread while it's closed.
    const panelOpenRef = useRef(false);

    /**
     * Bodies this tab has sent but not yet seen echoed back.
     *
     * Every tab logged into the same account treats an echo as its own, so logging purely on
     * `isOwn` would write one row per open tab. Matching against what this tab actually sent
     * keeps it to exactly one row per message.
     */
    const pendingSendsRef = useRef<string[]>([]);

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

        if (!isOwn) {
            if (!panelOpenRef.current) {
                setUnreadCount(count => count + 1);
            }
            return true;
        }

        // Own message: log it, but only if this tab is the one that sent it.
        const pendingIndex = pendingSendsRef.current.indexOf(message.body);
        if (pendingIndex !== -1) {
            pendingSendsRef.current.splice(pendingIndex, 1);

            const ctx = sessionContextRef.current;
            logAction(
                { actionType: 'click', elementId: 'session-chat-send' },
                {
                    chat_message: message.body,
                    // Grouping keys for conversation-level analysis.
                    session_token: ctx?.shareToken ?? null,
                    host_id: ctx?.hostId ?? null,
                    // Server-assigned, so every participant's view agrees on identity/order.
                    message_id: message.id,
                    sent_at: message.sentAt,
                }
            );
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

        // Logging happens when this comes back from the server. Bound the buffer so echoes
        // that never arrive (dropped connection) can't accumulate.
        pendingSendsRef.current.push(trimmed);
        if (pendingSendsRef.current.length > MAX_PENDING_SENDS) {
            pendingSendsRef.current.shift();
        }

        return true;
    }, [socketRef]);

    const setPanelOpen = useCallback((open: boolean) => {
        panelOpenRef.current = open;
        if (open) setUnreadCount(0);
    }, []);

    return { messages, unreadCount, ingest, send, setPanelOpen };
}
