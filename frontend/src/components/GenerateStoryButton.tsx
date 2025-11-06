// Import dependencies
import { useState, useRef } from 'react';

// Props interface
type GenerateStoryButtonProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    selectedPattern: string;
    storyLoading: boolean;
}

// Generate story button component
const GenerateStoryButton = ({ setRightNarrativePatternsOpen, setSelectedPattern, selectedPattern, storyLoading }: GenerateStoryButtonProps) => {

    // States
    const [AIOpen, setAIOpen] = useState(false);

    // Refs
    const AIRef = useRef<HTMLButtonElement>(null);
    const AITimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle generate story
    const handleAIStoryGeneration = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setAIOpen(false);
        setSelectedPattern('AI Assistance');
    }

    // Handle select manually
    const handleSelectManually = () => {
        setAIOpen(false);
        setRightNarrativePatternsOpen(true);
    }

    // Handle mouse enter with delay
    const handleAIEnter = () => {
        // Clear any pending close timeout
        if (AITimeoutRef.current) {
            clearTimeout(AITimeoutRef.current);
            AITimeoutRef.current = null;
        }
        setAIOpen(true);
    };

    // Handle mouse leave with delay
    const handleAILeave = () => {
        AITimeoutRef.current = setTimeout(() => {
            setAIOpen(false);
        }, 150); // 150ms delay
    };

    // Format pattern name
    const formatPatternName = (pattern: string) => {
        if (pattern === '') {
            return 'Select Narrative';
        } else {
            return pattern.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
    };

    // Visible component
    return (
        <div className="relative inline-block">
            <button 
                ref={AIRef}
                id="select-narrative-button"
                className={`flex items-center bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                onMouseEnter={handleAIEnter}
                onMouseLeave={handleAILeave}
                disabled={storyLoading}
            >
                <span className={`flex items-center justify-center gap-2`}> 
                    {storyLoading ? 'Generating...' : formatPatternName(selectedPattern || '')}
                    
                    <svg className={`fill-current h-4 w-4 transition-transform duration-300 ease-in ${AIOpen ? 'rotate-180' : 'rotate-0'}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                    </svg>
                </span>
            </button>
            
            {/* Dropdown Menu */}
            {AIOpen && (
                <div 
                    className="absolute top-full z-50 left-0 mt-1 shadow-lg bg-transparent overflow-hidden m-1"
                    onMouseEnter={handleAIEnter}
                    onMouseLeave={handleAILeave}
                >
                    <button 
                        className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleAIStoryGeneration}
                        disabled={storyLoading}
                    >
                        Select With AI
                    </button>

                    <button 
                        className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                        onClick={handleSelectManually}
                    >
                        Select Manually
                    </button>
                </div>
            )}
        </div>
    )
}

export default GenerateStoryButton;