// Import dependencies
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


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

    // Navigation helper
    const navigate = useNavigate();

    // Handle button click
    const handleSelectNarrative = async (value: string) => {
        setSelectedPattern(value);
        setStoryLoading(true);

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

        setStoryLoading(false);
    }

    return (
        <button
        className='bg-white rounded-full mt-2 px-2 py-0 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200'
        onClick={() => handleSelectNarrative(value)}
        onDoubleClick={() => navigate(`/construction`)}>
            <p className='text-sm font-roboto-light'>Select</p>
        </button>
    )
}

export default SelectNarrativeButton;