// Import dependencies
import { useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { logAction } from '../utils/userActionLogger';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

const menuItemClass = "block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm !font-light rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 cursor-pointer outline-none text-left";

// Props interface
type GenerateStoryButtonProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    selectedPattern: string;
    storyLoading: boolean;
}

// Generate story button component
const GenerateStoryButton = ({ setRightNarrativePatternsOpen, setSelectedPattern, selectedPattern, storyLoading }: GenerateStoryButtonProps) => {

    const { selectWithAI } = useFeatureFlags();

    // Reset stale AI pattern if feature is disabled
    useEffect(() => {
        if (!selectWithAI && selectedPattern === 'AI Assistance') {
            setSelectedPattern('');
        }
    }, [selectWithAI, selectedPattern, setSelectedPattern]);

    // Handle generate story
    const handleAIStoryGeneration = async (e: React.MouseEvent) => {
        setSelectedPattern('AI Assistance');
        logAction(e, { "narrative_pattern": 'AI Assistance' });
    }

    // Handle select manually
    const handleSelectManually = (e: React.MouseEvent) => {
        setRightNarrativePatternsOpen(true);
    }

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
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild disabled={storyLoading}>
                <button
                    id="select-narrative-button"
                    className="flex items-center whitespace-nowrap bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={storyLoading}
                >
                    <span className="flex items-center justify-center gap-2">
                        {storyLoading ? 'Generating...' : formatPatternName(selectedPattern || '')}
                        <svg
                            className="fill-current h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                        </svg>
                    </span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="mt-1 ml-1 shadow-lg z-[400]"
                    sideOffset={4}
                    align="start"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    {selectWithAI && (
                        <DropdownMenu.Item
                            className={menuItemClass}
                            log-id="select-narrative-ai-button"
                            onSelect={(e) => handleAIStoryGeneration(e as any)}
                        >
                            Select With AI
                        </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Item
                        className={menuItemClass}
                        log-id="select-narrative-manually-button"
                        onSelect={(e) => handleSelectManually(e as any)}
                    >
                        Select Manually
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

export default GenerateStoryButton;
