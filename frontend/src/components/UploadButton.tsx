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

// per file size caps, keep in sync with backend
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per image
const MAX_PPTX_BYTES = 20 * 1024 * 1024; // 20 MB per PPTX
const MAX_SLIDES = 15; // Keep in sync with UploadSlidesView.MAX_SLIDES

const isPptx = (f: File) =>
	f.name.toLowerCase().endsWith(".pptx") ||
	f.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const sizeLimitFor = (f: File) => (isPptx(f) ? MAX_PPTX_BYTES : MAX_IMAGE_BYTES);
const fmtMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

// Upload button component
const UploadButton = ({ onUploaded, targetUser }: UploadButtonProps) => {
	const { showAlert } = useAlert();
	// Hidden file input ref
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Selected files state
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [showModal, setShowModal] = useState<boolean>(false);
	// True while a submit is in flight — used to disable the Upload button and
	// prevent double-submits from a second click before the first finishes.
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Handle file selection (does not upload yet). Filters out oversized files
	// right at selection so users see the rejection immediately instead of after
	// clicking Upload.
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			const incoming = Array.from(files);
			const ok: File[] = [];
			const rejected: string[] = [];
			for (const f of incoming) {
				if (f.size > sizeLimitFor(f)) {
					const limitMB = sizeLimitFor(f) / (1024 * 1024);
					rejected.push(
						`${f.name} (${fmtMB(f.size)} MB — max ${limitMB} MB${
							isPptx(f) ? ` for PPTX, ${MAX_SLIDES} slides` : ""
						})`,
					);
				} else {
					ok.push(f);
				}
			}
			if (ok.length) setSelectedFiles((prev) => [...prev, ...ok]);
			if (rejected.length) {
				showAlert({
					level: "warning",
					message:
						`The following file${rejected.length === 1 ? " was" : "s were"} too large and skipped:\n\n` +
						rejected.map((r) => `• ${r}`).join("\n"),
				});
			}
		}
		// Allow re-selecting the same file after rejection / remove.
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	// Remove a file from the list
	const handleRemoveFile = (index: number) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	// Handle actual upload on submit
	const handleSubmit = async () => {
		// Guard against a second click while the first submit is still in flight.
		// Even with the button disabled, a fast double-click can slip through
		// during the render tick between click and disabled-attr application.
		if (isSubmitting) return;
		if (selectedFiles.length === 0) {
			showAlert({ level: "warning", message: "Please select at least one file first." });
			return;
		}

		const pptxFiles = selectedFiles.filter(isPptx);
		const imageFiles = selectedFiles.filter((f) => !isPptx(f));

		let successCount = 0;
		let figDataArr = [];
		const failures: string[] = [];

		const pptxLimitMsg = `Max ${MAX_SLIDES} slides and ${MAX_PPTX_BYTES / (1024 * 1024)} MB per PowerPoint file.`;
		const imageLimitMsg = `Max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB per image.`;

		setIsSubmitting(true);
		try {
			// Route PPTX files to the slides endpoint
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
					failures.push(`• ${file.name} — ${pptxLimitMsg}`);
				}
			}

			// Route image files to the figure endpoint
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
					console.error(
						"upload error",
						err?.response?.status,
						err?.response?.data || err,
					);
					failures.push(`• ${file.name} — ${imageLimitMsg}`);
				}
			}

			if (imageFiles.length > 0) {
				logAction(
					{ actionType: "click", elementId: "upload-submit-button" },
					{ images: figDataArr },
				);
			}

			if (failures.length === 0) {
				showAlert({
					level: "success",
					message: `${successCount} item(s) uploaded successfully.`,
				});
			} else {
				showAlert({
					level: "warning",
					message:
						`Upload complete: ${successCount} succeeded, ${failures.length} failed.\n\n` +
						failures.join("\n"),
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
		} finally {
			// Ensures the button always becomes clickable again — even if a crash in the upload loop occurs
			setIsSubmitting(false);
		}
	};

	// Close modal and reset
	const handleCancel = () => {
		if (isSubmitting) return;
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
				title="Upload Visuals"
				onClose={handleCancel}
				onConfirm={handleSubmit}
				confirmLabel={isSubmitting ? "Uploading…" : "Upload"}
				confirmDisabled={selectedFiles.length === 0 || isSubmitting}
				confirmLogId="upload-submit-button"
				confirmButtonClassName="bg-bama-crimson text-sm text-white rounded px-3 py-1 hover:brightness-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				{selectedFiles.length > 0 ? (
					<div className="mb-3 max-h-48 overflow-y-auto">
						<div className="text-sm text-gray-600 mb-2">Selected files:</div>
						<div className="space-y-1">
							{selectedFiles.map((file, index) => (
								<div
									key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
									className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
								>
									<span className="font-medium truncate flex-1 mr-2">
										{file.name}
									</span>
									<button
										type="button"
										className="text-red-500 hover:text-red-700 leading-none disabled:opacity-30 disabled:cursor-not-allowed"
										onClick={() => handleRemoveFile(index)}
										title="Remove file"
										disabled={isSubmitting}
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
					className="bg-gray-500 text-sm text-white rounded px-3 py-1 hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
					onClick={() => fileInputRef.current?.click()}
					disabled={isSubmitting}
				>
					{selectedFiles.length > 0 ? "Add More Files" : "Select Files"}
				</button>
			</ConfirmModal>

			<input
				type="file"
				accept="image/*,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
				multiple
				ref={fileInputRef}
				onChange={handleFileChange}
				style={{ display: "none" }}
			/>
		</>
	);
};

export default UploadButton;
