// Import dependencies
import { useState } from 'react';
import { captureActionContext, logAction } from '../utils/userActionLogger';
import { generateNarrativeAsync, getImageDataAll, getNarrativeCache } from '../services/api';
import { useTaskProgress } from '../hooks/useTaskProgress';
import ProgressButton from './ProgressButton';

// Import types
import { ImageData } from '../types/types';
const DESCRIPTION_PLACEHOLDER = 'Ask AI to create a description for this visual.';

// Props interface
type CraftStoryButtonProps = {
    images?: ImageData[];
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    hasGroups?: boolean;
    selectedPattern: string;
    onStoryGenerated?: () => Promise<void>;
}

// Craft Story button component
const CraftStoryButton = ({ images = [], storyLoading, setStoryLoading, hasGroups = false, selectedPattern, onStoryGenerated }: CraftStoryButtonProps) => {

    const [taskId, setTaskId] = useState<string | null>(null);
    const [alertModal, setAlertModal] = useState<string | null>(null);
    const { progress, stageName, error, isComplete } = useTaskProgress(taskId);

    // Handle error from progress tracking
    if (error && storyLoading) {
        setAlertModal(`Story generation failed during: ${stageName}\n\n${error}`);
        setStoryLoading(false);
        setTaskId(null);
    }

    // Handle craft
    const handleCraft = async (e: React.MouseEvent) => {
        const ctx = captureActionContext(e);

        // --- Validation checks ---
        const missing: string[] = [];

        // 1. Check for visuals on the storyboard (exclude instructor feedback)
        const storyboardImages = images.filter(img => img.in_storyboard && img.source !== 'instructor');
        if (storyboardImages.length === 0) {
            missing.push('Upload visuals to the workspace and annotate them');
        }

        // 2. Check that all storyboard images have descriptions
        if (storyboardImages.length > 0) {
            const hasValidDescription = (img: ImageData) => {
                return img.long_desc && img.long_desc.trim() !== '' && img.long_desc !== DESCRIPTION_PLACEHOLDER;
            };
            const unannotated = storyboardImages.filter(img => !hasValidDescription(img));
            if (unannotated.length > 0) {
                missing.push(`Annotate all visuals (${unannotated.length} image(s) missing descriptions)`);
            }
        }

        // 3. Check that a narrative pattern has been selected
        if (!selectedPattern || selectedPattern === '') {
            missing.push('Select a narrative structure (with AI or manually)');
        }

        // If any checks failed, show a single prompt and return
        if (missing.length > 0) {
            setAlertModal('Before generating a story, please:\n\n' + missing.map(m => `• ${m}`).join('\n'));
            return;
        }

        // Generate story with selected pattern
        setStoryLoading(true);

        // Dispatch event to indicate story generation has started
        const startEvent = new CustomEvent('storyGenerationStarted');
        window.dispatchEvent(startEvent);

        try {
            // Verify backend state before story generation
            console.log('Verifying backend state...');
            try {
                const response = await getImageDataAll();
                const backendImages = response.data.images;
                const readyImages = backendImages.filter((img: any) => img.in_storyboard && img.long_desc && img.long_desc.trim());
                console.log(`Images ready for story generation: ${readyImages.length}/${backendImages.length}`);
            } catch (error) {
                console.error('Error verifying backend state:', error);
            }

            // Generate the story (async with polling)
            const taskResponse = await generateNarrativeAsync(selectedPattern || undefined, hasGroups);

            if (taskResponse.status === 'success' && taskResponse.task_id) {
                // Start progress tracking
                setTaskId(taskResponse.task_id);

                // Store initial narrative to detect when new one is generated
                let initialNarrative = '';
                try {
                    const initialResponse = await getNarrativeCache();
                    if (initialResponse.data && initialResponse.data.data) {
                        initialNarrative = initialResponse.data.data.narrative || '';
                    }
                } catch (error) {
                    console.log('No initial narrative found');
                }

                // Poll for task completion via narrative cache
                const pollForCompletion = async () => {
                    const maxAttempts = 192; // 8 minutes with 2.5-second intervals
                    let attempts = 0;

                    while (attempts < maxAttempts) {
                        attempts++;

                        try {
                            const cacheResponse = await getNarrativeCache();
                            const cacheData = cacheResponse.data.data;

                            if (cacheData.narrative && cacheData.narrative !== initialNarrative) {
                                if (onStoryGenerated) {
                                    try {
                                        await onStoryGenerated();
                                    } catch (refreshError) {
                                        console.error('Error refreshing image data after story generation:', refreshError);
                                    }
                                }

                                const storyEvent = new CustomEvent('storyGenerated', {
                                    detail: {
                                        story_structure_id: cacheData.story_structure_id,
                                        narrative: cacheData.narrative,
                                        recommended_order: cacheData.order,
                                        categorize_figures_response: cacheData.categories,
                                        theme_response: cacheData.theme,
                                        sequence_response: cacheData.sequence_justification
                                    }
                                });
                                window.dispatchEvent(storyEvent);

                                console.log('New story generated successfully');
                                setStoryLoading(false);
                                setTaskId(null);
                                logAction(ctx, { "story_data": cacheData })
                                return;
                            }
                        } catch (error) {
                            console.error('Error polling for story completion:', error);
                        }

                        await new Promise(resolve => setTimeout(resolve, 2500));
                    }

                    // Timeout reached
                    console.error('Story generation timed out');
                    setAlertModal('Story generation is taking longer than expected. Please check back in a few minutes.');
                    setStoryLoading(false);
                    setTaskId(null);
                };

                pollForCompletion();

            } else {
                console.error('Error starting story generation:', taskResponse.message);
                setAlertModal(`Error starting story generation: ${taskResponse.message}`);
                setStoryLoading(false);
            }
        } catch (error) {
            console.error('Error generating story:', error);
            setAlertModal('An error occurred while generating the story. Please try again.');
            setStoryLoading(false);
        }

    }

    // Visible component
    return (
        <>
            <ProgressButton
                id="craft-story-button"
                logId="craft-story-button"
                color="#348b94"
                label="Generate Story"
                progress={progress}
                isRunning={storyLoading}
                onClick={handleCraft}
                disabled={storyLoading}
            >
                {storyLoading ? (stageName || 'Generating...') : 'Generate Story'}
            </ProgressButton>

            {alertModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                        <div className="text-sm text-grey-darkest whitespace-pre-wrap">
                            {alertModal}
                        </div>
                        <div className="mt-6 text-right">
                            <button
                                log-id="craft-story-alert-ok-button"
                                onClick={() => setAlertModal(null)}
                                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CraftStoryButton;
