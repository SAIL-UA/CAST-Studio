// Import dependencies
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Import components
import UploadButton from './UploadButton';
import GenerateStoryButton from './GenerateStoryButton';
import GroupButton from './GroupButton';
import Bin from './Bin';

// Import types
import { ImageData } from '../types/types';
import FeedbackButton from './FeedbackButton';
import SubmitButton from './SubmitButton';

// Define props interface
type StoryBoardProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// StoryBoard component
const StoryBoard = ({ setRightNarrativePatternsOpen, setSelectedPattern, storyLoading, setStoryLoading }: StoryBoardProps) => {
    // State management for images
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data from backend
    const fetchUserData = async () => {
        try {
            const response = await axios.get('/get_user_data', { withCredentials: true });
            const fetchedImages = response.data.images.map((img: any, index: number) => ({
                ...img,
                // Keep the in_storyboard value from the backend
                in_storyboard: img.in_storyboard !== undefined ? img.in_storyboard : true,
                // Initialize positions for new images that don't have coordinates
                x: img.x !== undefined ? img.x : (index % 4) * 160,
                y: img.y !== undefined ? img.y : Math.floor(index / 4) * 120,
            }));
            setImages(fetchedImages);
            
            // Update backend with in_storyboard status for all images (sequential to avoid race conditions)
            console.log(`Updating ${fetchedImages.length} images with in_storyboard=true...`);
            for (const img of fetchedImages) {
                try {
                    console.log(`Updating image ${img.id} with in_storyboard=true`);
                    const updateResponse = await axios.post(
                        '/update_image_data',
                        { 
                            id: img.id, 
                            in_storyboard: img.in_storyboard !== undefined ? img.in_storyboard : true,
                            x: img.x,
                            y: img.y
                        },
                        { withCredentials: true }
                    );
                    console.log(`Successfully updated image ${img.id}:`, updateResponse.data);
                } catch (err) {
                    console.error(`Error updating image ${img.id}:`, err);
                }
            }
            console.log('Finished updating all images with in_storyboard=true');
            
            // Verify the updates worked by fetching data again
            console.log('Verifying backend updates...');
            try {
                const verifyResponse = await axios.get('/get_user_data', { withCredentials: true });
                const verifiedImages = verifyResponse.data.images;
                const storyboardImages = verifiedImages.filter((img: any) => img.in_storyboard);
                console.log(`Verification: ${storyboardImages.length}/${verifiedImages.length} images have in_storyboard=true`);
                
                if (storyboardImages.length === 0) {
                    console.error('WARNING: No images have in_storyboard=true after updates!');
                } else {
                    console.log('✓ Backend updates successful');
                }
            } catch (error) {
                console.error('Error verifying backend updates:', error);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchUserData();
    }, []);

    // Update image data (position, status, etc.)
    const updateImageData = async (imageId: string, data: Partial<ImageData>) => {
        try {
            await axios.post(
                '/update_image_data', 
                { id: imageId, ...data }, 
                { withCredentials: true }
            );
            
            // Update local state
            setImages((prevImages) =>
                prevImages.map((img) => 
                    img.id === imageId ? { ...img, ...data } : img
                )
            );
        } catch (error) {
            console.error('Error updating image data:', error);
        }
    };

    // Handle description updates
    const handleDescriptionsUpdate = (id: string, newShortDesc: string, newLongDesc: string) => {
        setImages((prevImages) =>
            prevImages.map((img) =>
                img.id === id
                    ? { ...img, short_desc: newShortDesc, long_desc: newLongDesc }
                    : img
            )
        );
    };

    // Handle image deletion
    const handleDelete = () => {
        fetchUserData(); // Refresh data after deletion
    };

    // Handle image trash
    const handleTrash = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: false });
    };

    // Handle image untrash
    const handleUnTrash = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: true });
    };

    // Show only images that are in the storyboard (in_storyboard === true)
    const workspaceImages = images.filter(img => img.in_storyboard === true);

    // Loading state
    if (loading) {
        return (
            <div id="story-board-container" className="flex flex-col w-full h-full mt-4 bg-white">
                <div className="flex items-center justify-center h-full bg-white">
                    <div className="text-lg text-grey-darkest">Loading Story Board...</div>
                </div>
            </div>
        );
    }

    // Visible component
    return (
        <div id="story-board-container" className="flex flex-col h-full w-full bg-white">
            <div id="story-bin-header" className="flex w-full flex-0 items-center justify-start p-2 flex-shrink-0">
                <UploadButton />
                <GroupButton />
                <GenerateStoryButton images={workspaceImages} setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} setSelectedPattern={setSelectedPattern} storyLoading={storyLoading} setStoryLoading={setStoryLoading} />
                <FeedbackButton />
                <SubmitButton />
            </div>
            <div id = "story-bin-wrapper" className="flex-1 min-h-0">
                <Bin
                    id="story-bin"
                    images={workspaceImages}
                    updateImageData={updateImageData}
                    onDescriptionsUpdate={handleDescriptionsUpdate}
                    onDelete={handleDelete}
                    onTrash={handleTrash}
                    onUnTrash={handleUnTrash}
                    isSuggestedOrderBin={false}
                />
            </div>
        </div>
    )
}

export default StoryBoard;