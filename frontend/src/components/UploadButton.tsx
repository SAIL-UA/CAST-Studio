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

    // Selected file state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    }

    // Handle actual upload on submit
    const handleSubmit = async () => {
        if (!selectedFile) {
            window.alert('Please select a file first');
            return;
        }

        const formData = new FormData();
        // Include filename to help some backends/content sniffers
        formData.append('figure', selectedFile, selectedFile.name);
        // Use placeholder metadata
        formData.append('short_desc', shortDesc);
        formData.append('source', source);

        try {
            await uploadFigure(formData);
            window.alert('Figure uploaded successfully');
            setShowModal(false);
            setSelectedFile(null);
            // Reset input so the same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (onUploaded) {
                try { await onUploaded(); } catch {}
            }
        } catch (err: any) {
            console.error('upload error', err?.response?.status, err?.response?.data || err);
            window.alert(`Failed to upload figure: ${err?.response?.status || ''} ${err?.response?.data ? JSON.stringify(err.response.data) : ''}`);
        }
    }

    // Close modal and reset
    const handleCancel = () => {
        setShowModal(false);
        setSelectedFile(null);
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
                    <div className="text-sm font-semibold mb-2">Upload Image</div>
                    {selectedFile ? (
                        <div className="mb-3">
                            <div className="text-sm text-gray-600 mb-1">Selected file:</div>
                            <div className="text-sm font-medium">{selectedFile.name}</div>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 mb-3">No file selected</div>
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
                    >{selectedFile ? 'Change File' : 'Select File'}</button>
                    {selectedFile && (
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