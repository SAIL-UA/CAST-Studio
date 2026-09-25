// Import dependencies
import React, { useState } from 'react';
import { updateImageData, deleteGroup, getGroups, getScaffolds, deleteScaffold } from '@/services/api';
import { logAction } from '@/utils/userActionLogger';
import type { ImageData, GroupData, ScaffoldData } from '@/types/types';

type ClearAllButtonProps = {
    images: ImageData[];
    onClearComplete: () => Promise<void>;
    setImages?: React.Dispatch<React.SetStateAction<ImageData[]>>;
    setGroupDivs?: React.Dispatch<React.SetStateAction<GroupData[]>>;
    setScaffolds?: React.Dispatch<React.SetStateAction<ScaffoldData[]>>;
    setSelectedPattern?: React.Dispatch<React.SetStateAction<string>>;
}

// ClearAll component
const ClearAllButton = ({ images, onClearComplete, setImages, setGroupDivs, setScaffolds, setSelectedPattern }: ClearAllButtonProps) => {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [isClearing, setIsClearing] = useState<boolean>(false);
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

    // Handle clearing all: delete groups/scaffolds and move images to recycle bin
    const handleClearAll = async (e: React.MouseEvent) => {
        logAction(e);
        setIsClearing(true);

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

            // Move all images to recycle bin (set in_storyboard to false)
            let successCount = 0;
            let failCount = 0;

            for (const image of images) {
                try {
                    await updateImageData(image.id, { in_storyboard: false });
                    successCount++;
                } catch (error) {
                    console.error(`Error moving image ${image.id} to recycle bin:`, error);
                    failCount++;
                }
            }

            // Immediately update state arrays to reflect changes
            if (setImages) {
                // Update images to mark them as moved to recycle bin
                setImages(prev => prev.map(img => ({ ...img, in_storyboard: false })));
            }
            if (setGroupDivs) {
                setGroupDivs([]);
            }
            if (setScaffolds) {
                setScaffolds([]);
            }
            if (setSelectedPattern) {
                setSelectedPattern('');
            }
            // Refresh data from backend to ensure consistency
            await onClearComplete();

            // Show result message
            if (failCount === 0) {
                window.alert(`Successfully moved ${successCount} image(s) to recycle bin, deleted ${groups?.length || 0} group(s), and ${scaffoldCount} scaffold(s)`);
            } else {
                window.alert(`Clear complete: ${successCount} image(s) moved to recycle bin, ${failCount} failed. ${groups?.length || 0} group(s) and ${scaffoldCount} scaffold(s) deleted.`);
            }

            setShowModal(false);
        } catch (error) {
            console.error('Error clearing all:', error);
            window.alert('An error occurred while clearing all items');
        } finally {
            setIsClearing(false);
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
                                This will move all images to the recycle bin and permanently delete all groups and scaffolds. Groups and scaffolds cannot be recovered.
                            </div>
                            <div className="text-sm text-gray-500 mb-3">
                                This will:
                                <ul className="list-disc list-inside mt-1 ml-2">
                                    <li>Move {imageCount} image(s) to recycle bin</li>
                                    <li>Permanently delete {groupCount} group(s)</li>
                                    <li>Permanently delete {scaffoldCount} scaffold(s)</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                className="text-sm px-3 py-1 rounded border"
                                onClick={handleCloseModal}
                                disabled={isClearing}
                            >
                                Cancel
                            </button>
                            <button
                                log-id="clear-all-confirm-button"
                                className="bg-red-600 text-sm text-white rounded px-3 py-1 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={handleClearAll}
                                disabled={isClearing}
                            >
                                {isClearing ? 'Clearing...' : 'Clear All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <button
                log-id="clear-all-button"
                className="w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center gap-1 text-white font-bold text-sm transition-all duration-200"
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
                title="Clear All"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h6l7.5-7.5a2.12 2.12 0 00-3-3L6 14v3zM12.5 6.5l3 3M21 21H3" />
                </svg>
            </button>
        </>
    );
};

export default ClearAllButton;
