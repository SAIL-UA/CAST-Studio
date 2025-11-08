// Import dependencies
import { logAction } from '../utils/userActionLogger';
import { generateDescription, generateNarrativeAsync, getImageDataAll, getNarrativeCache } from '../services/api';

// Import types
import { ImageData } from '../types/types';

// Props interface
type CraftStoryButtonProps = {
    images?: ImageData[];
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    hasGroups?: boolean;  // New prop to indicate if groups exist
}

// Upload button component
const CraftStoryButton = ({ images = [], storyLoading, setStoryLoading, hasGroups = false }: CraftStoryButtonProps) => {

        // Generate descriptions for images that don't have them
        const generateMissingDescriptions = async () => {
            const imagesNeedingDescriptions = images.filter(img => 
                !img.long_desc || img.long_desc.trim() === ''
            );
    
            if (imagesNeedingDescriptions.length === 0) {
                console.log('All images already have descriptions');
                return true;
            }
    
            console.log(`Generating descriptions for ${imagesNeedingDescriptions.length} images...`);
    
            try {
                // Generate descriptions for each image sequentially
                let successful = 0;
                let failed = 0;
    
                for (const image of imagesNeedingDescriptions) {
                    try {
                        const response = await generateDescription(image.id);
                        
                        if (response.status === 'success') {
                            successful++;
                            console.log(`Description generated for image ${image.id}`);
                        } else {
                            failed++;
                            console.error(`Failed to generate description for image ${image.id}:`, response.message);
                        }
                    } catch (error) {
                        failed++;
                        console.error(`Error generating description for image ${image.id}:`, error);
                    }
                }
    
                console.log(`Description generation complete: ${successful} successful, ${failed} failed`);
                
                // Return true if at least some descriptions were generated
                return successful > 0 || imagesNeedingDescriptions.length === 0;
    
            } catch (error) {
                console.error('Error in bulk description generation:', error);
                return false;
            }
        };


    // Handle upload
    const handleCraft = async (e: React.MouseEvent<HTMLButtonElement>) => {
        logAction(e);
        
        // Generate story with selected pattern
        setStoryLoading(true);
        
        // Dispatch event to indicate story generation has started
        const startEvent = new CustomEvent('storyGenerationStarted');
        window.dispatchEvent(startEvent);
        
        try {
            // Debug: Log current image state
            console.log('Current images state:', images);
            console.log('Images with in_storyboard=true:', images.filter(img => img.in_storyboard));
            console.log('Images with long_desc:', images.filter(img => img.long_desc && img.long_desc.trim()));
            
            // Step 1: Generate descriptions for images that don't have them
            console.log('Step 1: Generating missing descriptions...');
            const descriptionsSuccess = await generateMissingDescriptions();
            
            if (!descriptionsSuccess) {
                alert('Some descriptions failed to generate, but proceeding with story generation...');
            }

            // Step 2: Verify backend state before story generation
            console.log('Step 2: Verifying backend state...');
            try {
                const response = await getImageDataAll();
                const backendImages = response.data.images;
                console.log('Backend images state:', backendImages);
                console.log('Backend images with in_storyboard=true:', backendImages.filter((img: any) => img.in_storyboard));
                console.log('Backend images with long_desc:', backendImages.filter((img: any) => img.long_desc && img.long_desc.trim()));
                
                const readyImages = backendImages.filter((img: any) => img.in_storyboard && img.long_desc && img.long_desc.trim());
                console.log(`Images ready for story generation: ${readyImages.length}/${backendImages.length}`);
            } catch (error) {
                console.error('Error verifying backend state:', error);
            }

            // Step 3: Generate the story (async with polling)
            console.log('Step 3: Generating story...');
            console.log('Using groups:', hasGroups);
            const taskResponse = await generateNarrativeAsync(undefined, hasGroups);
            
            if (taskResponse.status === 'success' && taskResponse.task_id) {
                console.log('Story generation task started, task_id:', taskResponse.task_id);
                
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
                    const maxAttempts = 60; // 5 minutes with 5-second intervals
                    let attempts = 0;
                    
                    while (attempts < maxAttempts) {
                        attempts++;
                        console.log(`Polling attempt ${attempts}/${maxAttempts}`);
                        
                        try {
                            // Check narrative cache for completion
                            const cacheResponse = await getNarrativeCache();
                            const cacheData = cacheResponse.data.data;
                            
                            // Only consider story complete if narrative exists AND is different from initial
                            if (cacheData.narrative && cacheData.narrative !== initialNarrative) {
                                // Story generation complete with new content
                                const storyEvent = new CustomEvent('storyGenerated', {
                                    detail: {
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
                                return;
                            }
                        } catch (error) {
                            console.error('Error polling for story completion:', error);
                        }
                        
                        // Wait 5 seconds before next poll
                        await new Promise(resolve => setTimeout(resolve, 5000));
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