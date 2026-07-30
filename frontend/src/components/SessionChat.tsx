import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { logAction } from '../utils/userActionLogger';
import type { ChatMessage } from '../hooks/useSessionChat';

type SessionChatProps = {
    messages: ChatMessage[];
    unreadCount: number;
    /** Returns false when the socket isn't open, so we can tell the user instead of dropping text. */
    onSend: (body: string) => boolean;
    /** Lets the hook stop counting unread while the panel is open. */
    onOpenChange: (open: boolean) => void;
};

const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/**
 * Right-edge collapsible chat, stacked directly beneath the Feedback tab.
 *
 * Deliberately mirrors the feedback panel: same vertical tab, same rounded-l-xl edge, same
 * 288px drawer. It sits on the right rather than bottom-left because the recycle bin's
 * DeleteAll/ClearAll buttons occupy `absolute bottom-6 left-4` (Recycle.tsx) at z-[350].
 *
 * The feedback panel is centred at top-1/2 with an 80vh body, so its container spans
 * 10vh–90vh and its tab sits at the top of that range. Offsetting from 10vh by roughly one
 * tab-height puts this tab immediately below it.
 */
const TAB_TOP = 'calc(10vh + 10.5rem)';

const SessionChat = ({ messages, unreadCount, onSend, onOpenChange }: SessionChatProps) => {
    const [expanded, setExpanded] = useState(false);
    const [draft, setDraft] = useState('');
    const [sendError, setSendError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        onOpenChange(expanded);
    }, [expanded, onOpenChange]);

    // Pin to the newest message. useLayoutEffect so the jump happens before paint.
    useLayoutEffect(() => {
        if (!expanded) return;
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, expanded]);

    const handleSend = () => {
        const body = draft.trim();
        if (!body) return;

        if (onSend(body)) {
            setDraft('');
            setSendError(null);
        } else {
            setSendError('Not connected — message not sent.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends; Shift+Enter makes a new line.
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleToggle = (e: React.MouseEvent) => {
        logAction(e);
        setExpanded(prev => !prev);
    };

    return (
        <div
            id="session-chat"
            className="fixed right-0 z-[300] flex flex-row-reverse items-start transition-all duration-300 pointer-events-none"
            style={{ top: TAB_TOP }}
        >
            {/* Vertical tab, matching the Feedback tab above it.
                pointer-events are re-enabled per child: these right-edge overlays keep a tall
                box even when collapsed, and an inert container would otherwise swallow clicks
                meant for whatever sits beneath it. */}
            <button
                id="session-chat-toggle"
                log-id="session-chat-toggle"
                className="pointer-events-auto relative flex items-center justify-center bg-bama-crimson text-xs text-white hover:brightness-110 rounded-l-xl transition-colors duration-150 flex-shrink-0 px-1.5 py-3 shadow-lg"
                onClick={handleToggle}
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
                <svg
                    className={`w-3 h-3 mb-1.5 transition-transform duration-300 ${expanded ? 'rotate-0' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Chat
                {!expanded && unreadCount > 0 && (
                    // Horizontal writing mode so the number isn't rotated with the tab.
                    <span
                        className="absolute -left-1 top-1 bg-white text-bama-crimson rounded-full px-1 text-[10px] font-semibold leading-tight shadow"
                        style={{ writingMode: 'horizontal-tb' }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Drawer — same width and slide behaviour as the feedback panel */}
            <div
                className={`pointer-events-auto rounded-l-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                    expanded ? 'w-[288px] opacity-100' : 'w-0 opacity-0'
                }`}
                style={{ height: '55vh' }}
            >
                <div className="h-full bg-grey-lighter-2 flex flex-col">
                    <div
                        ref={scrollRef}
                        id="session-chat-messages"
                        log-id="session-chat-messages"
                        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2"
                    >
                        {messages.length === 0 ? (
                            <p className="text-xs text-grey-dark text-center py-4">
                                No messages yet. Chat is visible to everyone in this session and is not
                                saved after you leave.
                            </p>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-semibold text-grey-darkest">
                                            {msg.isOwn ? 'You' : msg.senderName}
                                        </span>
                                        <span className="text-[10px] text-grey-dark">{formatTime(msg.sentAt)}</span>
                                    </div>
                                    <div
                                        className={`text-sm rounded-lg px-2.5 py-1.5 max-w-[90%] whitespace-pre-wrap break-words ${
                                            msg.isOwn
                                                ? 'bg-bama-crimson text-white'
                                                : 'bg-white text-grey-darkest border border-grey-light'
                                        }`}
                                    >
                                        {msg.body}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {sendError && (
                        <p className="px-3 pb-1 text-[11px] text-bama-crimson">{sendError}</p>
                    )}

                    <div className="flex items-end gap-1.5 border-t border-grey-light p-2">
                        <textarea
                            id="session-chat-input"
                            log-id="session-chat-input"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            maxLength={2000}
                            placeholder="Message the session..."
                            aria-label="Chat message"
                            className="flex-1 resize-none text-sm rounded border border-grey-light px-2 py-1.5 max-h-24 outline-none focus:border-bama-crimson"
                        />
                        <button
                            id="session-chat-send"
                            log-id="session-chat-send-button"
                            onClick={handleSend}
                            disabled={!draft.trim()}
                            className="flex items-center bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1.5 hover:brightness-95 transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionChat;
