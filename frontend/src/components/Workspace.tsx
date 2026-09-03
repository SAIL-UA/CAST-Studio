// Import dependencies
import { useEffect, useState } from 'react';
import { getImageDataAll, updateImageData as updateImageDataAPI } from '../services/api';
import type { ImageData } from '../types/types';
import { getImageUrl } from '../utils/imageUtils';

// Import components
import StoryBoard from './StoryBoard';

// Define props interface
type WorkspaceProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    selectedPattern: string;
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    readOnly?: boolean;
    targetUser?: string;
    readOnlyToolbar?: React.ReactNode;
    refreshTrigger?: number;
    onSessionChange?: (shareToken: string | null) => void;
    hideToolbar?: boolean;
}

// Workspace component
const Workspace = ({ setRightNarrativePatternsOpen, setSelectedPattern, selectedPattern, storyLoading, setStoryLoading, readOnly = false, targetUser, readOnlyToolbar, refreshTrigger, onSessionChange, hideToolbar = false }: WorkspaceProps) => {

    // States
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data from backend
    const fetchUserData = async () => {
        await getImageDataAll(targetUser)
        .then((response: any) => {
            const images = response.data?.images;
            if (!images || images.length === 0) {
                setImages([]);
            }
            else {
                // Use indices from backend - they're already assigned correctly
                const fetchedImages = response.data.images.map((img: any) => {
                    const index = img.index !== undefined && img.index !== null ? img.index : 0;
                    
                    return {
                        ...img,
                        in_storyboard: img.in_storyboard !== undefined ? img.in_storyboard : true,
                        x: img.x !== undefined ? img.x : (index % 4) * 160,
                        y: img.y !== undefined ? img.y : Math.floor(index / 4) * 120,
                        groupId: img.group_id || undefined,
                        scaffoldId: img.scaffold_id || undefined,  // Transform snake_case to camelCase to match types.ts
                        scaffold_group_number: img.scaffold_group_number || undefined,  // Keep snake_case to match types.ts
                        url: getImageUrl(img.filepath),
                        index: index
                    };
                });
                setImages(fetchedImages);
            }
        })
        .catch((error) => {
            console.error('Error fetching user data:', error);
        })
        .finally(() => {
            setLoading(false);
            // Single chokepoint for card additions/removals — uploads and notes reach here via
            // UploadButton's onUploaded, plus mount, refreshTrigger and post-story-generation.
            // The research questions panel listens so its link checklist stays current.
            window.dispatchEvent(new CustomEvent('workspaceCardsChanged'));
        });
    };

    // Refresh workspace images after async backend jobs (e.g., story generation)
    const refreshImageDataAfterStoryGeneration = async () => {
        await fetchUserData();
    };

    // Update image data (position, status, etc.)
    const updateImageData = async (imageId: string, data: Partial<ImageData>) => {
        try {
            // Transform camelCase to snake_case for API call (backend expects snake_case)
            const apiData: any = { ...data };
            if ('scaffoldId' in apiData) {
                apiData.scaffold_id = apiData.scaffoldId;
                delete apiData.scaffoldId;
            }
            if ('groupId' in apiData) {
                apiData.group_id = apiData.groupId;
                delete apiData.groupId;
            }
            
            const response = await updateImageDataAPI(imageId, apiData);
            if (response.status === 200) {
                // Use server-returned last_saved if available
                const serverData = response.data?.image_data;
                const mergeData = serverData?.last_saved
                    ? { ...data, last_saved: serverData.last_saved }
                    : data;
                // Update local state with camelCase field names (matching types.ts)
                setImages((prevImages) =>
                    prevImages.map((img) =>
                        img.id === imageId ? { ...img, ...mergeData, index: img.index } : img
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

    // On component mount, fetch user data
    useEffect(() => {
        fetchUserData();
    }, []);

    // Refetch when refreshTrigger changes (from WebSocket workspace_update)
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            fetchUserData();
        }
    }, [refreshTrigger]);

    // Visible component
    return (
        <div id="workspace" className="flex flex-col h-full w-full">
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
                refreshImageDataAfterStoryGeneration={refreshImageDataAfterStoryGeneration}
                updateImageData={readOnly ? (imageId: string, data: Partial<ImageData>) => {
                    // In readOnly mode, only allow position updates for instructor notes
                    const img = images.find(i => i.id === imageId);
                    if (img?.source === 'instructor') {
                        updateImageData(imageId, data);
                    }
                } : updateImageData}
                handleImageRecycle={readOnly ? () => {} : handleImageRecycle}
                handleImageRestore={readOnly ? () => {} : handleImageRestore}
                readOnly={readOnly}
                targetUser={targetUser}
                readOnlyToolbar={readOnlyToolbar}
                refreshTrigger={refreshTrigger}
                onSessionChange={onSessionChange}
                hideToolbar={hideToolbar}
            />
        </div>
    )
}


export default Workspace;