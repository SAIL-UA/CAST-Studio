// Import dependencies
import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { logAction } from '../utils/userActionLogger';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useGuestTourOpen } from '../utils/useGuestTourOpen';

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

    // Force-open during the guest tour screen for narrative
    const tourOpen = useGuestTourOpen('narrative');
    const [userOpen, setUserOpen] = useState(false);
    const menuOpen = tourOpen || userOpen;

    // Reset stale AI pattern if feature is disabled
    useEffect(() => {
        if (!selectWithAI && selectedPattern === 'AI Assistance') {
            setSelectedPattern('');
        }
    }, [selectWithAI, selectedPattern, setSelectedPattern]);

    // Handle generate story
    const handleAIStoryGeneration = async () => {
        setSelectedPattern('AI Assistance');
        logAction({ actionType: 'click', elementId: 'select-narrative-ai-button' }, { "narrative_pattern": 'AI Assistance' });
    }

    // Handle select manually
    const handleSelectManually = () => {
        logAction({ actionType: 'click', elementId: 'select-narrative-manually-button' });
        setRightNarrativePatternsOpen(true);
    }

    // Format pattern name for display
    const formatPatternName = (pattern: string) => {
        if (pattern === '') {
            return 'Select Narrative';
        } else if (pattern === 'AI Assistance') {
            return 'AI Assistance';
        } else {
            return pattern.split('_').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
    };

    // Derive selection state
    const isAISelected = selectedPattern === 'AI Assistance';
    const isManualSelected = selectedPattern !== '' && selectedPattern !== 'AI Assistance';
    const currentNarrativeLabel = selectedPattern === '' ? 'None' : formatPatternName(selectedPattern);

    // Tick mark component
    const Tick = () => (
        <svg className="w-3.5 h-3.5 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );

    // Visible component
    return (
        <DropdownMenu.Root open={menuOpen} onOpenChange={setUserOpen}>
            <DropdownMenu.Trigger asChild disabled={storyLoading}>
                <button
                    id="select-narrative-button"
                    data-tour-target="narrative"
                    className="flex items-center whitespace-nowrap bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={storyLoading}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="10" height="5" rx="1"/><rect x="3" y="9" width="10" height="5" rx="1"/></svg>
                        {storyLoading ? 'Generating...' : 'Select Narrative'}
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
                    className="mt-1 ml-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[200px]"
                    sideOffset={4}
                    align="start"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    {selectWithAI && (
                        <>
                        <DropdownMenu.Item
                            className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                            log-id="select-narrative-ai-button"
                            onSelect={() => handleAIStoryGeneration()}
                        >
                            {isAISelected && <Tick />}
                            Select With AI
                        </DropdownMenu.Item>
                        <div className="h-px mx-3 bg-grey" />
                        </>
                    )}
                    <DropdownMenu.Item
                        className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                        log-id="select-narrative-manually-button"
                        onSelect={() => handleSelectManually()}
                    >
                        {isManualSelected && <Tick />}
                        Select Manually
                    </DropdownMenu.Item>
                    <div className="h-px mx-3 bg-grey" />
                    <div className="px-3 py-1.5 text-xs text-grey-dark">
                        Current Narrative: <span className="font-medium text-grey-darkest">{currentNarrativeLabel}</span>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

export default GenerateStoryButton;
