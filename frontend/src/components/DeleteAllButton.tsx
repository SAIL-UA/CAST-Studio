// Import dependencies
import React, { useState } from "react";
import { deleteFigure, deleteGroup, getGroups, getScaffolds, deleteScaffold } from "@/services/api";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useAlert } from "@/contexts/Alert";
import { logAction } from "@/utils/userActionLogger";
import type { ImageData, GroupData, ScaffoldData } from "@/types/types";
import { Trash2 } from "lucide-react";

type DeleteAllButtonProps = {
	images: ImageData[];
	onDeleteComplete: () => Promise<void>;
	setImages?: React.Dispatch<React.SetStateAction<ImageData[]>>;
	setGroupDivs?: React.Dispatch<React.SetStateAction<GroupData[]>>;
	setScaffolds?: React.Dispatch<React.SetStateAction<ScaffoldData[]>>;
	setSelectedPattern?: React.Dispatch<React.SetStateAction<string>>;
};

// DeleteAll component
const DeleteAllButton = ({
	images,
	onDeleteComplete,
	setImages,
	setGroupDivs,
	setScaffolds,
	setSelectedPattern,
}: DeleteAllButtonProps) => {
	const { showAlert } = useAlert();
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
			console.error("Error fetching groups:", error);
			setGroupCount(0);
		}
		try {
			const scaffolds = await getScaffolds();
			setScaffoldCount(scaffolds?.length || 0);
		} catch (error) {
			console.error("Error fetching scaffolds:", error);
			setScaffoldCount(0);
		}
		setShowModal(true);
	};

	// Handle closing the modal
	const handleCloseModal = () => {
		setShowModal(false);
	};

	// Handle deleting all images and groups
	const handleDeleteAll = async () => {
		logAction({ actionType: "click", elementId: "delete-all-confirm-button" });
		setIsDeleting(true);

		try {
			// Delete all scaffolds
			try {
				await deleteScaffold();
			} catch (error) {
				console.error("Error deleting scaffolds:", error);
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
					const res = await deleteFigure(image.filepath || image.id);
					if (res.status === "success") {
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
			if (setScaffolds) {
				setScaffolds([]);
			}
			if (setSelectedPattern) {
				setSelectedPattern("");
			}
			// Refresh data from backend to ensure consistency
			await onDeleteComplete();

			// Show result message
			if (failCount === 0) {
				showAlert({
					level: "success",
					message: `Successfully deleted all ${successCount} image(s), ${groups?.length || 0} group(s), and ${scaffoldCount} scaffold(s)`,
				});
			} else {
				showAlert({
					level: "warning",
					message: `Deletion complete: ${successCount} image(s) succeeded, ${failCount} failed. ${groups?.length || 0} group(s) and ${scaffoldCount} scaffold(s) deleted.`,
				});
			}

			setShowModal(false);
		} catch (error) {
			console.error("Error clearing all:", error);
			showAlert({ level: "error", message: "An error occurred while clearing all items" });
		} finally {
			setIsDeleting(false);
		}
	};

	// Count total items
	const totalImages = images.length;
	const imageCount = totalImages > 0 ? totalImages : 0;

	return (
		<>
			<ConfirmModal
				open={showModal}
				title="Delete All Items"
				onClose={handleCloseModal}
				onConfirm={handleDeleteAll}
				confirmLabel={isDeleting ? "Deleting..." : "Delete All"}
				confirmDisabled={isDeleting}
				confirmLogId="delete-all-confirm-button"
				destructive
			>
				<div className="text-sm text-gray-600 mb-3">
					Are you sure you want to permanently delete all images, groups, and scaffolds?
					This action cannot be undone.
				</div>
				<div className="text-sm text-gray-500">
					This will delete:
					<ul className="list-disc list-inside mt-1 ml-2">
						<li>{imageCount} image(s) from workspace and recycle bin</li>
						<li>{groupCount} group(s)</li>
						<li>{scaffoldCount} scaffold(s)</li>
					</ul>
				</div>
			</ConfirmModal>
			<button
				log-id="delete-all-button"
				className="w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center gap-1 text-white font-bold text-sm transition-all duration-200"
				style={{
					cursor: "pointer",
					backgroundColor: "rgba(239, 68, 68, 0.5)",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.7)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.5)";
				}}
				onClick={handleOpenModal}
				title="Delete All"
			>
				<Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden />
			</button>
		</>
	);
};

export default DeleteAllButton;
