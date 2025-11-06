// Import dependencies
import React, { useRef, useState } from 'react';
import { uploadFigure } from '../services/api';

type UploadButtonProps = {
    onUploaded?: () => void | Promise<void>;
}

// Upload button component
const UploadButton = ({ onUploaded }: UploadButtonProps) => {
    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Selected files state
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [showModal, setShowModal] = useState<boolean>(false);

    // Default metadata values
    const shortDesc = "Placeholder short description";
    const source = "Placeholder source";

    // Trigger file picker
    const handleUpload = () => {
        setShowModal(true);
    }

    // Handle file selection (does not upload yet)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    }

    // Remove a file from the list
    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }

    // Handle actual upload on submit
    const handleSubmit = async () => {
        if (selectedFiles.length === 0) {
            window.alert('Please select at least one file first');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        // Loop through each file and upload
        for (const file of selectedFiles) {
            const formData = new FormData();
            // Include filename to help some backends/content sniffers
            formData.append('figure', file, file.name);
            // Use placeholder metadata
            formData.append('short_desc', shortDesc);
            formData.append('source', source);

            try {
                await uploadFigure(formData);
                successCount++;
            } catch (err: any) {
                console.error('upload error', err?.response?.status, err?.response?.data || err);
                failCount++;
            }
        }

        // Show result message
        if (failCount === 0) {
            window.alert(`All ${successCount} figure(s) uploaded successfully`);
        } else {
            window.alert(`Upload complete: ${successCount} succeeded, ${failCount} failed`);
        }

        setShowModal(false);
        setSelectedFiles([]);
        // Reset input so the same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onUploaded) {
            try { await onUploaded(); } catch {}
        }
    }

    // Close modal and reset
    const handleCancel = () => {
        setShowModal(false);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    // Visible component
    return (
        <>
        {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
            <div className="relative bg-white rounded-lg shadow-xl p-4 w-[360px] max-w-[90vw]">
                <div className="mb-3">
                    <div className="text-sm font-semibold mb-2">Upload Images</div>
                    {selectedFiles.length > 0 ? (
                        <div className="mb-3 max-h-48 overflow-y-auto">
                            <div className="text-sm text-gray-600 mb-2">Selected files:</div>
                            <div className="space-y-1">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                        <span className="font-medium truncate flex-1 mr-2">{file.name}</span>
                                        <button
                                            className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                                            onClick={() => handleRemoveFile(index)}
                                            title="Remove file"
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 mb-3">No files selected</div>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        className="text-sm px-3 py-1 rounded border"
                        onClick={handleCancel}
                    >Cancel</button>
                    <button
                        className="bg-gray-500 text-sm text-white rounded px-3 py-1"
                        onClick={() => fileInputRef.current?.click()}
                    >{selectedFiles.length > 0 ? 'Add More Files' : 'Select Files'}</button>
                    {selectedFiles.length > 0 && (
                        <button
                            className="bg-bama-crimson text-sm text-white rounded px-3 py-1"
                            onClick={handleSubmit}
                        >Upload</button>
                    )}
                </div>
            </div>
        </div>
        )}
        <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
        />
        <button id="upload-button"
        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleUpload}>
        Upload Visuals
        </button>
        </>
    )
}

export default UploadButton;