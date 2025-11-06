// Import dependencies
import { useState } from 'react';
import { logAction } from '../utils/userActionLogger';

// Import components
import StoryBoard from './StoryBoard';
import RecycleBoard from './Recycle';

// Define props interface
type WorkspaceProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    selectedPattern: string;
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Workspace component
const Workspace = ({ setRightNarrativePatternsOpen, setSelectedPattern, selectedPattern, storyLoading, setStoryLoading }: WorkspaceProps) => {

    // States
    const [recycleBinSelected, setRecycleBinSelected] = useState(false);


    // Handle storyboard
    const handleStoryboard = (e: React.MouseEvent) => {
        setRecycleBinSelected(false);
        logAction(e);
    }

    const handleRecycleBin = (e: React.MouseEvent) => {
        setRecycleBinSelected(true);
        logAction(e);
    }

    // Visible component
    return (
        <div id="workspace" className="flex flex-col h-full w-full">
            <div id="workspace-header" className="flex w-full h-auto">
                <div id="workspace-header-left" className="flex w-full h-full items-end justify-start">
                    <h3 className="text-2xl">Workspace&nbsp;</h3>
                </div>
                <div id="workspace-header-right" className="flex w-1/2 h-full items-end justify-end gap-2 text-sm">
                <button id="narrative-button"
                    log-id="storyboard-button"
                    className={`underline-animate ${recycleBinSelected ? '' : 'active'} mx-3`}
                    onClick={handleStoryboard}
                    >
                    Storyboard
                    </button>

                    <button id="story-button"
                    log-id="recycle-bin-button"
                    className={`underline-animate ${recycleBinSelected ? 'active' : ''} mx-3`}
                    onClick={handleRecycleBin}>
                    Recycle Bin
                    </button>
                </div>
            </div>
            <div className='w-full flex-1 mt-4'>
                {recycleBinSelected ? 
                    <RecycleBoard />
                : 
                    <StoryBoard setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} setSelectedPattern={setSelectedPattern} selectedPattern={selectedPattern} storyLoading={storyLoading} setStoryLoading={setStoryLoading} />
                }
            </div>
        </div>
    )
}


export default Workspace;