// Import dependencies
import { useNavigate } from 'react-router-dom';
import { logAction } from '../utils/userActionLogger';


// Upload button component
const UploadButton = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Handle upload
    const handleUpload = (e: React.MouseEvent) => {
        logAction(e);
        navigate('/construction');
    }

    // Visible component
    return (
        <button id="upload-button"
        log-id="upload-button"
        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleUpload}>
        Upload Visuals
        </button>
    )
}

export default UploadButton;