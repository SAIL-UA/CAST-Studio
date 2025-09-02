// Import dependencies
import { useNavigate } from 'react-router-dom';


const SubmitButton = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Handle group
    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Send request to backend here
        navigate('/construction');
    }

    // Visible component
    return (
        <button id="submit-button"
        className="bg-green-400 text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleSubmit}>
        Submit
        </button>
    )
}

export default SubmitButton; 