// Import dependencies
import React, { useState } from 'react';
import { deleteFigure, deleteGroup, getGroups, getScaffolds, deleteScaffold } from '../services/api';
import { logAction } from '../utils/userActionLogger';
import { ImageData, GroupData, ScaffoldData } from '../types/types';

type ClearAllButtonProps = {
    images: ImageData[];
    onClearComplete: () => Promise<void>;
    setImages?: React.Dispatch<React.SetStateAction<ImageData[]>>;
    setGroupDivs?: React.Dispatch<React.SetStateAction<GroupData[]>>;
    setScaffold?: React.Dispatch<React.SetStateAction<ScaffoldData | null>>;
    setSelectedPattern?: React.Dispatch<React.SetStateAction<string>>;
}

// ClearAll component
const ClearAllButton = ({ images, onClearComplete, setImages, setGroupDivs, setScaffold, setSelectedPattern }: ClearAllButtonProps) => {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [groupCount, setGroupCount] = useState<number>(0);
    const [scaffoldCount, setScaffoldCount] = useState<number>(0);

    // Handle opening the confirmation modal
    const handleOpenModal = async (e: React.MouseEvent) => {
        logAction(e);
        // Fetch group and scaffold counts before showing modal
        try {
            const groups = await getGroups();
            setGroupCount(groups?.length || 0);
        } catch (error) {
            console.error('Error fetching groups:', error);
            setGroupCount(0);
        }
        try {
            const scaffolds = await getScaffolds();
            setScaffoldCount(scaffolds?.length || 0);
        } catch (error) {
            console.error('Error fetching scaffolds:', error);
            setScaffoldCount(0);
        }
        setShowModal(true);
    };

    // Handle closing the modal
    const handleCloseModal = () => {
        setShowModal(false);
    };

    // Handle clearing all images and groups
    const handleClearAll = async (e: React.MouseEvent) => {
        logAction(e);
        setIsDeleting(true);

        try {
            // Delete all scaffolds
            try {
                await deleteScaffold();
            } catch (error) {
                console.error('Error deleting scaffolds:', error);
            }

            // Delete all groups
            const groups = await getGroups();
            if (groups && groups.length > 0) {
                for (const group of groups) {
                    try {
                        await deleteGroup(group.id);
                    } catch (error) {
                        console.error(`Error deleting group ${group.id}:`, error);
                    }
                }
            }

            // Delete all images (both in workspace and recycle bin)
            let successCount = 0;
            let failCount = 0;

            for (const image of images) {
                try {
                    const res = await deleteFigure(image.filepath);
                    if (res.status === 'success') {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    console.error(`Error deleting image ${image.id}:`, error);
                    failCount++;
                }
            }

            // Immediately update state arrays to reflect deletions
            if (setImages) {
                setImages([]);
            }
            if (setGroupDivs) {
                setGroupDivs([]);
            }
            if (setScaffold) {
                setScaffold(null);
            }
            if (setSelectedPattern) {
                setSelectedPattern('');
            }
            // Refresh data from backend to ensure consistency
            await onClearComplete();

            // Show result message
            if (failCount === 0) {
                window.alert(`Successfully deleted all ${successCount} image(s), ${groups?.length || 0} group(s), and ${scaffoldCount} scaffold(s)`);
            } else {
                window.alert(`Deletion complete: ${successCount} image(s) succeeded, ${failCount} failed. ${groups?.length || 0} group(s) and ${scaffoldCount} scaffold(s) deleted.`);
            }

            setShowModal(false);
        } catch (error) {
            console.error('Error clearing all:', error);
            window.alert('An error occurred while clearing all items');
        } finally {
            setIsDeleting(false);
        }
    };

    // Count total items
    const totalImages = images.length;
    const imageCount = totalImages > 0 ? totalImages : 0;

    return (
        <>
            {showModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
                    <div className="relative bg-white rounded-lg shadow-xl p-4 w-[360px] max-w-[90vw]">
                        <div className="mb-3">
                            <div className="text-sm font-semibold mb-2">Clear All Items</div>
                            <div className="text-sm text-gray-600 mb-3">
                                Are you sure you want to permanently delete all images, groups, and scaffolds? This action cannot be undone.
                            </div>
                            <div className="text-sm text-gray-500 mb-3">
                                This will delete:
                                <ul className="list-disc list-inside mt-1 ml-2">
                                    <li>{imageCount} image(s) from workspace and recycle bin</li>
                                    <li>{groupCount} group(s)</li>
                                    <li>{scaffoldCount} scaffold(s)</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                className="text-sm px-3 py-1 rounded border"
                                onClick={handleCloseModal}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                log-id="clear-all-confirm-button"
                                className="bg-red-600 text-sm text-white rounded px-3 py-1 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={handleClearAll}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <button
                log-id="clear-all-button"
                className="absolute bottom-6 left-4 w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center text-white font-bold text-sm transition-all duration-200 z-[350]"
                style={{ 
                    cursor: 'pointer',
                    backgroundColor: 'rgba(0, 92, 132, 0.5)', // bama-crimson #005c84 with 50% opacity
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 92, 132, 0.7)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 92, 132, 0.5)';
                }}
                onClick={handleOpenModal}
                title="Clear all images, groups, and scaffolds"
            >
                Clear All
            </button>
        </>
    );
};

export default ClearAllButton;

