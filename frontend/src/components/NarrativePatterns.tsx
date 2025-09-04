// Import dependencies

// Import components
import SelectNarrativeButton from './SelectNarrativeButton';

// Import images
import Brutus from '../assets/images/brutus.jpg';
import Casa from '../assets/images/casa.jpg'
import Fresas from '../assets/images/fresas.jpg'
import Popeye from '../assets/images/popeye.jpg'
import Super from '../assets/images/super.jpg'

// Define props interface
type NarrativePatternsProps = {
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    center: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Narrative patterns component
const NarrativePatterns = ({ setSelectedPattern, setRightNarrativePatternsOpen, center, setStoryLoading }: NarrativePatternsProps) => {

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
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Explains how one variable or event influences another, highlighting correlations or causal relationships to show why outcomes occur.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="Cause-and-Effect" setStoryLoading={setStoryLoading} />
                    </div>
                </div>

                {/* Grid item 2 - Fresas - Question and Answer*/}
                <div className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Fresas} alt="Fresas" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Question and Answer</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Structures the narrative around a central question, guiding the reader through data-driven evidence that resolves the inquiry.</p>}
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        setStoryLoading={setStoryLoading}
                        value="Question-and-Answer"
                        />
                    </div>
                </div>

                {/* Grid item 3 - Super - Time Series Progression*/}
                <div className={`${center ? 'bg-grey' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Super} alt="Super" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Timeline</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Uses chronological sequencing to reveal trends, patterns, or shifts in data across time, often showing evolution or change.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="Time-Based Progression" setStoryLoading={setStoryLoading} />
                    </div>
                </div>

                {/* Grid item 4 - Popeye - Factor Analysis*/}
                <div className={`${center ? 'bg-indigo-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Popeye} alt="Popeye" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Factor Analysis</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Breaks down a phenomenon into its contributing factors, discussing variables to show their relative influence or importance.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="TODO Factor Analysis" setStoryLoading={setStoryLoading} />
                    </div>
                </div>

                {/* Grid item 5 - Popeye - Overview To Detail*/}
                <div className='flex flex-row h-full bg-sky-lighter p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Popeye} alt="Popeye" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Overview To Detail</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Begins with a broad snapshot of the data, then progressively drills into finer details or sub-stories for deeper insight.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="Overview to Detail" setStoryLoading={setStoryLoading} />
                    </div>
                </div>

                {/* Grid item 6 - Brutus - Problem and Solution*/}
                <div className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover p-2">
                        <img src={Brutus} alt="Brutus" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Problem and Solution</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Frames data around a challenge or issue and uses evidence to explore possible interventions, strategies, or resolutions.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="Problem-Solution Framework" setStoryLoading={setStoryLoading} />
                    </div>
                </div>

                {/* Grid item 7 - Brutus - Comparative Analysis*/}
                <div className={`${center ? 'bg-grey' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Brutus} alt="Brutus" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Comparative Analysis</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Places datasets side by side to reveal similarities, contrasts, or trade-offs, helping audiences evaluate differences.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="Comparative Analysis" setStoryLoading={setStoryLoading} />
                    </div>
                </div>

                {/* Grid item 8 - Brutus - Workflow or Process*/}
                <div className={`${center ? 'bg-indigo-lighter' : 'bg-sky-lighter'} flex flex-row h-full p-2 items-center  hover:bg-grey-light` }>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Brutus} alt="Brutus" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Workflow or Process</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Maps data along the stages of a system, journey, or pipeline, emphasizing sequence, dependencies, and outcomes.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="Workflow/Process" setStoryLoading={setStoryLoading} />
                    </div>
                </div>

                {/* Grid item 9 - Brutus - Shock and Lead*/}
                <div className='flex flex-row bg-sky-lighter h-full p-2 items-center hover:bg-grey-light'>
                    <div className="w-1/4 h-3/4 object-cover pr-1">
                        <img src={Brutus} alt="Brutus" className="w-full h-full object-cover ml-2" />
                    </div>
                    <div className="w-3/4 h-auto pl-4">
                        <h3 className={`${center ? 'text-md font-roboto-bold' : 'text-lg'}`}>Shock and Lead</h3>
                        {center && <p className={`${center ? 'text-sm' : 'text-xs'} roboto-light text-grey-darkest`}>Opens with a striking or unexpected data point that grabs attention, then unpacks context and analysis to explain its meaning.</p>}
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="shockAndLead" setStoryLoading={setStoryLoading} />
                    </div>
                </div>
                
            
                {/* Grid item 10 - Empty for layout*/}
                <></>

            </div>
        </div>
    )
}

export default NarrativePatterns;