// Import dependencies
import React, { useRef, useState } from 'react';
import { uploadFigure } from '../services/api';

// Upload button component
const UploadButton = () => {
    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Optional metadata
    const [shortDesc, setShortDesc] = useState<string>("");
    const [source, setSource] = useState<string>("");
    const [showModal, setShowModal] = useState<boolean>(false);

    // Trigger file picker
    const handleUpload = () => {
        setShowModal(true);
    }

    // Handle file selection and upload
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        // Include filename to help some backends/content sniffers
        formData.append('figure', file, file.name);
        // Optional metadata fields
        formData.append('short_desc', shortDesc || "");
        formData.append('source', source || "");

        try {
            await uploadFigure(formData);
            window.alert('Figure uploaded successfully');
            setShowModal(false);
            setShortDesc("");
            setSource("");
        } catch (err: any) {
            console.error('upload error', err?.response?.status, err?.response?.data || err);
            window.alert(`Failed to upload figure: ${err?.response?.status || ''} ${err?.response?.data ? JSON.stringify(err.response.data) : ''}`);
        } finally {
            // Reset input so the same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    // Visible component
    return (
        <>
        {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl p-4 w-[360px] max-w-[90vw]">
                <div className="mb-3">
                    <div className="text-sm font-semibold mb-1">Upload details</div>
                    <input
                        type="text"
                        placeholder="Short description"
                        value={shortDesc}
                        onChange={(e) => setShortDesc(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm mb-2"
                    />
                    <input
                        type="text"
                        placeholder="Source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        className="text-sm px-3 py-1 rounded border"
                        onClick={() => setShowModal(false)}
                    >Cancel</button>
                    <button
                        className="bg-bama-crimson text-sm text-white rounded px-3 py-1"
                        onClick={() => fileInputRef.current?.click()}
                    >Select File</button>
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
        Upload
        </button>
        </>
    )
}

export default UploadButton;