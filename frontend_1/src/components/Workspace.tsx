// Import dependencies
import { useNavigate } from 'react-router-dom';

// Import components
import UploadButton from './UploadButton';
import GenerateStoryButton from './GenerateStoryButton';

// Workspace component
const Workspace = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Visible component
    return (
        <div id="workspace-container" className="flex flex-col w-full h-full">
            
            {/* Header */}
            <div id="workspace-header" className="flex h-1/5 w-full">
                <div id="workspace-header-left" className="flex w-full h-full items-end justify-start">
                    <h3 className="text-3xl">Workspace</h3>
                </div>
                <div id="workspace-header-right" className="flex w-1/2 h-full items-end justify-end">
                    <UploadButton />
                    <GenerateStoryButton />
                </div>
            </div>

            {/* Workspace */}
            <div id="workspace-content" className="flex w-full h-4/5 mt-4 bg-white">
                
            </div>




        </div>
    )
}

export default Workspace;