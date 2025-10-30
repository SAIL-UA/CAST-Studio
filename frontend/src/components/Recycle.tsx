// Import dependencies
import React from 'react';

// Import components
import Bin from './Bin';

// Import types
import { ImageData } from '../types/types';

type RecycleProps = {
    images: ImageData[];
    setImages: React.Dispatch<React.SetStateAction<ImageData[]>>;
    loading: boolean;
    updateImageData: (imageId: string, data: Partial<ImageData>) => Promise<any> | void;
    onDelete: (imageId: string) => void;
    onTrash: (imageId: string) => void;
    onUnTrash: (imageId: string) => void;
}

// Trash component (duplicate of Workspace)
const Trash = ({ images, setImages, loading, updateImageData, onDelete, onTrash, onUnTrash }: RecycleProps) => {

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

    // Handle image deletion: centralized in parent
    const handleDelete = (imageId: string) => {
        onDelete(imageId);
    };

    // Handle image trash
    const handleTrash = (imageId: string) => {
        onTrash(imageId);
    };

    // Handle image untrash
    const handleUnTrash = (imageId: string) => {
        onUnTrash(imageId);
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