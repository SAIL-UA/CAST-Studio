// Import dependencies

// Import components

// Define props interface
type NarrativeExamplesButtonProps = {
    value: string;
    setRightNarrativeExamplesOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
}

// Narrative Examples Button Component
const NarrativeExamplesButton = ({ value, setRightNarrativeExamplesOpen, setSelectedPattern }: NarrativeExamplesButtonProps) => {

    const handleClick = () => {
        setSelectedPattern(value);
        setRightNarrativeExamplesOpen(true);
    }


    return (
        <button
        className="bg-indigo-lighter rounded-full mt-2 px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleClick}
        >
            <p className="text-sm font-roboto-light">See Examples</p>
        </button>
    )
}

// Export component
export default NarrativeExamplesButton;