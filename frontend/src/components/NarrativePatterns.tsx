// Import dependencies

// Import components
import SelectNarrativeButton from './SelectNarrativeButton';

// Import images
import Brutus from '../assets/images/brutus.jpg'
import Casa from '../assets/images/casa.jpg'
import Fresas from '../assets/images/fresas.jpg'
import Popeye from '../assets/images/popeye.jpg'
import Super from '../assets/images/super.jpg'

// Define props interface
type NarrativePatternsProps = {
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
}

// Narrative patterns component
const NarrativePatterns = ({ setSelectedPattern }: NarrativePatternsProps) => {

    return (
        <div id="narrative-patterns" className="p-0 m-0">
            <h3 className="m-0 mb-4 text-2xl">Narrative Patterns</h3>
            <div className="grid grid-cols-1 min-lg:grid-cols-2 grid-rows-3 gap-1 items-center">
                {/* Grid item 1 - Popeye - Overview To Detail*/}
                <div className="flex h-[22dvh] bg-yellow-400 p-2">
                    <img src={Popeye} alt="Popeye" className="w-1/4 h-full object-cover p-2" />
                    <div className="w-3/4 p-2">
                        <h3 className="font-bold">Overview To Detail</h3>
                        <p>CONTENT TODO</p>
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="overviewToDetail" />
                    </div>
                </div>
                
                {/* Grid item 2 - Brutus - Martini Glass*/}
                <div className="flex h-[22dvh] bg-red-100 p-2">
                    <img src={Brutus} alt="Brutus" className="w-1/4 h-full object-cover p-2" />
                    <div className="w-3/4 p-2">
                        <h3 className="font-bold">Martini Glass</h3>
                        <p>CONTENT TODO</p>
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="martiniGlass" />
                    </div>
                </div>
                
                {/* Grid item 3 - Casa - Cause and Effect*/}
                <div className="flex h-[22dvh] bg-gray-300 p-2">
                    <img src={Casa} alt="Casa" className="w-1/4 h-full object-cover p-2" />
                    <div className="w-3/4 p-2">
                        <h3 className="font-bold">Cause and Effect</h3>
                        <p>CONTENT TODO</p>
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="causeAndEffect" />
                    </div>
                </div>
                
                {/* Grid item 4 - Timeline - Super*/}
                <div className="flex h-[22dvh] bg-blue-200 p-2">
                    <img src={Super} alt="Super" className="w-1/4 h-full object-cover p-2" />
                    <div className="w-3/4 p-2">
                        <h3 className="font-bold">Timeline</h3>
                        <p>CONTENT TODO</p>
                        <SelectNarrativeButton setSelectedPattern={setSelectedPattern} value="timeline" />
                    </div>
                </div>
                
                {/* Grid item 5 - Fresas - Question and Answer*/}
                <div className="flex h-[22dvh] bg-green-200 p-2">
                    <img src={Fresas} alt="Fresas" className="w-1/4 h-full object-cover p-2" />
                    <div className="w-3/4 p-2">
                        <h3 className="font-bold">Question and Answer</h3>
                        <p>CONTENT TODO</p>
                        <SelectNarrativeButton
                        setSelectedPattern={setSelectedPattern}
                        value="questionAndAnswer"
                        />
                    </div>
                </div>
                
                {/* Grid item 6 - Empty for layout*/}
                <></>
            </div>
        </div>
    )
}

export default NarrativePatterns;