// Import dependencies
import { getImageDataAll, generateNarrativeAsync, getNarrativeCache } from '../services/api';
import { logAction } from '../utils/userActionLogger';

// Import components

// Import images

// Define props interface
type SelectNarrativeButtonProps = {
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    value: string;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Select narrative button component
const SelectNarrativeButton = ({ setSelectedPattern, value, setStoryLoading }: SelectNarrativeButtonProps) => {
    // Handle button click
    const handleSelectNarrative = async (e: React.MouseEvent, value: string) => {
        setSelectedPattern(value);
    }

    return (
        <button
        log-id={`select-narrative-button`}
        className='bg-white rounded-full mt-2 px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200'
        onClick={(e) => handleSelectNarrative(e, value)}
        >
            <p className='text-sm font-roboto-light'>Select</p>
        </button>
    )
}

export default SelectNarrativeButton;