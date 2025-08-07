// Import dependencies
import { useState } from 'react';
import axios from 'axios';
import { ImageData } from '../types/types';

// Props interface
interface GenerateStoryButtonProps {
    images?: ImageData[];
}

// Generate story button component
const GenerateStoryButton = ({ images = [] }: GenerateStoryButtonProps) => {

    // State for loading
    const [loading, setLoading] = useState(false);

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
                    const response = await axios.post(
                        '/generate_long_description_for_image',
                        { id: image.id },
                        { withCredentials: true }
                    );
                    
                    if (response.data.status === 'success') {
                        successful++;
                        console.log(`Description generated for image ${image.id}`);
                    } else {
                        failed++;
                        console.error(`Failed to generate description for image ${image.id}:`, response.data.message);
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

    // Handle generate story
    const handleGenerateStory = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setLoading(true);
        
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

            // Wait a moment for the backend to process all the updates
            console.log('Waiting 2 seconds for backend to process updates...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 2.5: Verify backend state before story generation
            console.log('Step 2.5: Verifying backend state...');
            try {
                const verifyResponse = await axios.get('/get_user_data', { withCredentials: true });
                const backendImages = verifyResponse.data.images;
                console.log('Backend images state:', backendImages);
                console.log('Backend images with in_storyboard=true:', backendImages.filter((img: any) => img.in_storyboard));
                console.log('Backend images with long_desc:', backendImages.filter((img: any) => img.long_desc && img.long_desc.trim()));
                
                const readyImages = backendImages.filter((img: any) => img.in_storyboard && img.long_desc && img.long_desc.trim());
                console.log(`Images ready for story generation: ${readyImages.length}/${backendImages.length}`);
            } catch (error) {
                console.error('Error verifying backend state:', error);
            }

            // Step 3: Generate the story
            console.log('Step 3: Generating story...');
            const response = await axios.post('/run_script', {}, { withCredentials: true });
            
            if (response.data.status === 'success') {
                // Emit custom event with story data
                const storyEvent = new CustomEvent('storyGenerated', {
                    detail: {
                        narrative: response.data.narrative,
                        recommended_order: response.data.recommended_order,
                        categorize_figures_response: response.data.categorize_figures_response,
                        theme_response: response.data.theme_response,
                        sequence_response: response.data.sequence_response
                    }
                });
                window.dispatchEvent(storyEvent);
                
                console.log('Story generated successfully');
            } else {
                console.error('Error generating story:', response.data.message);
                console.error('Full response:', response.data);
                alert(`Error generating story: ${response.data.message}`);
            }
        } catch (error) {
            console.error('Error generating story:', error);
            alert('An error occurred while generating the story. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Visible component
    return (
        <button 
            id="generate-story-button"
            className="bg-bama-crimson text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGenerateStory}
            disabled={loading}
        >
            {loading ? 'Generating...' : 'Generate Story'}
        </button>
    )
}

export default GenerateStoryButton;