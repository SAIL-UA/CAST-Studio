// Import dependencies
import { getImageDataAll, generateNarrativeAsync, getNarrativeCache } from '../services/api';

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
    const handleSelectNarrative = async (value: string) => {
        setSelectedPattern(value);
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
                console.log('Backend images state:', backendImages);
                console.log('Backend images with in_storyboard=true:', backendImages.filter((img: any) => img.in_storyboard));
                console.log('Backend images with long_desc:', backendImages.filter((img: any) => img.long_desc && img.long_desc.trim()));
                
                const readyImages = backendImages.filter((img: any) => img.in_storyboard && img.long_desc && img.long_desc.trim());
                console.log(`Images ready for story generation: ${readyImages.length}/${backendImages.length}`);
            } catch (error) {
                console.error('Error verifying backend state:', error);
            }

            // Generate the story (async with polling)
            console.log('Generating story with pattern:', value);
            const taskResponse = await generateNarrativeAsync(value);
            
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
                    setStoryLoading(false);
                };
                
                // Start polling (don't await to allow UI updates)
                pollForCompletion();
                
            } else {
                console.error('Error starting story generation:', taskResponse.message);
                alert(`Error starting story generation: ${taskResponse.message}`);
                setStoryLoading(false);
            }
        } catch (error) {
            console.error('Error generating story:', error);
            alert('An error occurred while generating the story. Please try again.');
            setStoryLoading(false);
        }
    }

    return (
        <button
        className='bg-white rounded-full mt-2 px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200'
        onClick={() => handleSelectNarrative(value)}
        >
            <p className='text-sm font-roboto-light'>Select</p>
        </button>
    )
}

export default SelectNarrativeButton;