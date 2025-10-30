// Import dependencies
import { useState, useEffect } from 'react';
import { getImageDataAll, updateImageData as updateImageDataAPI, serveImage } from '../services/api';


// Import components
import StoryBoard from './StoryBoard';
import RecycleBoard from './Recycle';
import UploadButton from './UploadButton';
import GroupButton from './GroupButton';
import GenerateStoryButton from './GenerateStoryButton';
import CraftStoryButton from './CraftStoryButton';
import FeedbackButton from './FeedbackButton';
import SubmitButton from './SubmitButton';

// Import types
import { ImageData, GroupData } from '../types/types';

// Define props interface
type WorkspaceProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Workspace component
const Workspace = ({ setRightNarrativePatternsOpen, setSelectedPattern, storyLoading, setStoryLoading }: WorkspaceProps) => {

    // States
    const [recycleBinSelected, setRecycleBinSelected] = useState(false);
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data from backend
    const fetchUserData = async () => {
        try {
            const response: any = await getImageDataAll();
            if (!response?.data?.images || response.data.images.length === 0) {
                setImages([]);
                return;
            }

            const fetchedImages: ImageData[] = response.data.images.map((img: any) => ({
                ...img,
                x: img.in_storyboard ? img.x : 0,
                y: img.in_storyboard ? img.y : 0,
            }));

            // Validate each image actually exists on backend; drop missing
            const validationResults = await Promise.all(
                fetchedImages.map(async (img) => {
                    try {
                        const url = await serveImage(img.filepath);
                        return url ? img : null;
                    } catch {
                        return null;
                    }
                })
            );

            const validImages = validationResults.filter((v): v is ImageData => v !== null);
            setImages(validImages);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setImages([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update image data (position, status, etc.)
    const updateImageData = async (imageId: string, data: Partial<ImageData>) => {
        try {
            const response = await updateImageDataAPI(imageId, data);
            if (response.status === 200) {
                setImages((prevImages) =>
                    prevImages.map((img) =>
                        img.id === imageId ? { ...img, ...data } : img
                    )
                );
            } else {
                console.error('Error updating image data:', response.data?.errors);
            }
        } catch (error) {
            console.error('Error updating image data:', error);
        }
    };

    // Centralized handlers
    const handleDelete = (imageId: string) => {
        // Optimistically remove from images; component-specific cleanup (e.g., groups) happens locally
        setImages(prev => prev.filter(img => img.id !== imageId));
    };

    const handleTrash = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: false });
    };

    const handleUnTrash = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: true });
    };


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
            <div id="workspace-header" className="flex w-full h-auto">
                <div id="workspace-header-left" className="flex w-full h-full items-end justify-start">
                    <h3 className="text-2xl">Workspace&nbsp;</h3>
                </div>
                <div id="workspace-header-right" className="flex w-1/2 h-full items-end justify-end gap-2 text-sm">
                <button id="narrative-button"
                    className={`underline-animate ${recycleBinSelected ? '' : 'active'} mx-3`}
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
            <div className='w-full flex-1 mt-4'>
                {recycleBinSelected ? 
                    <RecycleBoard 
                        images={images}
                        setImages={setImages}
                        loading={loading}
                        updateImageData={updateImageData}
                        onDelete={handleDelete}
                        onTrash={handleTrash}
                        onUnTrash={handleUnTrash}
                    />
                : 
                    <StoryBoard 
                        images={images}
                        setImages={setImages}
                        loading={loading}
                        updateImageData={updateImageData}
                        onDelete={handleDelete}
                        onTrash={handleTrash}
                        onUnTrash={handleUnTrash}
                        onRefreshImages={fetchUserData}
                        setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} 
                        setSelectedPattern={setSelectedPattern} 
                        storyLoading={storyLoading} 
                        setStoryLoading={setStoryLoading} 
                    />
                }
            </div>
        </div>
    )
}


export default Workspace;