// Import dependencies
import React, { useRef, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { uploadFigure, uploadSlides, createNote } from "@/services/api";
import { useAlert } from "@/contexts/Alert";
import { logAction } from "@/utils/userActionLogger";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Plus, ChevronDown, X } from "lucide-react";

type UploadButtonProps = {
	onUploaded?: () => void | Promise<void>;
	targetUser?: string;
};

// Upload button component
const UploadButton = ({ onUploaded, targetUser }: UploadButtonProps) => {
	const { showAlert } = useAlert();
	// Hidden file input ref
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Selected files state
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [showModal, setShowModal] = useState<boolean>(false);

	// Handle file selection (does not upload yet)
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			const newFiles = Array.from(files);
			setSelectedFiles((prev) => [...prev, ...newFiles]);
		}
	};

	// Remove a file from the list
	const handleRemoveFile = (index: number) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	// Handle actual upload on submit
	const handleSubmit = async () => {
		if (selectedFiles.length === 0) {
			showAlert({ level: "warning", message: "Please select at least one file first." });
			return;
		}

		// Check for PPTX files
		const pptxFiles = selectedFiles.filter((f) => f.name.toLowerCase().endsWith(".pptx"));
		const imageFiles = selectedFiles.filter((f) => !f.name.toLowerCase().endsWith(".pptx"));

		let successCount = 0;
		let failCount = 0;
		let figDataArr = [];

		// Handle PPTX files
		for (const file of pptxFiles) {
			try {
				const result = await uploadSlides(file);
				successCount += result.slides?.length || 0;
				logAction(
					{ actionType: "click", elementId: "upload-slides" },
					{ filename: file.name, slides_imported: result.slides?.length },
				);
			} catch (err: any) {
				console.error(
					"slide upload error",
					err?.response?.status,
					err?.response?.data || err,
				);
				const msg = err?.response?.data?.message || "Slide upload failed";
				showAlert({ level: "error", message: msg });
				failCount++;
			}
		}

		// Handle image files
		for (const file of imageFiles) {
			const formData = new FormData();
			formData.append("figure", file, file.name);
			formData.append("short_desc", "");
			formData.append("long_desc", "");
			formData.append("source", "");

			try {
				const figResponse = await uploadFigure(formData);
				figDataArr.push(figResponse?.fig_data || null);
				successCount++;
			} catch (err: any) {
				console.error("upload error", err?.response?.status, err?.response?.data || err);
				failCount++;
			}
		}

		if (imageFiles.length > 0) {
			logAction(
				{ actionType: "click", elementId: "upload-submit-button" },
				{ images: figDataArr },
			);
		}

		if (failCount === 0) {
			const slideCount = pptxFiles.length > 0 ? " (including slides)" : "";
			showAlert({
				level: "success",
				message: `${successCount} item(s) uploaded successfully${slideCount}.`,
			});
		} else {
			showAlert({
				level: "warning",
				message: `Upload complete: ${successCount} succeeded, ${failCount} failed.`,
			});
		}

		setShowModal(false);
		setSelectedFiles([]);
		if (fileInputRef.current) fileInputRef.current.value = "";
		if (onUploaded) {
			try {
				await onUploaded();
			} catch {}
		}
	};

	// Close modal and reset
	const handleCancel = () => {
		setShowModal(false);
		setSelectedFiles([]);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	// Handle upload from computer
	const handleUploadFromComputer = () => {
		logAction({ actionType: "click", elementId: "upload-from-computer" });
		setShowModal(true);
	};

	// Handle import from Jupyter
	const handleImportFromJupyter = () => {
		logAction({ actionType: "click", elementId: "import-from-jupyter" });
		window.open("https://cast-storystudio.com/jupyterhub", "_blank");
	};

	// Handle add text note
	const handleAddNote = async () => {
		logAction({ actionType: "click", elementId: "add-text-note" });
		try {
			await createNote();
			if (onUploaded) {
				try {
					await onUploaded();
				} catch {}
			}
		} catch (err) {
			console.error("Error creating note:", err);
			showAlert({ level: "error", message: "An error occurred while creating the note." });
		}
	};

	// Visible component
	return (
		<>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button
						id="upload-button"
						data-tour-target="create-button"
						className="bg-bama-crimson text-sm text-white rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
					>
						<span className="flex items-center justify-center gap-2">
							<Plus className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
							Create
							<ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
						</span>
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						className="mt-1 ml-1 shadow-lg z-400 bg-white rounded-lg py-1 min-w-50"
						sideOffset={4}
						align="start"
						onCloseAutoFocus={(e) => e.preventDefault()}
					>
						<DropdownMenu.Item
							className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
							log-id="upload-from-computer"
							onSelect={handleUploadFromComputer}
						>
							Upload Visuals from Computer
						</DropdownMenu.Item>
						<div className="h-px mx-3 bg-grey" />
						<DropdownMenu.Item
							className={`block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none ${targetUser ? "opacity-40 pointer-events-none" : ""}`}
							log-id="import-from-jupyter"
							onSelect={targetUser ? undefined : handleImportFromJupyter}
							disabled={!!targetUser}
						>
							Import Visuals from Jupyter Notebook
						</DropdownMenu.Item>
						<div className="h-px mx-3 bg-grey" />
						<DropdownMenu.Item
							className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
							log-id="add-text-note"
							onSelect={handleAddNote}
						>
							Add Text
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>

			<ConfirmModal
				open={showModal}
				title="Upload Images"
				onClose={handleCancel}
				onConfirm={handleSubmit}
				confirmLabel="Upload"
				confirmDisabled={selectedFiles.length === 0}
				confirmLogId="upload-submit-button"
				confirmButtonClassName="bg-bama-crimson text-sm text-white rounded px-3 py-1 hover:brightness-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				{selectedFiles.length > 0 ? (
					<div className="mb-3 max-h-48 overflow-y-auto">
						<div className="text-sm text-gray-600 mb-2">Selected files:</div>
						<div className="space-y-1">
							{selectedFiles.map((file, index) => (
								<div
									key={index}
									className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
								>
									<span className="font-medium truncate flex-1 mr-2">
										{file.name}
									</span>
									<button
										type="button"
										className="text-red-500 hover:text-red-700 leading-none"
										onClick={() => handleRemoveFile(index)}
										title="Remove file"
									>
										<X className="w-4 h-4" strokeWidth={1.5} aria-hidden />
									</button>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="text-sm text-gray-500 mb-3">No files selected</div>
				)}
				<button
					type="button"
					className="bg-gray-500 text-sm text-white rounded px-3 py-1 hover:brightness-95"
					onClick={() => fileInputRef.current?.click()}
				>
					{selectedFiles.length > 0 ? "Add More Files" : "Select Files"}
				</button>
			</ConfirmModal>

			<input
				type="file"
				accept="image/*"
				multiple
				ref={fileInputRef}
				onChange={handleFileChange}
				style={{ display: "none" }}
			/>
		</>
	);
};

export default UploadButton;
