// Import dependencies
import { useNavigate } from 'react-router-dom';


const FeedbackButton = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Handle group
    const handleFeedback = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Send request to backend here
        navigate('/construction');
    }

    // Visible component
    return (
        <button id="feedback-button"
        className="bg-red-400 text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleFeedback}>
        Request Feedback
        </button>
    )
}

export default FeedbackButton; 