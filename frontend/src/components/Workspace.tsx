// Import dependencies
import { useState } from 'react';

// Import components
import StoryBoard from './StoryBoard';
import RecycleBoard from './Recycle';

// Workspace component
const Workspace = () => {

    // States
    const [recycleBinSelected, setRecycleBinSelected] = useState(false);


    // Handle storyboard
    const handleStoryboard = () => {
        setRecycleBinSelected(false);
    }

    const handleRecycleBin = () => {
        setRecycleBinSelected(true);
    }

    // Visible component
    return (
        <div id="workspace" className="flex flex-col h-full w-full">
            <div id="workspace-header" className="flex w-full">
                <div id="workspace-header-left" className="flex w-full h-full items-end justify-start">
                    <h3 className="text-2xl">Workspace</h3>
                </div>
                <div id="workspace-header-right" className="flex w-1/2 h-full items-end justify-end gap-2 text-sm">
                <button id="narrative-button"
                    className={`underline-animate ${recycleBinSelected ? 'active' : ''} mx-3`}
                    onClick={handleStoryboard}
                    >
                    Storyboard
                    </button>

                    <button id="story-button"
                    className={`underline-animate ${recycleBinSelected ? 'active' : ''} mx-3`}
                    onClick={handleRecycleBin}>
                    Recycle Bin
                    </button>
                </div>
            </div>
            <div className='w-full h-full mt-4'>
                {recycleBinSelected ? 
                    <RecycleBoard />
                : 
                    <StoryBoard />}
            </div>
        </div>
    )
}


export default Workspace;