// Import dependencies
import { useState, useEffect } from 'react';
import { getImageDataAll, updateImageData as updateImageDataAPI } from '../services/api';

// Import components
import Bin from './Bin';
import ClearAllButton from './ClearAllButton';

// Import types
import { ImageData } from '../types/types';

// Define props interface
type RecycleBoardProps = {
    images: ImageData[];
    setImages: React.Dispatch<React.SetStateAction<ImageData[]>>;
    loading: boolean;
    fetchUserData: () => Promise<void>;
    updateImageData: (imageId: string, data: Partial<ImageData>) => void;
    handleImageRecycle: (imageId: string) => void;
    handleImageRestore: (imageId: string) => void;
}

// Trash component (duplicate of Workspace)
const RecycleBoard = ({ images, setImages, loading, fetchUserData, updateImageData, handleImageRecycle, handleImageRestore }: RecycleBoardProps) => {

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
    const handleDelete = async () => {
        await fetchUserData();
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

            {/* Trash Content - Single Trash Bin */}
            <div id="trash-content" className="flex flex-col w-full h-full max-w-full max-h-full mt-4">
                
                {/* Trash Bin */}
                <div className="flex flex-col h-full relative">
                    <Bin
                        id="trash-bin"
                        images={trashImages}
                        updateImageData={updateImageData}
                        onDescriptionsUpdate={handleDescriptionsUpdate}
                        onDelete={handleDelete}
                        onTrash={handleImageRecycle}
                        onUnTrash={handleImageRestore}
                    />
                    {/* ClearAll button - positioned in bottom left */}
                    <ClearAllButton 
                        images={images}
                        setImages={setImages}
                        onClearComplete={async () => {
                            await fetchUserData();
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

export default RecycleBoard;