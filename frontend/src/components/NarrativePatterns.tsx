// Import dependencies
import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';

// Import components
import SelectNarrativeButton from './SelectNarrativeButton';
import NarrativeExamplesButton from './NarrativeExamplesButton';
import { logAction } from '../utils/userActionLogger';
import { useGuestTourOpen } from '../utils/useGuestTourOpen';

// Content SVG icons
const C = '#005c84';
const svgBase = { width: 48, height: 48, viewBox: '0 0 48 48', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };

const CauseEffectIcon = () => (
    <svg {...svgBase}>
        <circle cx="14" cy="24" r="8" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1.5" />
        <circle cx="38" cy="24" r="6" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1.5" />
        <path d="M22 24h10" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M29 21l3 3-3 3" stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const QuestionAnswerIcon = () => (
    <svg {...svgBase}>
        <circle cx="24" cy="24" r="14" fill={C} fillOpacity="0.1" stroke={C} strokeWidth="1.5" />
        <text x="24" y="30" textAnchor="middle" fontSize="20" fontWeight="600" fill={C} fontFamily="sans-serif">?</text>
    </svg>
);

const TimelineIcon = () => (
    <svg {...svgBase}>
        <path d="M6 24h36" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="24" r="3" fill={C} fillOpacity="0.3" stroke={C} strokeWidth="1" />
        <circle cx="24" cy="24" r="3" fill={C} fillOpacity="0.3" stroke={C} strokeWidth="1" />
        <circle cx="36" cy="24" r="3" fill={C} fillOpacity="0.3" stroke={C} strokeWidth="1" />
        <path d="M12 18v3" stroke={C} strokeWidth="1" strokeLinecap="round" />
        <path d="M24 18v3" stroke={C} strokeWidth="1" strokeLinecap="round" />
        <path d="M36 18v3" stroke={C} strokeWidth="1" strokeLinecap="round" />
    </svg>
);

const FactorAnalysisIcon = () => (
    <svg {...svgBase}>
        <circle cx="24" cy="36" r="5" fill={C} fillOpacity="0.2" stroke={C} strokeWidth="1.5" />
        <circle cx="10" cy="14" r="4" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1" />
        <circle cx="24" cy="10" r="4" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1" />
        <circle cx="38" cy="14" r="4" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1" />
        <path d="M13 17l8 14" stroke={C} strokeWidth="1" strokeLinecap="round" />
        <path d="M24 14v17" stroke={C} strokeWidth="1" strokeLinecap="round" />
        <path d="M35 17l-8 14" stroke={C} strokeWidth="1" strokeLinecap="round" />
    </svg>
);

const OverviewDetailIcon = () => (
    <svg {...svgBase}>
        <circle cx="20" cy="22" r="10" fill={C} fillOpacity="0.1" stroke={C} strokeWidth="1.5" />
        <path d="M27 29l8 8" stroke={C} strokeWidth="2" strokeLinecap="round" />
        <path d="M16 22h8" stroke={C} strokeWidth="1" strokeLinecap="round" />
        <path d="M20 18v8" stroke={C} strokeWidth="1" strokeLinecap="round" />
    </svg>
);

const ProblemSolutionIcon = () => (
    <svg {...svgBase}>
        <path d="M24 6a10 10 0 0 0-6 18c1 .7 1.5 1.5 1.5 2.5V30h9v-3.5c0-1 .5-1.8 1.5-2.5A10 10 0 0 0 24 6z" fill={C} fillOpacity="0.12" stroke={C} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M20 34h8" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M21 38h6" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M24 14v8" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const ComparativeIcon = () => (
    <svg {...svgBase}>
        <rect x="4" y="10" width="17" height="28" rx="3" fill={C} fillOpacity="0.1" stroke={C} strokeWidth="1.5" />
        <rect x="27" y="10" width="17" height="28" rx="3" fill={C} fillOpacity="0.1" stroke={C} strokeWidth="1.5" />
        <path d="M24 14v20" stroke={C} strokeWidth="1" strokeDasharray="2 2" />
    </svg>
);

const WorkflowIcon = () => (
    <svg {...svgBase}>
        <rect x="4" y="18" width="10" height="12" rx="2" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1.5" />
        <rect x="19" y="18" width="10" height="12" rx="2" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1.5" />
        <rect x="34" y="18" width="10" height="12" rx="2" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1.5" />
        <path d="M14 24h5" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M29 24h5" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17 22l2 2-2 2" stroke={C} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 22l2 2-2 2" stroke={C} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ShockLeadIcon = () => (
    <svg {...svgBase}>
        <path d="M28 4L16 24h10L18 44l16-24H24L28 4z" fill={C} fillOpacity="0.15" stroke={C} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
);

// Flow SVG icons
const LinearIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="24" r="5" fill="#005c84" fillOpacity="0.2" stroke="#005c84" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="5" fill="#005c84" fillOpacity="0.2" stroke="#005c84" strokeWidth="1.5" />
        <circle cx="40" cy="24" r="5" fill="#005c84" fillOpacity="0.2" stroke="#005c84" strokeWidth="1.5" />
        <path d="M13 24h6" stroke="#005c84" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M29 24h6" stroke="#005c84" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17 22l2 2-2 2" stroke="#005c84" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M33 22l2 2-2 2" stroke="#005c84" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CircularIcon = () => (
    <svg {...svgBase}>
        <circle cx="24" cy="24" r="14" fill={C} fillOpacity="0.1" stroke={C} strokeWidth="1.5" />
        <path d="M24 10a14 14 0 0 1 0 28" stroke={C} strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
        <path d="M30 12l-2-4h4" fill={C} stroke={C} strokeWidth="1" strokeLinejoin="round" />
        <path d="M18 36l2 4h-4" fill={C} stroke={C} strokeWidth="1" strokeLinejoin="round" />
    </svg>
);

const NestedIcon = () => (
    <svg {...svgBase}>
        <rect x="6" y="6" width="36" height="36" rx="4" fill={C} fillOpacity="0.06" stroke={C} strokeWidth="1.5" />
        <rect x="12" y="12" width="24" height="24" rx="3" fill={C} fillOpacity="0.1" stroke={C} strokeWidth="1.2" />
        <rect x="18" y="18" width="12" height="12" rx="2" fill={C} fillOpacity="0.18" stroke={C} strokeWidth="1" />
    </svg>
);

const InvertedPyramidIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 10h36L24 42 6 10z" fill="#005c84" fillOpacity="0.15" stroke="#005c84" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 16h28" stroke="#005c84" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M14 22h20" stroke="#005c84" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M18 28h12" stroke="#005c84" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
);

// Define props interface
type NarrativePatternsProps = {
    center: boolean;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setRightNarrativeExamplesOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setExamplesPattern: React.Dispatch<React.SetStateAction<string>>;
    onCreateScaffold?: (pattern: string) => void;
}

// Narrative patterns component
const NarrativePatterns = ({ setSelectedPattern, center, setStoryLoading, setRightNarrativeExamplesOpen, setExamplesPattern, onCreateScaffold }: NarrativePatternsProps) => {

    // Reusable hover handler that captures pattern from data attribute
    const handleHover = (e: React.MouseEvent<HTMLDivElement>) => {
        const pattern = e.currentTarget.getAttribute('data-pattern');
        logAction(e, { narrative_pattern: pattern });
    };

    const tabTriggerClass = "px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 outline-none cursor-pointer data-[state=active]:bg-bama-crimson data-[state=active]:text-white text-grey-darker hover:text-grey-darkest";

    // Guest tour: force the "flow" tab when on the narrative screen; user has
    // full control otherwise.
    const tourNarrative = useGuestTourOpen('narrative');
    const [userTab, setUserTab] = useState<string>('content');
    const activeTab = tourNarrative ? 'flow' : userTab;

    return (
        <div id="narrative-patterns" className="p-0 m-0">
            <div className="flex flex-row w-full mb-4">
                <p className={`${center ? 'text-2xl mt-2' : 'text-sm text-gray-500 font-regular ml-4'}`}>Narrative Structures</p>
            </div>

            <Tabs.Root value={activeTab} onValueChange={setUserTab}>
                <Tabs.List className="flex gap-1 bg-grey-lighter rounded-full p-1 mb-4 ml-4 mr-4 w-fit">
                    <Tabs.Trigger value="content" className={tabTriggerClass}>Content</Tabs.Trigger>
                    <Tabs.Trigger value="flow" className={tabTriggerClass}>Flow</Tabs.Trigger>
                </Tabs.List>

                {/* ── Content tab (existing 9 patterns) ────────────── */}
                <Tabs.Content value="content">
                    <div className={`grid grid-cols-1 ${center ? 'min-lg:grid-cols-2' : ''} auto-rows-min gap-2 grid-rows-5 items-center`}>

                        {/* Grid item 1 - Cause and Effect */}
                        <div log-id="narrative-pattern-card" data-pattern="cause_and_effect" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <CauseEffectIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Cause and Effect</h3>
                                <p className="text-xs">How a variable or event influences another.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="cause_and_effect" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="cause_and_effect" />}
                            </div>
                        </div>

                        {/* Grid item 2 - Question and Answer */}
                        <div log-id="narrative-pattern-card" data-pattern="question_answer" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <QuestionAnswerIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Question and Answer</h3>
                                <p className="text-xs">A central question, followed by evidence to support the answer.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} setStoryLoading={setStoryLoading} value="question_answer" />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="question_answer" />}
                            </div>
                        </div>

                        {/* Grid item 3 - Timeline */}
                        <div log-id="narrative-pattern-card" data-pattern="time_based" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <TimelineIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Timeline</h3>
                                <p className="text-xs">A sequence of events in time to highlight patterns and trends.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="time_based" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="time_based" />}
                            </div>
                        </div>

                        {/* Grid item 4 - Factor Analysis */}
                        <div log-id="narrative-pattern-card" data-pattern="factor_analysis" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <FactorAnalysisIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Factor Analysis</h3>
                                <p className="text-xs">A breakdown of a phenomenon into influencing factors.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="factor_analysis" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="factor_analysis" />}
                            </div>
                        </div>

                        {/* Grid item 5 - Overview To Detail */}
                        <div log-id="narrative-pattern-card" data-pattern="overview_to_detail" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <OverviewDetailIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Overview To Detail</h3>
                                <p className="text-xs">A broad snapshot of a phenomenon, followed by finer details.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="overview_to_detail" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="overview_to_detail" />}
                            </div>
                        </div>

                        {/* Grid item 6 - Problem and Solution */}
                        <div log-id="narrative-pattern-card" data-pattern="problem_solution" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <ProblemSolutionIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Problem and Solution</h3>
                                <p className="text-xs">A challenge, followed by evidence for a solution.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="problem_solution" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="problem_solution" />}
                            </div>
                        </div>

                        {/* Grid item 7 - Comparative Analysis */}
                        <div log-id="narrative-pattern-card" data-pattern="comparative" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <ComparativeIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Comparative Analysis</h3>
                                <p className="text-xs">A side-by-side view of events to reveal similarities and differences.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="comparative" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="comparative" />}
                            </div>
                        </div>

                        {/* Grid item 8 - Workflow or Process */}
                        <div log-id="narrative-pattern-card" data-pattern="workflow_process" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <WorkflowIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Workflow or Process</h3>
                                <p className="text-xs">Discusses the key stages of a system or pipeline.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="workflow_process" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="workflow_process" />}
                            </div>
                        </div>

                        {/* Grid item 9 - Shock and Lead */}
                        <div log-id="narrative-pattern-card" data-pattern="shock_lead" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <ShockLeadIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Shock and Lead</h3>
                                <p className="text-xs">A striking fact, followed by analysis of explanatory factors.</p>
                                {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="shock_lead" setStoryLoading={setStoryLoading} />
                                {!center && <NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="shock_lead" />}
                            </div>
                        </div>

                    </div>
                </Tabs.Content>

                {/* ── Flow tab ──────────────────────────────────────── */}
                <Tabs.Content value="flow">
                    <div className="grid grid-cols-1 auto-rows-min gap-2 items-center">

                        {/* Linear — enabled */}
                        <div log-id="narrative-pattern-card" data-pattern="linear" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <LinearIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Linear</h3>
                                <p className="text-xs">A straightforward beginning-to-end progression that builds understanding step by step.</p>
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="linear" setStoryLoading={setStoryLoading} />
                                {!center && <span className="opacity-40 pointer-events-none inline-block"><NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="linear" /></span>}
                            </div>
                        </div>

                        {/* Inverted Pyramid — enabled */}
                        <div log-id="narrative-pattern-card" data-pattern="inverted_pyramid" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <InvertedPyramidIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Inverted Pyramid</h3>
                                <p className="text-xs">Lead with the most important finding, then layer in supporting details and context.</p>
                                <SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="inverted_pyramid" setStoryLoading={setStoryLoading} />
                                {!center && <span className="opacity-40 pointer-events-none inline-block"><NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="inverted_pyramid" /></span>}
                            </div>
                        </div>

                        {/* Circular — disabled */}
                        <div log-id="narrative-pattern-card" data-pattern="circular" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <CircularIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Circular</h3>
                                <p className="text-xs">The story returns to where it started, creating a loop that reinforces the central message.</p>
                                <span className="opacity-40 pointer-events-none inline-block"><SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="circular" setStoryLoading={setStoryLoading} /></span>
                                {!center && <span className="opacity-40 pointer-events-none inline-block"><NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="circular" /></span>}
                            </div>
                        </div>

                        {/* Nested — disabled */}
                        <div log-id="narrative-pattern-card" data-pattern="nested" className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light' onMouseEnter={handleHover}>
                            <div className="w-1/4 flex items-center justify-center pr-1">
                                <NestedIcon />
                            </div>
                            <div className="w-3/4 h-auto pl-4">
                                <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-sm'}`}>Nested</h3>
                                <p className="text-xs">A story within a story, zooming in and out of detail to build layered understanding.</p>
                                <span className="opacity-40 pointer-events-none inline-block"><SelectNarrativeButton setSelectedPattern={setSelectedPattern} onCreateScaffold={onCreateScaffold} value="nested" setStoryLoading={setStoryLoading} /></span>
                                {!center && <span className="opacity-40 pointer-events-none inline-block"><NarrativeExamplesButton setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen} setExamplesPattern={setExamplesPattern} value="nested" /></span>}
                            </div>
                        </div>

                    </div>
                </Tabs.Content>
            </Tabs.Root>
        </div>
    )
}

export default NarrativePatterns;
