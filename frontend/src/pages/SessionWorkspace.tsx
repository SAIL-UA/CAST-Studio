import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import { joinSession, getImageDataAll } from '../services/api';
import Header from '../components/Header';
import Workspace from '../components/Workspace';
import DataStories from '../components/DataStories';
import FeedbackPanel, { FeedbackCardData, InstructorNote } from '../components/FeedbackPanel';
import CompactSidebar from '../components/CompactSidebar';
import Footer from '../components/Footer';

type ParticipantInfo = {
    username: string;
    first_name: string;
    last_name: string;
    is_online?: boolean;
};

// Generate a consistent color from a string
const getAvatarColor = (str: string) => {
    const colors = ['#4d8497', '#be6d6d', '#6d8fbe', '#8fbe6d', '#be8f6d', '#6dbe8f', '#8f6dbe', '#be6d8f'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const SessionWorkspace = () => {
    const { shareToken } = useParams<{ shareToken: string }>();
    const navigate = useNavigate();
    const { userAuthenticated } = useAuth();

    const [hostId, setHostId] = useState<string | null>(null);
    const [hostName, setHostName] = useState('');
    const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
    const [selectedPattern, setSelectedPattern] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [dataStoriesExpanded, setDataStoriesExpanded] = useState(false);
    const [feedbackExpanded, setFeedbackExpanded] = useState(false);
    const [feedbackItems] = useState<FeedbackCardData[]>([]);
    const [instructorNotes, setInstructorNotes] = useState<InstructorNote[]>([]);

    useEffect(() => {
        if (!userAuthenticated) {
            navigate('/login');
        }
    }, [userAuthenticated, navigate]);

    useEffect(() => {
        if (!shareToken || !userAuthenticated) return;

        const poll = async (isInitial: boolean) => {
            if (isInitial) setLoading(true);
            try {
                const data = await joinSession(shareToken);
                setHostId(data.host_id);
                setHostName(data.host_name);
                setParticipants(data.participants || []);
                if (!data.is_active) {
                    setError('This session has ended.');
                }
            } catch (err: any) {
                if (isInitial) {
                    const msg = err?.response?.data?.error;
                    if (msg) {
                        setError(msg);
                    } else if (err?.response?.status === 404) {
                        setError('Session not found.');
                    } else {
                        setError('An error occurred while joining the session.');
                    }
                }
            } finally {
                if (isInitial) setLoading(false);
            }
        };

        // Initial join
        poll(true);

        // Poll every 10 seconds to update participants and last_seen
        const interval = setInterval(() => poll(false), 10000);
        return () => clearInterval(interval);
    }, [shareToken, userAuthenticated]);

    // Fetch instructor notes for the host's workspace
    useEffect(() => {
        if (!hostId) return;
        const fetchNotes = async () => {
            try {
                const response = await getImageDataAll(hostId);
                const images = response.data?.images || [];
                setInstructorNotes(
                    images
                        .filter((img: any) => img.source === 'instructor')
                        .map((img: any) => ({ id: img.id, short_desc: img.short_desc, long_desc: img.long_desc, last_saved: img.last_saved }))
                );
            } catch (err) {
                console.error('Error fetching instructor notes:', err);
            }
        };
        fetchNotes();
    }, [hostId, refreshTrigger]);

    // WebSocket connection for real-time updates
    const wsRef = useRef<WebSocket | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!shareToken || !hostId) return;

        const accessToken = localStorage.getItem('access');
        if (!accessToken) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/session/${shareToken}/?access_token=${accessToken}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[WS] Connected to session');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[WS] Message:', data);

                if (data.type === 'participant_joined') {
                    console.log(`[WS] ${data.username} joined the session`);
                } else if (data.type === 'participant_left') {
                    console.log(`[WS] ${data.username} left the session`);
                } else if (data.type === 'workspace_update') {
                    // Debounce: wait 500ms after the last update before refreshing
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                        console.log('[WS] Refreshing workspace data');
                        setRefreshTrigger(prev => prev + 1);
                    }, 500);
                }
            } catch (err) {
                console.error('[WS] Error parsing message:', err);
            }
        };

        ws.onclose = (event) => {
            console.log('[WS] Disconnected:', event.code, event.reason);
        };

        ws.onerror = (event) => {
            console.error('[WS] Error:', event);
        };

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, [shareToken, hostId]);

    if (error) {
        return (
            <>
                <Header floating subtitle="Collaborate" />
                <div className="min-h-screen bg-grey-lighter pt-20 px-8 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                        <p className="text-sm text-grey-darkest">{error}</p>
                        <button
                            onClick={() => navigate('/home')}
                            className="mt-4 bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:brightness-95 transition duration-200"
                        >
                            Back to Workspace
                        </button>
                    </div>
                </div>
            </>
        );
    }

    if (loading || !hostId) {
        return (
            <>
                <Header floating subtitle="Collaborate" />
                <div className="min-h-screen bg-grey-lighter pt-20 px-8 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-dark"></div>
                        <p className="mt-4 text-grey-dark">Joining session...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                onMenuOpen={() => setLeftMenuOpen(prev => !prev)}
                floating
                menuOpen={leftMenuOpen}
                subtitle="Collaborate"
            />

            {/* Session info — under the pill */}
            <div className="fixed top-16 left-3 z-[498] flex items-center gap-2">
                <span className="bg-bama-crimson text-white text-xs rounded-full px-3 py-1 whitespace-nowrap shadow-sm">
                    {hostName}'s Workspace
                </span>
                {/* Participant avatars with online/offline indicators */}
                <div className="flex items-center gap-1">
                    <div className="relative" title={`${hostName} (Host)`}>
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm border-2 border-white cursor-default"
                            style={{ backgroundColor: getAvatarColor(hostName) }}
                        >
                            {hostName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    {participants.map((p) => {
                        const name = `${p.first_name} ${p.last_name}`.trim() || p.username;
                        const isOnline = p.is_online !== false;
                        return (
                            <div key={p.username} className="relative" title={`${name}${isOnline ? '' : ' (offline)'}`}>
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-default ${isOnline ? '' : 'opacity-40'}`}
                                    style={{ backgroundColor: getAvatarColor(p.username) }}
                                >
                                    {p.username.charAt(0).toUpperCase()}
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Left Panel */}
            {leftMenuOpen && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-30 z-[400]" onClick={() => setLeftMenuOpen(false)} />
                    <div className="fixed top-0 left-0 bottom-0 w-1/5 min-w-[256px] bg-grey-lighter-2 shadow-xl z-[401] overflow-y-auto">
                        <div className="flex justify-end p-2">
                            <button className="w-7 h-7 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200" onClick={() => setLeftMenuOpen(false)}>×</button>
                        </div>
                        <CompactSidebar setCenterNarrativePatternsOpen={() => setLeftMenuOpen(false)} />
                        <div id="footer" className="flex flex-col justify-start items-start mb-6">
                            <Footer />
                        </div>
                    </div>
                </>
            )}

            <div className="h-screen">
                <Workspace
                    setRightNarrativePatternsOpen={() => {}}
                    setSelectedPattern={setSelectedPattern}
                    selectedPattern={selectedPattern}
                    storyLoading={false}
                    setStoryLoading={() => {}}
                    readOnly={true}
                    targetUser={hostId}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* DataStories — bottom-anchored overlay */}
            <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 z-[300] flex flex-col bg-bama-crimson rounded-t-xl shadow-2xl transition-all duration-300 ${
                dataStoriesExpanded ? 'max-h-[75vh]' : 'max-h-[32px]'
            }`}>
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
                <div className={`flex-1 min-h-0 overflow-y-auto px-1 pb-1 ${dataStoriesExpanded ? '' : 'hidden'}`}>
                    <div className="bg-grey-lighter-2 rounded-lg px-4 pb-4">
                        <DataStories targetUser={hostId || undefined} readOnly={true} refreshTrigger={refreshTrigger} />
                    </div>
                </div>
            </div>

            {/* Feedback — right-anchored collapsible panel */}
            <div className="fixed top-1/2 -translate-y-1/2 right-0 z-[300] flex flex-row-reverse items-start transition-all duration-300">
                <button
                    className="flex items-center justify-center bg-bama-crimson text-xs text-white hover:brightness-110 rounded-l-xl transition-colors duration-150 flex-shrink-0 px-1.5 py-3"
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
                <div
                    className={`rounded-l-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                        feedbackExpanded ? 'w-[288px] opacity-100' : 'w-0 opacity-0'
                    }`}
                    style={{ height: '80vh' }}
                >
                    <div className="h-full rounded-l-xl">
                        <div className="h-full bg-grey-lighter-2 overflow-y-auto">
                            <FeedbackPanel items={feedbackItems} instructorNotes={instructorNotes} onClose={() => setFeedbackExpanded(false)} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SessionWorkspace;
