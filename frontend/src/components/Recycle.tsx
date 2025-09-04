// Import dependencies
import React, { useState, useEffect } from 'react';
import { getImageDataAll, updateImageData as updateImageDataAPI } from '../services/api';

// Import components
import Bin from './Bin';

// Import types
import { ImageData } from '../types/types';

// Trash component (duplicate of Workspace)
const Trash = () => {
    // State management for images
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data from backend
    const fetchUserData = async () => {
        try {
            const response = await getImageDataAll();
            if (response.data.images.length === 0) {
                setImages([]);
                return;
            }
            const fetchedImages = response.data.images.map((img: any, index: number) => ({
                ...img,
                // Keep original in_storyboard status for trash (don't override)
                in_storyboard: img.in_storyboard !== undefined ? img.in_storyboard : false,
                // Initialize positions for new images that don't have coordinates
                x: img.x !== undefined ? img.x : (index % 4) * 160,
                y: img.y !== undefined ? img.y : Math.floor(index / 4) * 120,
            }));
            setImages(fetchedImages);
            
            console.log('Loaded images for trash view');
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
            const response = await updateImageDataAPI(imageId, data);

            if (response.status === 200) {
                console.log('Image data updated successfully');
                // Update local state
                setImages((prevImages) =>
                    prevImages.map((img) => 
                        img.id === imageId ? { ...img, ...data } : img
                    )
                );
            } else {
                console.error('Error updating image data:', response.data.errors);
            }
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

    // Show only images that are NOT in the storyboard (in_storyboard === false)
    const trashImages = images.filter(img => img.in_storyboard === false);

    // Loading state
    if (loading) {
        return (
            <div id="trash-container" className="flex flex-col w-full h-full mt-4 bg-white">
                <div className="flex items-center justify-center h-full">
                    <div className="text-lg text-grey-darkest">Loading Recycle Bin...</div>
                </div>
            </div>
        );
    }

    // Visible component
    return (
        <div id="trash-container" className="flex flex-col w-full h-full">

            {/* Trash Content - Single Data Story Bin */}
            <div id="trash-content" className="flex flex-col w-full h-full mt-4">
                
                {/* Data Story Bin */}
                <div className="flex flex-col h-full">
                    <Bin
                        id="trash-bin"
                        images={trashImages}
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
    )
}

export default Trash;