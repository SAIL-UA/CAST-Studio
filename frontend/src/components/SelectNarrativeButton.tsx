// Import dependencies
import { useNavigate } from 'react-router-dom';

// Import components

// Import images

// Define props interface
type SelectNarrativeButtonProps = {
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    value: string;
}

// Select narrative button component
const SelectNarrativeButton = ({ setSelectedPattern, value }: SelectNarrativeButtonProps) => {

    // Navigation helper
    const navigate = useNavigate();

    // Handle button click

    return (
        <button
        className='bg-white rounded-full mt-2 px-2 py-0 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200'
        onClick={() => setSelectedPattern(value)}
        onDoubleClick={() => navigate(`/construction`)}>
            <p className='text-xs font-roboto-semibold'>Select</p>
        </button>
    )
}

export default SelectNarrativeButton;