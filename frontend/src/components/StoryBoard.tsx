// Import dependencies
import React, { useState, useEffect } from 'react';
import { getImageDataAll, serveImage, updateImageData as updateImageDataAPI } from '../services/api';

// Import components
import UploadButton from './UploadButton';
import GenerateStoryButton from './GenerateStoryButton';
import GroupButton from './GroupButton';
import Bin from './Bin';

// Import types
import { ImageData } from '../types/types';

// StoryBoard component
const StoryBoard = () => {
    // State management for images
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data from backend
    const fetchUserData = async () => {
        await getImageDataAll()
        .then((response: any) => {
            if (response.data.images.length === 0) {
                setImages([]);
                return;
            } 
            const fetchedImages = response.data.images.map((img: any) => ({
                ...img,
                x: img.in_storyboard ? img.x : 0,
                y: img.in_storyboard ? img.y : 0,
            }));
            setImages(fetchedImages);
        })
        .catch((error) => {
            console.error('Error fetching user data:', error);
            alert('Failed to load user data. Please refresh the page.');
        })
        .finally(() => {
            setLoading(false);
        });
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchUserData();
    }, []);

    // Update image data (position, status, etc.)
    const updateImageData = async (imageId: string, data: Partial<ImageData>) => {
        try {
            await updateImageDataAPI(imageId, data);
            
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
    const workspaceImages = images.filter(img => img.in_storyboard === true).map(img => ({
        ...img,
        image: serveImage(img.filepath)
    }));

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
        <div id="story-board-container" className="flex flex-col w-full h-full">

            {/* Story Board Content - Single Data Story Bin */}
            <div id="story-board-content" className="flex flex-col w-full h-full mt-4">
                <div className="flex flex-col h-full">
                    {/* Data Story Bin */}
                    <div id="story-bin-container" className="flex flex-col h-full w-full bg-white">
                        <div id="story-bin-header" className="flex w-full items-center justify-start p-2">
                            <UploadButton />
                            <GroupButton />
                            <GenerateStoryButton images={workspaceImages} />
                        </div>
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
            </div>
        </div>
    )
}

export default StoryBoard;