// Import dependencies
import { logAction } from '../utils/userActionLogger';

// Define props interface
type SelectNarrativeButtonProps = {
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    value: string;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    onCreateScaffold?: (pattern: string) => void;
}

// Select narrative button component
const SelectNarrativeButton = ({ setSelectedPattern, value, setStoryLoading, onCreateScaffold }: SelectNarrativeButtonProps) => {
    const handleSelectNarrative = async (e: React.MouseEvent, value: string) => {
        setSelectedPattern(value);
        logAction({ actionType: 'click', elementId: 'select-narrative-button' }, { "narrative_pattern": value });
        if (onCreateScaffold) {
            onCreateScaffold(value);
        }
        // Also dispatch event for StoryBoard to listen to
        window.dispatchEvent(new CustomEvent('createScaffold', { detail: { pattern: value } }));
    }

    return (
        <button
        log-id="select-narrative-button"
        className='bg-white rounded-full mt-2 px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200'
        onClick={(e) => handleSelectNarrative(e, value)}
        >
            <p className='text-xs font-roboto-light'>Select</p>
        </button>
    )
}

export default SelectNarrativeButton;
