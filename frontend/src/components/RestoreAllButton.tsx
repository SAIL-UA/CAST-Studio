import React, { useState } from 'react';
import { logAction } from '../utils/userActionLogger';
import { ImageData } from '../types/types';

type RestoreAllButtonProps = {
    images: ImageData[];
    handleImageRestore: (imageId: string) => void;
    onRestoreComplete: () => Promise<void>;
}

const RestoreAllButton = ({ images, handleImageRestore, onRestoreComplete }: RestoreAllButtonProps) => {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [isRestoring, setIsRestoring] = useState<boolean>(false);

    const recycledImages = images.filter(img => img.in_storyboard === false);

    const handleOpenModal = (e: React.MouseEvent) => {
        logAction(e);
        if (recycledImages.length === 0) {
            alert('No images in the recycle bin to restore.');
            return;
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleRestoreAll = async (e: React.MouseEvent) => {
        logAction(e);
        setIsRestoring(true);

        try {
            for (const image of recycledImages) {
                handleImageRestore(image.id);
            }

            await onRestoreComplete();
            setShowModal(false);
        } catch (error) {
            console.error('Error restoring all:', error);
            alert('An error occurred while restoring images.');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <>
            {showModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
                    <div className="relative bg-white rounded-lg shadow-xl p-4 w-[360px] max-w-[90vw]">
                        <div className="mb-3">
                            <div className="text-sm font-semibold mb-2">Restore All Items</div>
                            <div className="text-sm text-gray-600 mb-3">
                                This will restore {recycledImages.length} image(s) back to the storyboard.
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                className="text-sm px-3 py-1 rounded border"
                                onClick={handleCloseModal}
                                disabled={isRestoring}
                            >
                                Cancel
                            </button>
                            <button
                                log-id="restore-all-confirm-button"
                                className="text-sm text-white rounded px-3 py-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                style={{ backgroundColor: '#348b94' }}
                                onClick={handleRestoreAll}
                                disabled={isRestoring}
                            >
                                {isRestoring ? 'Restoring...' : 'Restore All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <button
                log-id="restore-all-button"
                className="w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center gap-1 text-white font-bold text-sm transition-all duration-200"
                style={{
                    cursor: 'pointer',
                    backgroundColor: 'rgba(52, 139, 148, 0.5)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(52, 139, 148, 0.7)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(52, 139, 148, 0.5)';
                }}
                onClick={handleOpenModal}
                title="Restore all to storyboard"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                </svg>
            </button>
        </>
    );
};

export default RestoreAllButton;
