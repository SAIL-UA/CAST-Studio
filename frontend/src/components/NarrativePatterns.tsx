// Import dependencies

// Import components
import SelectNarrativeButton from './SelectNarrativeButton';
import NarrativeExamplesButton from './NarrativeExamplesButton';
import { logAction } from '../utils/userActionLogger';

// Import images
import Brutus from '../assets/images/brutus.jpg';
import Casa from '../assets/images/casa.jpg'
import questionanswer from '../assets/images/questionanswer.png'
import timeline from '../assets/images/timeline.png'
import causeeffect from '../assets/images/causeeffect.png'
import factoranalysis from '../assets/images/factoranalysis.png'
import overviewdetail from '../assets/images/overviewdetail.png'
import problemsolution from '../assets/images/problemsolution.png'
import workflowprocess from '../assets/images/workflow.png'
import Fresas from '../assets/images/fresas.jpg'
import Popeye from '../assets/images/popeye.jpg'
import Super from '../assets/images/super.jpg'

// Define props interface
type NarrativePatternsProps = {
    center: boolean;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setRightNarrativeExamplesOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Narrative patterns component
const NarrativePatterns = ({ setSelectedPattern, setRightNarrativePatternsOpen, center, setStoryLoading, setRightNarrativeExamplesOpen }: NarrativePatternsProps) => {

    // Reusable hover handler that captures pattern from data attribute
    const handleHover = (e: React.MouseEvent<HTMLDivElement>) => {
        const pattern = e.currentTarget.getAttribute('data-pattern');
        logAction(e, { narrative_pattern: pattern });
    };

    return (
        <div id="narrative-patterns" className="p-0 m-0">
            <div className="flex flex-row w-full">

                <h3 className={`${center ? 'text-2xl mb-4 mt-2' : 'text-lg mb-2 mt-4 w-3/4 ml-2'}`}>Narrative Structures</h3>
                {!center && (
                    <div
                    className="flex items-center justify-end w-1/4"
                    >
                        <svg
                        log-id="narrative-patterns-close-button"
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        onClick={(e) => {
                            setRightNarrativePatternsOpen(false);
                            logAction(e);
                        }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                )}
            </div>
                
            <div className={`grid grid-cols-1 ${center ? 'min-lg:grid-cols-2' : ''} auto-rows-min gap-2 grid-rows-5 items-center`}>
                
                {/* Grid item 1 - Casa - Cause and Effect*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="cause_and_effect"
                className='flex flex-row h-full bg-sky-lighter p-2 items-center hover:bg-grey-light'
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={causeeffect} alt="Casa" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Cause and Effect</h3>
                        <p className="text-xs">How a variable or event influences another.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}

                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="cause_and_effect"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="cause_and_effect"
                                />
                        )}
                    </div>
                </div>

                {/* Grid item 2 - Fresas - Question and Answer*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="question_answer"
                className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={questionanswer} alt="Fresas" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Question and Answer</h3>
                        <p className="text-xs">A central question, followed by evidence to support the answer.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        setStoryLoading={setStoryLoading}
                        value="question_answer"
                        />
                        {!center && (

                            <NarrativeExamplesButton
                            setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                            setSelectedPattern={setSelectedPattern}
                            value="question_answer"
                            />

                        )}
                    </div>
                </div>

                {/* Grid item 3 - Super - Time Series Progression*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="time_based"
                className={`${center ? 'bg-sky-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={timeline} alt="Super" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Timeline</h3>
                        <p className="text-xs">A sequence of events in time to highlight patterns and trends.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="time_based"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="time_based"
                                />
                        )}
                    </div>
                </div>

                {/* Grid item 4 - Popeye - Factor Analysis*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="factor_analysis"
                className={`${center ? 'bg-sky-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={factoranalysis} alt="Popeye" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Factor Analysis</h3>
                        <p className="text-xs">A breakdown of a phenomenon into influencing factors.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="factor_analysis"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="factor_analysis"
                                />
                        )}
                    </div>
                </div>

                {/* Grid item 5 - Popeye - Overview To Detail*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="overview_to_detail"
                className='flex flex-row h-full bg-sky-lighter p-2 items-center hover:bg-grey-light'
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={overviewdetail} alt="Popeye" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Overview To Detail</h3>
                        <p className="text-xs">A broad snapshot of a phenomenon, followed by finer details.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="overview_to_detail"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="overview_to_detail"
                                />
                        )}
                    </div>
                </div>

                {/* Grid item 6 - Brutus - Problem and Solution*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="problem_solution"
                className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover p-2">
                        <img src={problemsolution} alt="Brutus" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Problem and Solution</h3>
                        <p className="text-xs">A challenge, followed by evidence for a solution.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="problem_solution"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="problem_solution"
                                />
                        )}
                    </div>
                </div>

                {/* Grid item 7 - Brutus - Comparative Analysis*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="comparative"
                className={`${center ? 'bg-sky-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={workflowprocess} alt="Fresas" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Comparative Analysis</h3>
                        <p className="text-xs">A side-by-side view of events to reveal similarities and differences.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="comparative"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="comparative"
                                />
                        )}
                    </div>
                </div>

                {/* Grid item 8 - Brutus - Workflow or Process*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="workflow_process"
                className={`${center ? 'bg-sky-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center  hover:bg-grey-light` }
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={workflowprocess} alt="Brutus" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Workflow or Process</h3>
                        <p className="text-xs">Discusses the key stages of a system or pipeline.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="workflow_process"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="workflow_process"
                                />
                        )}
                    </div>
                </div>

                {/* Grid item 9 - Popeye - Shock and Lead*/}
                <div
                log-id="narrative-pattern-card"
                data-pattern="shock_lead"
                className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'
                onMouseEnter={handleHover}
                >
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={workflowprocess} alt="Popeye" className="w-full h-full object-contain ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Shock and Lead</h3>
                        <p className="text-xs">A striking fact, followed by analysis of explanatory factors.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}></p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="shock_lead"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="shock_lead"
                                />
                        )}
                    </div>
                </div>
                
            
                {/* Grid item 10 - Empty for layout*/}
                <></>

            </div>
        </div>
    )
}

export default NarrativePatterns;