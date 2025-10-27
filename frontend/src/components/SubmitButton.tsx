// Import dependencies
import { useNavigate } from 'react-router-dom';
import { logAction } from '../utils/userActionLogger';


const SubmitButton = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Handle group
    const handleSubmit = (e: React.MouseEvent) => {
        logAction(e);
        // Send request to backend here
        navigate('/construction');
    }

    // Visible component
    return (
        <button id="submit-button"
        log-id="submit-button"
        className="text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleSubmit}>
        Submit
        </button>
    )
}

export default SubmitButton; 