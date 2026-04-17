import { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { hostSession, closeSession, getSessionStatus } from '../services/api';
import { logAction } from '../utils/userActionLogger';
import { useNavigate } from 'react-router-dom';

const CollaborateButton = () => {
    const navigate = useNavigate();
    const [shareToken, setShareToken] = useState<string | null>(null);
    const [participantCount, setParticipantCount] = useState(0);
    const [maxParticipants, setMaxParticipants] = useState(3);
    const [joinLink, setJoinLink] = useState('');
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [alertModal, setAlertModal] = useState<string | null>(null);

    // Check for existing session on mount
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await getSessionStatus();
                if (response.status === 200 && response.data) {
                    setShareToken(response.data.share_token);
                    setParticipantCount(response.data.participant_count);
                    setMaxParticipants(response.data.max_participants);
                }
            } catch (err) {
                // No active session — that's fine
            }
        };
        checkStatus();
    }, []);

    const handleStartSession = async (e: React.MouseEvent) => {
        logAction(e, { action: 'start_session' });
        try {
            const data = await hostSession();
            setShareToken(data.share_token);
            setParticipantCount(data.participant_count);
            setMaxParticipants(data.max_participants);
        } catch (err) {
            console.error('Error starting session:', err);
            setAlertModal('An error occurred while starting the session.');
        }
    };

    const handleCloseSession = async () => {
        try {
            await closeSession();
            setShareToken(null);
            setParticipantCount(0);
            setShowConfirmClose(false);
        } catch (err) {
            console.error('Error closing session:', err);
            setAlertModal('An error occurred while closing the session.');
        }
    };

    const handleCopyLink = () => {
        if (shareToken) {
            const link = `${window.location.origin}/session/${shareToken}`;
            navigator.clipboard.writeText(link);
        }
    };

    const handleJoinSession = () => {
        if (!joinLink.trim()) return;

        // Extract share token from URL or use as-is
        let token = joinLink.trim();
        try {
            const url = new URL(token);
            const parts = url.pathname.split('/');
            const sessionIndex = parts.indexOf('session');
            if (sessionIndex !== -1 && parts[sessionIndex + 1]) {
                token = parts[sessionIndex + 1];
            }
        } catch {
            // Not a URL — use as raw token
        }

        navigate(`/session/${token}`);
    };

    return (
        <>
            <DropdownMenu.Root onOpenChange={(open) => {
                if (open && shareToken) {
                    // Refresh session status when dropdown opens
                    getSessionStatus().then((response) => {
                        if (response.status === 200 && response.data) {
                            setParticipantCount(response.data.online_count ?? response.data.participant_count);
                            setMaxParticipants(response.data.max_participants);
                        }
                    }).catch(() => {});
                }
            }}>
                <DropdownMenu.Trigger asChild>
                    <button
                        id="collaborate-button"
                        className="bg-bama-crimson text-sm text-white rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                    >
                        <span className="flex items-center justify-center gap-2">
                            Collaborate
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                            </svg>
                        </span>
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="mt-1 shadow-lg z-[400] bg-white rounded-lg py-2 w-[300px]"
                        sideOffset={4}
                        align="start"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                        {/* Host Session Section */}
                        <div className="px-3 pb-2">
                            <DropdownMenu.Label className="text-xs text-gray-400 font-medium mb-1">
                                Host Session
                            </DropdownMenu.Label>

                            {shareToken ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${window.location.origin}/session/${shareToken}`}
                                            className="flex-1 text-xs px-2 py-1 border border-grey-lightest rounded bg-grey-lighter truncate"
                                        />
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyLink(); }}
                                            className="text-xs bg-bama-crimson text-white rounded px-2 py-1 hover:brightness-95 transition"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {participantCount} of {maxParticipants} participants joined
                                    </div>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirmClose(true); }}
                                        className="text-xs bg-red-600 text-white rounded-full px-3 py-1 hover:brightness-95 transition"
                                    >
                                        Close Session
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartSession(e); }}
                                    className="text-xs bg-bama-crimson text-white rounded-full px-3 py-1 hover:brightness-95 transition"
                                >
                                    Start Session
                                </button>
                            )}
                        </div>

                        <DropdownMenu.Separator className="h-px bg-grey-lightest my-1" />

                        {/* Join Session Section */}
                        <div className="px-3 pt-1">
                            <DropdownMenu.Label className="text-xs text-gray-400 font-medium mb-1">
                                Join Session
                            </DropdownMenu.Label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    placeholder="Paste session link"
                                    value={joinLink}
                                    onChange={(e) => setJoinLink(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleJoinSession(); } }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 text-xs px-2 py-1 border border-grey-lightest rounded"
                                />
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleJoinSession(); }}
                                    className="text-xs bg-bama-crimson text-white rounded px-2 py-1 hover:brightness-95 transition"
                                >
                                    Go
                                </button>
                            </div>
                        </div>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Confirm Close Modal */}
            {showConfirmClose && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
                        <div className="text-sm text-grey-darkest mb-4">
                            This will close the session. Continue?
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConfirmClose(false)}
                                className="text-sm px-4 py-1.5 rounded border hover:bg-grey-lighter transition"
                            >
                                No
                            </button>
                            <button
                                onClick={handleCloseSession}
                                className="text-sm bg-red-600 text-white rounded px-4 py-1.5 hover:brightness-95 transition"
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            {alertModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                        <div className="text-sm text-grey-darkest">{alertModal}</div>
                        <div className="mt-6 text-right">
                            <button
                                onClick={() => setAlertModal(null)}
                                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-150"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CollaborateButton;
