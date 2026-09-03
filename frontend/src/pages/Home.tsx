// Import dependencies
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';

// Import context
import { useAuth } from '../contexts/Auth';

// Import components
import Header from '../components/Header';
import DataStories from '../components/DataStories';
import FeedbackPanel, { type FeedbackCardData, type InstructorNote } from '../components/FeedbackPanel';
import NarrativePatterns from '../components/NarrativePatterns'
import Workspace from '../components/Workspace'
import NarrativeExamples from '../components/NarrativeExamples'
import CompactSidebar from '../components/CompactSidebar'
import Footer from '../components/Footer'
import GuestWelcomeTutorial from '../components/GuestWelcomeTutorial'

// Import utils
import { handleAuthRequired } from '../utils/utils';
import { getImageDataAll, getSessionStatus, getGroups } from '../services/api';
import ResearchQuestionsPanel, { type LinkableCard } from '../components/ResearchQuestionsPanel';
import { useResearchQuestions } from '../contexts/ResearchQuestions';
import { getAvatarColor } from '../utils/avatarUtils';
import ControlWorkspaceButton from '../components/ControlWorkspaceButton';
import { useGuestTourOpen } from '../utils/useGuestTourOpen';

// Login page component
const Home = () => {
    // Helpers
    const navigate = useNavigate();

    // Contexts
    const { userAuthenticated, username, userId } = useAuth();
    const { refreshRqLinks } = useResearchQuestions();

    // State
    const [centerNarrativePatternsOpen, setCenterNarrativePatternsOpen] = useState(false);
    const [rightNarrativePatternsOpen, setRightNarrativePatternsOpen] = useState(false);
    const [feedbackItems, setFeedbackItems] = useState<FeedbackCardData[]>([]);
    const [feedbackExpanded, setFeedbackExpanded] = useState(false);
    const [instructorNotes, setInstructorNotes] = useState<InstructorNote[]>([]);
    const [rightNarrativeExamplesOpen, setRightNarrativeExamplesOpen] = useState(false);
    const [selectedPattern, setSelectedPattern] = useState('');
    const [examplesPattern, setExamplesPattern] = useState('');
    const [storyLoading, setStoryLoading] = useState(false);

    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [dataStoriesExpanded, setDataStoriesExpanded] = useState(false);
    const [rqExpanded, setRqExpanded] = useState(false);
    const [rqCards, setRqCards] = useState<LinkableCard[]>([]);

    // Session state for host avatars
    const [sessionShareToken, setSessionShareToken] = useState<string | null>(null);
    const [sessionParticipants, setSessionParticipants] = useState<{username: string; first_name: string; last_name: string; is_online?: boolean}[]>([]);
    const [guestTutorialDismissed, setGuestTutorialDismissed] = useState(false);
    const [controlledBy, setControlledBy] = useState<string | null>(null);
    const [controlledByName, setControlledByName] = useState<string | null>(null);

    // Derived: right panel is open when narrative patterns or examples are active
    // Guest tour: on the "narrative" screen, force the right-hand
    // narrative patterns panel open. It auto-closes when the user advances
    // past screen 4 because the tour attribute clears.
    const tourNarrative = useGuestTourOpen('narrative');
    const rightPanelOpen = rightNarrativePatternsOpen || tourNarrative;

    // Check authentication
    useEffect(() => {
        handleAuthRequired(userAuthenticated, navigate);
    }, [userAuthenticated, navigate]);

    // Auto-expand DataStories when story generation starts or completes
    // Also broadcast to other viewers via WebSocket
    useEffect(() => {
        const handleExpand = () => {
            setDataStoriesExpanded(true);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'panel_open', panel: 'dataStories' }));
            }
        };
        window.addEventListener('storyGenerated', handleExpand);
        window.addEventListener('storyGenerationStarted', handleExpand);
        return () => {
            window.removeEventListener('storyGenerated', handleExpand);
            window.removeEventListener('storyGenerationStarted', handleExpand);
        };
    }, []);

    // Fetch instructor notes
    const fetchInstructorNotes = async () => {
        try {
            const response = await getImageDataAll();
            const images = response.data?.images || [];
            const notes = images
                .filter((img: any) => img.source === 'instructor')
                .map((img: any) => ({
                    id: img.id,
                    short_desc: img.short_desc,
                    long_desc: img.long_desc,
                    last_saved: img.last_saved,
                }));
            setInstructorNotes(notes);
        } catch (err) {
            console.error('Error fetching instructor notes:', err);
        }
    };

    // Build the linkable-card list for the research questions panel. Visuals and notes are
    // both ImageData (a note has no filepath); groups come from GroupData. Instructor notes
    // are feedback artifacts rather than the user's own material, so they're left out.
    const fetchRqCards = async () => {
        try {
            const [imageResponse, groups] = await Promise.all([
                getImageDataAll(),
                getGroups(),
            ]);
            const images = imageResponse.data?.images || [];
            // Match the friendly title logic that DraggableCard uses in the workspace:
            // the user's own short_desc when set, otherwise "Visual N" using the item's
            // ImageData.index (a stable DB field). Array position isn't safe — the API
            // returns rows in unstable Postgres order, so array index can drift out of
            // sync with what the workspace grid shows.
            const OLD_SHORT_DESC_PLACEHOLDER = 'Add a description for this visual.';
            const imageCards: LinkableCard[] = images
                .filter((img: any) => img.source !== 'instructor')
                .map((img: any) => ({
                    id: img.id,
                    label:
                        img.short_desc && img.short_desc !== OLD_SHORT_DESC_PLACEHOLDER
                            ? img.short_desc
                            : `Visual ${(img.index ?? 0) + 1}`,
                    kind: img.filepath ? 'visual' : 'note',
                }));
            const groupCards: LinkableCard[] = (groups || []).map((g: any) => ({
                id: g.id,
                label: g.name || 'Untitled Group',
                kind: 'group' as const,
            }));
            setRqCards([...imageCards, ...groupCards]);
        } catch (err) {
            console.error('Error fetching linkable cards:', err);
        }
    };

    // Load instructor notes on mount
    useEffect(() => {
        if (userAuthenticated) {
            fetchInstructorNotes();
        }
    }, [userAuthenticated]);

    // Populate RQ badges on the storyboard cards once the user is known.
    useEffect(() => {
        if (userAuthenticated) {
            refreshRqLinks();
        }
    }, [userAuthenticated, refreshRqLinks]);

    // Refresh the card list whenever the RQ panel opens, so newly added cards appear.
    useEffect(() => {
        if (userAuthenticated && rqExpanded) {
            fetchRqCards();
        }
    }, [userAuthenticated, rqExpanded]);

    // Keep the link checklist and badges current when cards are added or removed while the
    // panel is already open.
    useEffect(() => {
        const onCardsChanged = () => {
            if (!userAuthenticated) return;
            fetchRqCards();
            refreshRqLinks();
        };
        window.addEventListener('workspaceCardsChanged', onCardsChanged as EventListener);
        return () => window.removeEventListener('workspaceCardsChanged', onCardsChanged as EventListener);
    }, [userAuthenticated, refreshRqLinks]);

    // Refetch instructor notes when feedback panel expands
    useEffect(() => {
        if (feedbackExpanded) {
            fetchInstructorNotes();
        }
    }, [feedbackExpanded]);

    // Poll session status when host has an active session
    useEffect(() => {
        if (!sessionShareToken) {
            setSessionParticipants([]);
            setControlledBy(null);
            setControlledByName(null);
            return;
        }

        const pollStatus = async () => {
            try {
                const response = await getSessionStatus();
                if (response.status === 200 && response.data) {
                    setSessionParticipants(response.data.participants || []);
                    setControlledBy(response.data.controlled_by || null);
                    setControlledByName(response.data.controlled_by_name || null);
                }
            } catch {
                // Session may have been closed
                setSessionShareToken(null);
            }
        };

        pollStatus();
        const interval = setInterval(pollStatus, 10000);
        return () => clearInterval(interval);
    }, [sessionShareToken]);

    // Callback for CollaborateButton session changes
    const handleSessionChange = (shareToken: string | null) => {
        setSessionShareToken(shareToken);
    };

    // Host WebSocket connection for real-time updates when session is active
    const [hostRefreshTrigger, setHostRefreshTrigger] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!sessionShareToken) return;

        const accessToken = localStorage.getItem('access');
        if (!accessToken) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/session/${sessionShareToken}/?access_token=${accessToken}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'participant_joined') {
                    // Skip host's own join message — host avatar is rendered separately
                    if (data.username === username) return;
                    setSessionParticipants(prev => {
                        if (prev.some(p => p.username === data.username)) return prev;
                        return [...prev, { username: data.username, first_name: '', last_name: '', is_online: true }];
                    });
                } else if (data.type === 'participant_left') {
                    setSessionParticipants(prev => prev.filter(p => p.username !== data.username));
                } else if (data.type === 'control_changed') {
                    setControlledBy(data.controlled_by || null);
                    setControlledByName(data.controlled_by_name || null);
                } else if (data.type === 'panel_open') {
                    if (data.panel === 'dataStories') {
                        setDataStoriesExpanded(true);
                    } else if (data.panel === 'feedback' && Array.isArray(data.items) && data.items.length > 0) {
                        setFeedbackItems(data.items);
                        setFeedbackExpanded(true);
                    }
                } else if (data.type === 'workspace_update') {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                        setHostRefreshTrigger(prev => prev + 1);
                    }, 500);
                }
            } catch (err) {
                console.error('[WS Host] Error parsing message:', err);
            }
        };

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, [sessionShareToken]);

    // Feedback event handler
    // Also broadcast to other viewers via WebSocket
    useEffect(() => {
        const onShowFeedback = (e: Event) => {
            const ce = e as CustomEvent;
            const items = Array.isArray(ce.detail?.items) ? ce.detail.items : [];
            if (items.length > 0) {
                setFeedbackItems(items);
                setFeedbackExpanded(true);
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'panel_open', panel: 'feedback', items }));
                }
            }
        };
        window.addEventListener('showFeedbackPanel', onShowFeedback as EventListener);
        return () => window.removeEventListener('showFeedbackPanel', onShowFeedback as EventListener);
    }, []);

    // Visible component
    const isGuest = !!username && username.startsWith('guest-');

    return (
        <>
            {isGuest && !guestTutorialDismissed && (
                <GuestWelcomeTutorial onDismiss={() => setGuestTutorialDismissed(true)} />
            )}
            <Header onMenuOpen={() => setLeftMenuOpen(prev => !prev)} floating menuOpen={leftMenuOpen} subtitle="Workspace" onRecycleBinOpen={() => window.dispatchEvent(new CustomEvent('openRecycleBin'))} />

            {/* Session info — under the pill, visible when host has active session with participants */}
            {sessionShareToken && sessionParticipants.filter(p => p.is_online !== false).length > 0 && (
                <div className="fixed top-16 left-3 z-[350] flex items-center gap-2">
                    {controlledByName && (
                        <span className="bg-bama-crimson text-white text-xs rounded-full px-3 py-1 whitespace-nowrap shadow-sm">
                            {controlledByName} Controlling {username}'s Workspace
                        </span>
                    )}
                    {userId && (
                        <ControlWorkspaceButton
                            shareToken={sessionShareToken}
                            controlledBy={controlledBy}
                            currentUserId={userId}
                            isHost={true}
                            onControlChanged={(cb, cbn) => {
                                setControlledBy(cb);
                                setControlledByName(cbn);
                            }}
                        />
                    )}
                    <div className="flex items-center gap-1">
                        {/* Host avatar */}
                        <div className="relative" title={`${username} (Host)`}>
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm border-2 border-white cursor-default"
                                style={{ backgroundColor: getAvatarColor(username || '') }}
                            >
                                {(username || '?').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        {/* Participant avatars */}
                        {sessionParticipants.filter(p => p.is_online !== false).map((p) => {
                            const name = `${p.first_name} ${p.last_name}`.trim() || p.username;
                            return (
                                <div key={p.username} className="relative" title={name}>
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-default"
                                        style={{ backgroundColor: getAvatarColor(p.username) }}
                                    >
                                        {p.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-green-400" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div id="home-container" className="flex w-full font-roboto-light">

                {/* Middle Home — workspace takes full width, edgeless */}
                <div id="middle-home" className="flex-1 w-full flex flex-col">

                    {centerNarrativePatternsOpen ? (
                        <div id="narrative-patterns" className="min-h-[75vh] flex flex-col mt-6 px-4">
                            <NarrativePatterns
                            setSelectedPattern={setSelectedPattern}
                            setRightNarrativePatternsOpen={setRightNarrativePatternsOpen}
                            center={true}
                            setStoryLoading={setStoryLoading}
                            setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                            setExamplesPattern={setExamplesPattern} />
                        </div>
                    ) : (
                        <div className="h-screen">
                            <Workspace setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} setSelectedPattern={setSelectedPattern} selectedPattern={selectedPattern} storyLoading={storyLoading} setStoryLoading={setStoryLoading} onSessionChange={handleSessionChange} readOnly={controlledBy !== null} refreshTrigger={hostRefreshTrigger} />
                        </div>
                    )}

                    {/* DataStories — bottom-anchored overlay */}
                    <div
                        data-tour-target="story-browser"
                        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 z-[300] flex flex-col bg-bama-crimson rounded-t-xl shadow-2xl transition-all duration-300 ${
                        dataStoriesExpanded ? 'max-h-[75vh]' : 'max-h-[32px]'
                    }`}>
                        {/* Collapse/Expand toggle bar */}
                        <button
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-white hover:brightness-110 rounded-t-xl transition-colors duration-150 flex-shrink-0"
                            onClick={() => setDataStoriesExpanded(!dataStoriesExpanded)}
                        >
                            <svg
                                className={`w-3 h-3 transition-transform duration-300 ${dataStoriesExpanded ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            {dataStoriesExpanded ? 'Collapse' : 'Expand'} Story
                        </button>
                        {/* DataStories content — always mounted, hidden when collapsed */}
                        <div className={`flex-1 min-h-0 overflow-y-auto px-1 pb-1 ${dataStoriesExpanded ? '' : 'hidden'}`}>
                            <div className="bg-grey-lighter-2 rounded-lg px-4 pb-4">
                                {/* Editing is locked while a participant holds control, mirroring
                                    the Workspace above, so there is exactly one writer per story.
                                    readOnly stays false so the host can still export. */}
                                <DataStories canEdit={controlledBy === null} refreshTrigger={hostRefreshTrigger} />
                            </div>
                        </div>
                    </div>

                    {/* Research Questions — left-anchored collapsible panel, mirrors Feedback */}
                    {/* items-center (not items-start) keeps the tab centred against the 80vh panel */}
                    <div className="fixed top-1/2 -translate-y-1/2 left-0 z-[300] flex flex-row items-start transition-all duration-300">
                        {/* Toggle bar — vertical on the right edge */}
                        <button
                            id="rq-toggle"
                            log-id="research-questions-toggle"
                            className="flex items-center justify-center text-xs text-white hover:brightness-110 rounded-r-xl transition-colors duration-150 flex-shrink-0 px-1.5 py-2.5 shadow-lg"
                            onClick={() => setRqExpanded(!rqExpanded)}
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', background: '#348b95' }}
                        >
                            <svg
                                className={`w-3 h-3 mb-1.5 transition-transform duration-300 ${rqExpanded ? 'rotate-180' : 'rotate-0'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Research Questions
                        </button>
                        {/* Panel content — fixed height, scrollable */}
                        <div
                            className={`rounded-r-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                                rqExpanded ? 'w-[374px] opacity-100' : 'w-0 opacity-0'
                            }`}
                            style={{ height: '80vh' }}
                        >
                            <div className="h-full bg-grey-lighter-2 overflow-y-auto">
                                <ResearchQuestionsPanel
                                    cards={rqCards}
                                    readOnly={controlledBy !== null}
                                    onLinksChanged={() => { fetchRqCards(); refreshRqLinks(); }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Feedback — right-anchored collapsible panel */}
                    <div className="fixed top-1/2 -translate-y-1/2 right-0 z-[300] flex flex-row-reverse items-start transition-all duration-300">
                        {/* Collapse/Expand toggle bar — vertical on the left edge */}
                        <button
                            className="flex items-center justify-center bg-bama-crimson text-xs text-white hover:brightness-110 rounded-l-xl transition-colors duration-150 flex-shrink-0 px-1.5 py-3 shadow-lg"
                            onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                            <svg
                                className={`w-3 h-3 mb-1.5 transition-transform duration-300 ${feedbackExpanded ? 'rotate-0' : 'rotate-180'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            {feedbackExpanded ? 'Collapse' : 'Expand'} Feedback
                        </button>
                        {/* Feedback content — fixed height, scrollable */}
                        <div
                            className={`rounded-l-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                                feedbackExpanded ? 'w-[288px] opacity-100' : 'w-0 opacity-0'
                            }`}
                            style={{ height: '80vh' }}
                        >
                            <div className="h-full bg-grey-lighter-2 overflow-y-auto">
                                <FeedbackPanel items={feedbackItems} instructorNotes={instructorNotes} onClose={() => setFeedbackExpanded(false)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left Panel — overlay menu, only visible when hamburger is clicked */}
                {leftMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-30 z-[400]"
                            onClick={() => setLeftMenuOpen(false)}
                        />
                        <div className="fixed top-0 left-0 bottom-0 w-1/5 min-w-[320px] bg-grey-lighter-2 shadow-xl z-[401] overflow-y-auto pt-8">
                            <CompactSidebar setCenterNarrativePatternsOpen={(val: boolean) => {
                                setCenterNarrativePatternsOpen(val);
                                setLeftMenuOpen(false);
                            }} />
                            <div id="footer" className="flex flex-col justify-start items-start mb-6">
                                <Footer />
                            </div>
                        </div>
                    </>
                )}

                {/* Right Panel — overlay for narrative patterns/examples only */}
                {rightPanelOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black bg-opacity-30 z-[500]"
                            onClick={() => {
                                setRightNarrativePatternsOpen(false);
                                setRightNarrativeExamplesOpen(false);
                            }}
                        />
                        {/* Panel */}
                        <div id="right-home" className="fixed top-0 right-0 bottom-0 w-1/5 min-w-[256px] bg-grey-lighter-2 shadow-xl z-[501] overflow-y-auto">
                            {/* Close button */}
                            <div className="flex justify-end p-2">
                                <button
                                    className="w-7 h-7 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200"
                                    onClick={() => {
                                        setRightNarrativePatternsOpen(false);
                                        setRightNarrativeExamplesOpen(false);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            {/* Panel content */}
                            <div className="px-3 pb-6">
                                {rightNarrativeExamplesOpen ? (
                                    <NarrativeExamples
                                        examplesPattern={examplesPattern}
                                        setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                    />
                                ) : (
                                    <NarrativePatterns
                                        center={false}
                                        setSelectedPattern={setSelectedPattern}
                                        setRightNarrativePatternsOpen={setRightNarrativePatternsOpen}
                                        setStoryLoading={setStoryLoading}
                                        setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                        setExamplesPattern={setExamplesPattern}
                                    />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

// Export the Login component
export default Home;
