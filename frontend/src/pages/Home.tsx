// Import dependencies
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Import context
import { useAuth } from '../contexts/Auth';

// Import components
import Header from '../components/Header';
import DataStories from '../components/DataStories';
import FeedbackPanel, { FeedbackCardData } from '../components/FeedbackPanel';
import NarrativePatterns from '../components/NarrativePatterns'
import Workspace from '../components/Workspace'
import NarrativeExamples from '../components/NarrativeExamples'
import CompactSidebar from '../components/CompactSidebar'
import Footer from '../components/Footer'

// Import utils
import { handleAuthRequired } from '../utils/utils';

// Login page component
const Home = () => {
    // Helpers
    const navigate = useNavigate();

    // Contexts
    const { userAuthenticated } = useAuth();

    // State
    const [centerNarrativePatternsOpen, setCenterNarrativePatternsOpen] = useState(false);
    const [rightNarrativePatternsOpen, setRightNarrativePatternsOpen] = useState(false);
    const [rightFeedbackOpen, setRightFeedbackOpen] = useState(false);
    const [feedbackItems, setFeedbackItems] = useState<FeedbackCardData[]>([]);
    const [rightNarrativeExamplesOpen, setRightNarrativeExamplesOpen] = useState(false);
    const [selectedPattern, setSelectedPattern] = useState('');
    const [storyLoading, setStoryLoading] = useState(false);

    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [dataStoriesExpanded, setDataStoriesExpanded] = useState(false);

    // Derived: right panel is open when feedback or narrative patterns are active
    const rightPanelOpen = rightFeedbackOpen || rightNarrativePatternsOpen;

    // Check authentication
    useEffect(() => {
        handleAuthRequired(userAuthenticated, navigate);
    }, [userAuthenticated, navigate]);

    // Auto-expand DataStories when story generation starts or completes
    useEffect(() => {
        const handleExpand = () => setDataStoriesExpanded(true);
        window.addEventListener('storyGenerated', handleExpand);
        window.addEventListener('storyGenerationStarted', handleExpand);
        return () => {
            window.removeEventListener('storyGenerated', handleExpand);
            window.removeEventListener('storyGenerationStarted', handleExpand);
        };
    }, []);

    // Feedback event handler
    useEffect(() => {
        const onShowFeedback = (e: Event) => {
            const ce = e as CustomEvent;
            const items = Array.isArray(ce.detail?.items) ? ce.detail.items : [];
            if (items.length > 0) {
                setFeedbackItems(items);
                setRightFeedbackOpen(true);
                setRightNarrativePatternsOpen(false);
            }
        };
        window.addEventListener('showFeedbackPanel', onShowFeedback as EventListener);
        return () => window.removeEventListener('showFeedbackPanel', onShowFeedback as EventListener);
    }, []);

    // Visible component
    return (
        <>
            <Header onMenuOpen={() => setLeftMenuOpen(prev => !prev)} floating menuOpen={leftMenuOpen} subtitle="Workspace" onRecycleBinOpen={() => window.dispatchEvent(new CustomEvent('openRecycleBin'))} />
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
                            setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} />
                        </div>
                    ) : (
                        <div className="h-screen">
                            <Workspace setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} setSelectedPattern={setSelectedPattern} selectedPattern={selectedPattern} storyLoading={storyLoading} setStoryLoading={setStoryLoading} />
                        </div>
                    )}

                    {/* DataStories — bottom-anchored overlay */}
                    <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 z-[300] flex flex-col bg-bama-crimson rounded-t-xl shadow-2xl transition-all duration-300 ${
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
                                <DataStories />
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
                        <div className="fixed top-0 left-0 bottom-0 w-1/5 min-w-[256px] bg-grey-lighter-2 shadow-xl z-[401] overflow-y-auto">
                            <div className="flex justify-end p-2">
                                <button
                                    className="w-7 h-7 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200"
                                    onClick={() => setLeftMenuOpen(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <CompactSidebar setCenterNarrativePatternsOpen={(val: boolean) => {
                                setCenterNarrativePatternsOpen(val);
                                setLeftMenuOpen(false);
                            }} />
                            <div id="footer" className="flex flex-col justify-start items-start">
                                <Footer />
                            </div>
                        </div>
                    </>
                )}

                {/* Right Panel — overlay on top of workspace, only visible when needed */}
                {rightPanelOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black bg-opacity-30 z-[500]"
                            onClick={() => {
                                setRightFeedbackOpen(false);
                                setRightNarrativePatternsOpen(false);
                                setRightNarrativeExamplesOpen(false);
                            }}
                        />
                        {/* Panel */}
                        <div id="right-home" className="fixed top-0 right-0 bottom-0 w-[320px] max-w-[90vw] bg-grey-lighter-2 shadow-xl z-[501] overflow-y-auto">
                            {/* Close button */}
                            <div className="flex justify-end p-2">
                                <button
                                    className="w-7 h-7 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200"
                                    onClick={() => {
                                        setRightFeedbackOpen(false);
                                        setRightNarrativePatternsOpen(false);
                                        setRightNarrativeExamplesOpen(false);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            {/* Panel content */}
                            <div className="px-3 pb-6">
                                {rightFeedbackOpen ? (
                                    <FeedbackPanel items={feedbackItems} onClose={() => setRightFeedbackOpen(false)} />
                                ) : rightNarrativeExamplesOpen ? (
                                    <NarrativeExamples
                                        selectedPattern={selectedPattern}
                                        setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                    />
                                ) : (
                                    <NarrativePatterns
                                        center={false}
                                        setSelectedPattern={setSelectedPattern}
                                        setRightNarrativePatternsOpen={setRightNarrativePatternsOpen}
                                        setStoryLoading={setStoryLoading}
                                        setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
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