// Import dependencies
import React, { useState } from "react";
import {
	updateImageData,
	deleteGroup,
	getGroups,
	getScaffolds,
	deleteScaffold,
} from "@/services/api";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useAlert } from "@/contexts/Alert";
import { logAction } from "@/utils/userActionLogger";
import type { ImageData, GroupData, ScaffoldData } from "@/types/types";
import { Eraser } from "lucide-react";

type ClearAllButtonProps = {
	images: ImageData[];
	onClearComplete: () => Promise<void>;
	setImages?: React.Dispatch<React.SetStateAction<ImageData[]>>;
	setGroupDivs?: React.Dispatch<React.SetStateAction<GroupData[]>>;
	setScaffolds?: React.Dispatch<React.SetStateAction<ScaffoldData[]>>;
	setSelectedPattern?: React.Dispatch<React.SetStateAction<string>>;
};

// ClearAll component
const ClearAllButton = ({
	images,
	onClearComplete,
	setImages,
	setGroupDivs,
	setScaffolds,
	setSelectedPattern,
}: ClearAllButtonProps) => {
	const { showAlert } = useAlert();
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

	// Handle clearing all: delete groups/scaffolds and move images to recycle bin
	const handleClearAll = async () => {
		logAction({ actionType: "click", elementId: "clear-all-confirm-button" });
		setIsClearing(true);

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

			// Move active-workspace images to recycle bin (skip ones already recycled)
			let successCount = 0;
			let failCount = 0;
			const activeImages = images.filter((img) => img.in_storyboard);

			for (const image of activeImages) {
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
				setImages((prev) => prev.map((img) => ({ ...img, in_storyboard: false })));
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
			await onClearComplete();

			// Show result message
			if (failCount === 0) {
				showAlert({
					level: "success",
					message: `Successfully moved ${successCount} image(s) to recycle bin, deleted ${groups?.length || 0} group(s), and ${scaffoldCount} scaffold(s)`,
				});
			} else {
				showAlert({
					level: "warning",
					message: `Clear complete: ${successCount} image(s) moved to recycle bin, ${failCount} failed. ${groups?.length || 0} group(s) and ${scaffoldCount} scaffold(s) deleted.`,
				});
			}

			setShowModal(false);
		} catch (error) {
			console.error("Error clearing all:", error);
			showAlert({ level: "error", message: "An error occurred while clearing all items" });
		} finally {
			setIsClearing(false);
		}
	};

	// Only count images still on the workspace (not already in recycle bin)
	const imageCount = images.filter((img) => img.in_storyboard).length;

	return (
		<>
			<ConfirmModal
				open={showModal}
				title="Clear All Items"
				onClose={handleCloseModal}
				onConfirm={handleClearAll}
				confirmLabel={isClearing ? "Clearing..." : "Clear All"}
				confirmDisabled={isClearing}
				confirmLogId="clear-all-confirm-button"
				destructive
			>
				<div className="text-sm text-gray-600 mb-3">
					This will move all images to the recycle bin and permanently delete all groups
					and scaffolds. Groups and scaffolds cannot be recovered.
				</div>
				<div className="text-sm text-gray-500">
					This will:
					<ul className="list-disc list-inside mt-1 ml-2">
						<li>Move {imageCount} image(s) to recycle bin</li>
						<li>Permanently delete {groupCount} group(s)</li>
						<li>Permanently delete {scaffoldCount} scaffold(s)</li>
					</ul>
				</div>
			</ConfirmModal>
			<button
				log-id="clear-all-button"
				className="w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center gap-1 text-white font-bold text-sm transition-all duration-200"
				style={{
					cursor: "pointer",
					backgroundColor: "rgba(0, 92, 132, 0.5)", // bama-crimson #005c84 with 50% opacity
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(0, 92, 132, 0.7)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(0, 92, 132, 0.5)";
				}}
				onClick={handleOpenModal}
				title="Clear All"
			>
				<Eraser className="w-4 h-4" strokeWidth={1.5} aria-hidden />
			</button>
		</>
	);
};

export default ClearAllButton;
