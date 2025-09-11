// Import dependencies

// Import components
import SelectNarrativeButton from './SelectNarrativeButton';
import NarrativeExamplesButton from './NarrativeExamplesButton';

// Import images
import Brutus from '../assets/images/brutus.jpg';
import Casa from '../assets/images/casa.jpg'
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

    return (
        <div id="narrative-patterns" className="p-0 m-0">
            <div className="flex flex-row w-full">

                <h3 className={`${center ? 'text-2xl mb-4 mt-2' : 'text-lg mb-2 mt-4 w-3/4 ml-2'}`}>Narrative Patterns</h3>
                {!center && (
                    <div
                    className="flex items-center justify-end w-1/4"
                    >
                        <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        onClick={() => setRightNarrativePatternsOpen(false)}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                )}
            </div>
                
            <div className={`grid grid-cols-1 ${center ? 'min-lg:grid-cols-2' : ''} auto-rows-min gap-2 grid-rows-5 items-center`}>
                
                {/* Grid item 1 - Casa - Cause and Effect*/}
                <div className='flex flex-row h-full bg-sky-lighter p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Casa} alt="Casa" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Cause and Effect</h3>
                        <p className="text-xs">How a variable or event influences another.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Explains how one variable or event influences another, highlighting correlations or causal relationships to show why outcomes occur.</p>}
                        
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="cause_and_effect" 
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="cause_and_effect"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 2 - Fresas - Question and Answer*/}
                <div className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Fresas} alt="Fresas" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Question and Answer</h3>
                        <p className="text-xs">A central question, followed by evidence to support the answer.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Structures the narrative around a central question, guiding the reader through data-driven evidence that resolves the inquiry.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        setStoryLoading={setStoryLoading}
                        value="question_answer"
                        />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="question_answer"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 3 - Super - Time Series Progression*/}
                <div className={`${center ? 'bg-grey' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Super} alt="Super" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Timeline</h3>
                        <p className="text-xs">A sequence of events in time to highlight patterns and trends.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Uses chronological sequencing to reveal trends, patterns, or shifts in data across time, often showing evolution or change.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="time_based"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="time_based"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 4 - Popeye - Factor Analysis*/}
                <div className={`${center ? 'bg-indigo-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Popeye} alt="Popeye" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Factor Analysis</h3>
                        <p className="text-xs">A breakdown of a phenomenon into influencing factors.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Breaks down a phenomenon into its contributing factors, discussing variables to show their relative influence or importance.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="IN_PROGRESS_factor_analysis"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="IN_PROGRESS_factor_analysis"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 5 - Popeye - Overview To Detail*/}
                <div className='flex flex-row h-full bg-sky-lighter p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Popeye} alt="Popeye" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Overview To Detail</h3>
                        <p className="text-xs">A broad snapshot of a phenomenon, followed by finer details.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Begins with a broad snapshot of the data, then progressively drills into finer details or sub-stories for deeper insight.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="overview_to_detail"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="overview_to_detail"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 6 - Brutus - Problem and Solution*/}
                <div className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover p-2">
                        <img src={Brutus} alt="Brutus" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Problem and Solution</h3>
                        <p className="text-xs">A challenge, followed by evidence for a solution.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Frames data around a challenge or issue and uses evidence to explore possible interventions, strategies, or resolutions.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="problem_solution"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="problem_solution"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 7 - Brutus - Comparative Analysis*/}
                <div className={`${center ? 'bg-grey' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Fresas} alt="Fresas" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Comparative Analysis</h3>
                        <p className="text-xs">A side-by-side view of events to reveal similarities and differences.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Places datasets side by side to reveal similarities, contrasts, or trade-offs, helping audiences evaluate differences.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="comparative"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="comparative"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 8 - Brutus - Workflow or Process*/}
                <div className={`${center ? 'bg-indigo-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center  hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Brutus} alt="Brutus" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Workflow or Process</h3>
                        <p className="text-xs">Discusses the key stages of a system or pipeline.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Maps data along the stages of a system, journey, or pipeline, emphasizing sequence, dependencies, and outcomes.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="workflow_process"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="workflow_process"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid item 9 - Popeye - Shock and Lead*/}
                <div className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Popeye} alt="Popeye" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Shock and Lead</h3>
                        <p className="text-xs">A striking fact, followed by analysis of explanatory factors.</p>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Opens with a striking or unexpected data point that grabs attention, then unpacks context and analysis to explain its meaning.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="IN_PROGRESS_shock_lead"
                        setStoryLoading={setStoryLoading} />
                        {!center && (
                            <div>
                                <NarrativeExamplesButton
                                setRightNarrativeExamplesOpen={setRightNarrativeExamplesOpen}
                                setSelectedPattern={setSelectedPattern}
                                value="IN_PROGRESS_shock_lead"
                                />
                            </div>
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