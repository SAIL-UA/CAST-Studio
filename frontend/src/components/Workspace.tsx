// Import dependencies
import { useState } from 'react';
import { logAction } from '../utils/userActionLogger';
import { getImageDataAll, updateImageData as updateImageDataAPI } from '../services/api';
import { ImageData } from '../types/types';

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
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);


    // Handle storyboard selection
    const handleSelectStoryboard = (e: React.MouseEvent) => {
        setRecycleBinSelected(false);
        logAction(e);
    }

    // Handle recycle bin selection
    const handleSelectRecycle = (e: React.MouseEvent) => {
        setRecycleBinSelected(true);
        logAction(e);
    }

    // Fetch user data from backend
    const fetchUserData = async () => {
        await getImageDataAll()
        .then((response: any) => {
            if (response.data.images.length === 0) {
                setImages([]);
                return;
            }
            const fetchedImages = response.data.images.map((img: any, index: number) => ({
                ...img,
                in_storyboard: img.in_storyboard !== undefined ? img.in_storyboard : true,
                x: img.x !== undefined ? img.x : (index % 4) * 160,
                y: img.y !== undefined ? img.y : Math.floor(index / 4) * 120,
                groupId: img.group_id || undefined,
                index: index
            }));
            setImages(fetchedImages);
        })
        .catch((error) => {
            console.error('Error fetching user data:', error);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    // Update image data (position, status, etc.)
    const updateImageData = async (imageId: string, data: Partial<ImageData>) => {
        try {
            const response = await updateImageDataAPI(imageId, data);
            if (response.status === 200) {
                // Update local state
                setImages((prevImages) =>
                    prevImages.map((img) => 
                        img.id === imageId ? { ...img, ...data } : img
                    )
                );
            }
        } catch (error) {
            console.error('Error updating image data:', error);
        }
    };

    // Move image to recycle bin
    const handleImageRecycle = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: false });
    };

    // Restore image from recycle bin
    const handleImageRestore = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: true });
    };

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
                    onClick={handleSelectStoryboard}
                    >
                    Storyboard
                    </button>

                    <button id="story-button"
                    log-id="recycle-bin-button"
                    className={`underline-animate ${recycleBinSelected ? 'active' : ''} mx-3`}
                    onClick={handleSelectRecycle}>
                    Recycle Bin
                    </button>
                </div>
            </div>
            <div className='w-full flex-1 mt-4'>
                {recycleBinSelected ? 
                    <RecycleBoard
                        images={images}
                        setImages={setImages}
                        loading={loading}
                        fetchUserData={fetchUserData}
                        updateImageData={updateImageData}
                        handleImageRecycle={handleImageRecycle}
                        handleImageRestore={handleImageRestore}
                    />
                : 
                    <StoryBoard
                        setRightNarrativePatternsOpen={setRightNarrativePatternsOpen}
                        setSelectedPattern={setSelectedPattern}
                        selectedPattern={selectedPattern}
                        storyLoading={storyLoading}
                        setStoryLoading={setStoryLoading}
                        images={images}
                        setImages={setImages}
                        loading={loading}
                        fetchUserData={fetchUserData}
                        updateImageData={updateImageData}
                        handleImageRecycle={handleImageRecycle}
                        handleImageRestore={handleImageRestore}
                    />
                }
            </div>
        </div>
    )
}


export default Workspace;