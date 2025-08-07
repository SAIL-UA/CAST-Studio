// Import dependencies
import { useNavigate } from 'react-router-dom';


// Generate story button component
const GenerateStoryButton = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Handle generate story
    const handleGenerateStory = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Send request to backend here
        navigate('/construction');
    }

    // Visible component
    return (
        <button id="generate-story-button"
        className="bg-bama-crimson text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleGenerateStory}>
        Generate Story
        </button>
    )
}

export default GenerateStoryButton;