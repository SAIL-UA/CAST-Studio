import React, { useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useAlert } from "@/contexts/Alert";
import { logAction } from "@/utils/userActionLogger";
import type { ImageData } from "@/types/types";
import { Undo2 } from "lucide-react";

type RestoreAllButtonProps = {
	images: ImageData[];
	handleImageRestore: (imageId: string) => void;
	onRestoreComplete: () => Promise<void>;
};

const RestoreAllButton = ({
	images,
	handleImageRestore,
	onRestoreComplete,
}: RestoreAllButtonProps) => {
	const { showAlert } = useAlert();
	const [showModal, setShowModal] = useState<boolean>(false);
	const [isRestoring, setIsRestoring] = useState<boolean>(false);

	const recycledImages = images.filter((img) => img.in_storyboard === false);

	const handleOpenModal = (e: React.MouseEvent) => {
		logAction(e);
		if (recycledImages.length === 0) {
			showAlert({ level: "info", message: "No images in the recycle bin to restore." });
			return;
		}
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
	};

	const handleRestoreAll = async () => {
		logAction({ actionType: "click", elementId: "restore-all-confirm-button" });
		setIsRestoring(true);

		try {
			for (const image of recycledImages) {
				handleImageRestore(image.id);
			}

			await onRestoreComplete();
			setShowModal(false);
		} catch (error) {
			console.error("Error restoring all:", error);
			showAlert({ level: "error", message: "An error occurred while restoring images." });
		} finally {
			setIsRestoring(false);
		}
	};

	return (
		<>
			<ConfirmModal
				open={showModal}
				title="Restore All Items"
				onClose={handleCloseModal}
				onConfirm={handleRestoreAll}
				confirmLabel={isRestoring ? "Restoring..." : "Restore All"}
				confirmDisabled={isRestoring}
				confirmLogId="restore-all-confirm-button"
			>
				<div className="text-sm text-gray-600">
					This will restore {recycledImages.length} image(s) back to the storyboard.
				</div>
			</ConfirmModal>
			<button
				log-id="restore-all-button"
				className="w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center gap-1 text-white font-bold text-sm transition-all duration-200"
				style={{
					cursor: "pointer",
					backgroundColor: "rgba(52, 139, 148, 0.5)",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(52, 139, 148, 0.7)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = "rgba(52, 139, 148, 0.5)";
				}}
				onClick={handleOpenModal}
				title="Restore all to storyboard"
			>
				<Undo2 className="w-4 h-4" strokeWidth={1.5} aria-hidden />
			</button>
		</>
	);
};

export default RestoreAllButton;
