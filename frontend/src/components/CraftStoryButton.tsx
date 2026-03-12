// Import dependencies
import { captureActionContext, logAction } from '../utils/userActionLogger';
import { generateDescription, generateNarrativeAsync, getImageDataAll, getNarrativeCache } from '../services/api';

// Import types
import { ImageData } from '../types/types';
const DESCRIPTION_PLACEHOLDER = 'Ask AI to create a description for this visual.';

// Props interface
type CraftStoryButtonProps = {
    images?: ImageData[];
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    hasGroups?: boolean;  // New prop to indicate if groups exist
    selectedPattern: string;
    onStoryGenerated?: () => Promise<void>;
}

// Upload button component
const CraftStoryButton = ({ images = [], storyLoading, setStoryLoading, hasGroups = false, selectedPattern, onStoryGenerated }: CraftStoryButtonProps) => {

    // Handle upload
    const handleCraft = async (e: React.MouseEvent) => {
        const ctx = captureActionContext(e);

                  // --- Validation checks ---
        const missing: string[] = [];

        // 1. Check for visuals on the storyboard
        const storyboardImages = images.filter(img => img.in_storyboard);
        if (storyboardImages.length === 0) {
            missing.push('Upload visuals to the workspace and annotate them');
        }

          // 2. Check that all storyboard images have annotations (either long_desc or short_desc)                                             
        if (storyboardImages.length > 0) {
            const SHORT_DESC_PLACEHOLDER = 'Add a description for this visual.';
            const hasValidDescription = (img: ImageData) => {
                const longValid = img.long_desc && img.long_desc.trim() !== '' && img.long_desc !== DESCRIPTION_PLACEHOLDER;
                const shortValid = img.short_desc && img.short_desc.trim() !== '' && img.short_desc !== SHORT_DESC_PLACEHOLDER;
                return longValid || shortValid;
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
            alert('Before generating a story, please:\n\n' + missing.map(m => `• ${m}`).join('\n'));
            return;
        }
        
        // Generate story with selected pattern
        setStoryLoading(true);

        // Dispatch event to indicate story generation has started
        const startEvent = new CustomEvent('storyGenerationStarted');
        window.dispatchEvent(startEvent);
        
        try {
            // Debug: Log current image state
            // console.log('Current images state:', images);
            // console.log('Images with in_storyboard=true:', images.filter(img => img.in_storyboard));
            // console.log('Images with long_desc:', images.filter(img => img.long_desc && img.long_desc.trim()));

            // Step 1: Verify backend state before story generation
            console.log('Step 2: Verifying backend state...');
            try {
                const response = await getImageDataAll();
                const backendImages = response.data.images;
                // console.log('Backend images state:', backendImages);
                // console.log('Backend images with in_storyboard=true:', backendImages.filter((img: any) => img.in_storyboard));
                // console.log('Backend images with long_desc:', backendImages.filter((img: any) => img.long_desc && img.long_desc.trim()));
                
                const readyImages = backendImages.filter((img: any) => img.in_storyboard && img.long_desc && img.long_desc.trim());
                console.log(`Images ready for story generation: ${readyImages.length}/${backendImages.length}`);
            } catch (error) {
                console.error('Error verifying backend state:', error);
            }

            // Step 2: Generate the story (async with polling)
            // console.log('Step 3: Generating story...');
            // console.log('Using groups:', hasGroups);
            // console.log('Selected pattern:', selectedPattern);
            const taskResponse = await generateNarrativeAsync(selectedPattern || undefined, hasGroups);
            
            if (taskResponse.status === 'success' && taskResponse.task_id) {
                // console.log('Story generation task started, task_id:', taskResponse.task_id);
                
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

                // Poll for task completion
                const pollForCompletion = async () => {
                    const maxAttempts = 192; // 8 minutes with 2.5-second intervals
                    let attempts = 0;
                    
                    while (attempts < maxAttempts) {
                        attempts++;
                        // console.log(`Polling attempt ${attempts}/${maxAttempts}`);
                        
                        try {
                            // Check narrative cache for completion
                            const cacheResponse = await getNarrativeCache();
                            const cacheData = cacheResponse.data.data;
                            
                            // Only consider story complete if narrative exists AND is different from initial
                            if (cacheData.narrative && cacheData.narrative !== initialNarrative) {
                                // Pull latest image data so generated descriptions are reflected in UI.
                                if (onStoryGenerated) {
                                    try {
                                        await onStoryGenerated();
                                    } catch (refreshError) {
                                        console.error('Error refreshing image data after story generation:', refreshError);
                                    }
                                }

                                // Story generation complete with new content
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
                                logAction(ctx, { "story_data": cacheData })
                                return;
                            }
                        } catch (error) {
                            console.error('Error polling for story completion:', error);
                        }
                        
                        // Wait 2.5 seconds before next poll
                        await new Promise(resolve => setTimeout(resolve, 2500));
                    }
                    
                    // Timeout reached
                    console.error('Story generation timed out');
                    alert('Story generation is taking longer than expected. Please check back in a few minutes.');
                };
                
                // Start polling (don't await to allow UI updates)
                pollForCompletion();
                
            } else {
                console.error('Error starting story generation:', taskResponse.message);
                alert(`Error starting story generation: ${taskResponse.message}`);
            }
        } catch (error) {
            console.error('Error generating story:', error);
            alert('An error occurred while generating the story. Please try again.');
        }

    }

    // Visible component
    return (
        <button id="upload-button"
        log-id="craft-story-button"
        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{backgroundColor: "#348b94"}}
        onClick={handleCraft}
        disabled={storyLoading}>
        {storyLoading ? 'Generating...' : 'Generate Story'}
        </button>
    )
}

export default CraftStoryButton;