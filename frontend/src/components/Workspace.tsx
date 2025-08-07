// Import dependencies
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Import components
import UploadButton from './UploadButton';
import GenerateStoryButton from './GenerateStoryButton';
import Bin from './Bin';

// Import types
import { ImageData } from '../types/types';

// Workspace component
const Workspace = () => {
    // State management for images
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data from backend
    const fetchUserData = async () => {
        try {
            const response = await axios.get('/get_user_data', { withCredentials: true });
            const fetchedImages = response.data.images.map((img: any, index: number) => ({
                ...img,
                // Set all images as in_storyboard: true for story generation
                in_storyboard: true,
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
                            in_storyboard: true,
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

    // Show all images in the story bin for now
    const allImages = images;

    // Loading state
    if (loading) {
        return (
            <div id="workspace-container" className="flex flex-col w-full h-full">
                <div className="flex items-center justify-center h-full">
                    <div className="text-lg text-gray-600">Loading workspace...</div>
                </div>
            </div>
        );
    }

    // Visible component
    return (
        <div id="workspace-container" className="flex flex-col w-full h-full">
            
            {/* Header */}
            <div id="workspace-header" className="flex h-1/5 w-full">
                <div id="workspace-header-left" className="flex w-full h-full items-end justify-start">
                    <h3 className="text-3xl">Workspace</h3>
                </div>
                <div id="workspace-header-right" className="flex w-1/2 h-full items-end justify-end gap-2">
                    <UploadButton />
                    <GenerateStoryButton images={images} />
                </div>
            </div>

            {/* Workspace Content - Single Data Story Bin */}
            <div id="workspace-content" className="flex flex-col w-full h-4/5 mt-4">
                
                {/* Data Story Bin */}
                <div className="flex flex-col h-full">
                    <div className="mb-2">
                        <p className="font-semibold text-gray-700">
                            ({allImages.length} images)
                        </p>
                    </div>
                    <Bin
                        id="story-bin"
                        images={allImages}
                        updateImageData={updateImageData}
                        onDescriptionsUpdate={handleDescriptionsUpdate}
                        onDelete={handleDelete}
                        isSuggestedOrderBin={false}
                    />
                </div>
            </div>
        </div>
    )
}

export default Workspace;