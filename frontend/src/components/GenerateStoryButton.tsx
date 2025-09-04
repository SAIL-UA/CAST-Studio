// Import dependencies
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

// Helpers
import { ImageData } from '../types/types';

// Props interface
type GenerateStoryButtonProps = {
    images?: ImageData[];
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Generate story button component
const GenerateStoryButton = ({ images = [], setRightNarrativePatternsOpen, setSelectedPattern, storyLoading, setStoryLoading }: GenerateStoryButtonProps) => {

    // States
    const [AIOpen, setAIOpen] = useState(false);
    const [AIPosition, setAIPosition] = useState({ top: 0, left: 0, width: 0 });

    // Refs
    const AIRef = useRef<HTMLButtonElement>(null);
    const AITimeoutRef = useRef<NodeJS.Timeout | null>(null); // Get direct access to an HTML element from the DOM

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
    const handleAIStoryGeneration = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setSelectedPattern('AI Assistance');
        setStoryLoading(true);
        
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
            setStoryLoading(false);
        }
    }

    // Calculate dropdown position relative to viewport
    const updateAIPosition = () => {
        if (AIRef.current) {
            const rect = AIRef.current.getBoundingClientRect();
            setAIPosition({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    // Handle mouse enter with position update
    const handleAIEnter = () => {
        // Clear any pending close timeout
        if (AITimeoutRef.current) {
            clearTimeout(AITimeoutRef.current);
            AITimeoutRef.current = null;
        }
        setAIOpen(true);
        updateAIPosition();
    };

    // Handle mouse leave with delay
    const handleAILeave = () => {
        AITimeoutRef.current = setTimeout(() => {
            setAIOpen(false);
        }, 150); // 150ms delay
    };

    // Dropdown content to be portaled
    const AIDropdownContent = AIOpen && (
        <div 
            className={`fixed shadow-lg bg-transparent overflow-hidden m-1`}
            style={{ 
                zIndex: 99999,
                top: AIPosition.top,
                left: AIPosition.left,
                minWidth: AIPosition.width
            }}
            onMouseEnter={handleAIEnter}
            onMouseLeave={handleAILeave}
        >
            <button 
                className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAIStoryGeneration}
                disabled={storyLoading}
            >
                Use AI to Select Narrative
            </button>

            <button 
                className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setRightNarrativePatternsOpen(true)}
            >
                    Manually Select Narrative
            </button>
        </div>
    );

    // Visible component
    return (
        <>
            <div className="relative flex items-center justify-between">
                <button 
                    ref={AIRef}
                    id="generate-story-button"
                    className={`flex items-center bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                    onMouseEnter={handleAIEnter}
                    onMouseLeave={handleAILeave}
                    disabled={storyLoading}
                >
                    <span className={`flex items-center justify-center gap-2`}> 
                        {storyLoading ? 'Generating...' : 'Generate Story'}
                        
                        <svg className={`fill-current h-4 w-4 transition-transform duration-300 ease-in ${AIOpen ? 'rotate-180' : 'rotate-0'}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                        </svg>
                    </span>
                </button>
                    
            </div>
            
            {/* Portal the dropdowns to document.body */}
            {typeof document !== 'undefined' && AIDropdownContent && 
                createPortal(AIDropdownContent, document.body)
            }
        </>
    )
}

export default GenerateStoryButton;