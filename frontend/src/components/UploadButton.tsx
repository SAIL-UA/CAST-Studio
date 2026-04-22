// Import dependencies
import React, { useRef, useState } from 'react';
import { uploadFigure, createNote } from '../services/api';
import { logAction, captureActionContext } from '../utils/userActionLogger';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const menuItemClass = "block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm !font-light rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 cursor-pointer outline-none text-left";

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
    const [alertModal, setAlertModal] = useState<string | null>(null);

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
    const handleSubmit = async (e: React.MouseEvent) => {
        if (selectedFiles.length === 0) {
            setAlertModal('Please select at least one file first.');
            return;
        }
        const ctx = captureActionContext(e);

        let successCount = 0;
        let failCount = 0;
        let figDataArr = [];

        for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append('figure', file, file.name);
            formData.append('short_desc', '');
            formData.append('long_desc', '');
            formData.append('source', '');

            try {
                const figResponse = await uploadFigure(formData);
                figDataArr.push(figResponse?.fig_data || null);
                successCount++;
            } catch (err: any) {
                console.error('upload error', err?.response?.status, err?.response?.data || err);
                failCount++;
            }
            logAction(ctx, { "images": figDataArr });
        }

        if (failCount === 0) {
            setAlertModal(`All ${successCount} figure(s) uploaded successfully.`);
        } else {
            setAlertModal(`Upload complete: ${successCount} succeeded, ${failCount} failed.`);
        }

        setShowModal(false);
        setSelectedFiles([]);
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

    // Handle upload from computer
    const handleUploadFromComputer = () => {
        setShowModal(true);
    }

    // Handle import from Jupyter
    const handleImportFromJupyter = () => {
        window.open('https://cast-storystudio.com/jupyterhub', '_blank');
    }

    // Handle add text note
    const handleAddNote = async () => {
        try {
            await createNote();
            if (onUploaded) {
                try { await onUploaded(); } catch {}
            }
        } catch (err) {
            console.error('Error creating note:', err);
            setAlertModal('An error occurred while creating the note.');
        }
    }

    // Visible component
    return (
        <>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button id="upload-button"
                    className="bg-bama-crimson text-sm text-white rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                >
                    <span className="flex items-center justify-center gap-2">
                        Create
                        <svg
                            className="fill-current h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                        </svg>
                    </span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="mt-1 ml-1 shadow-lg z-[400]"
                    sideOffset={4}
                    align="start"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <DropdownMenu.Item
                        className={menuItemClass}
                        log-id="upload-from-computer"
                        onSelect={handleUploadFromComputer}
                    >
                        Upload Visuals from Computer
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        className={menuItemClass}
                        log-id="import-from-jupyter"
                        onSelect={handleImportFromJupyter}
                    >
                        Import Visuals from Jupyter Notebook
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        className={menuItemClass}
                        log-id="add-text-note"
                        onSelect={handleAddNote}
                    >
                        Add Text
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Upload Modal */}
        {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center">
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
                            log-id="upload-submit-button"
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

        {/* Alert Modal */}
        {alertModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                    <div className="text-sm text-grey-darkest whitespace-pre-wrap">
                        {alertModal}
                    </div>
                    <div className="mt-6 text-right">
                        <button
                            log-id="upload-alert-ok-button"
                            onClick={() => setAlertModal(null)}
                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

export default UploadButton;
