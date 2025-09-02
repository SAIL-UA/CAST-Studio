// Import dependencies
import { useNavigate } from 'react-router-dom';



// Upload button component
const UploadButton = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Handle upload
    const handleUpload = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Send request to backend here
        navigate('/construction');
    }

    // Visible component
    return (
        <button id="upload-button"
        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleUpload}>
        Upload
        </button>
    )
}

export default UploadButton;