import { type ReactNode } from "react";
import { ModalShell } from "@/components/ModalShell";

type ConfirmModalProps = {
	open: boolean;
	title: string;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
	confirmLabel: string;
	cancelLabel?: string;
	confirmDisabled?: boolean;
	destructive?: boolean;
	confirmLogId?: string;
	confirmButtonClassName?: string;
	children: ReactNode;
	maxWidthClass?: string;
};

export const ConfirmModal = ({
	open,
	title,
	onClose,
	onConfirm,
	confirmLabel,
	cancelLabel = "Cancel",
	confirmDisabled = false,
	destructive = false,
	confirmLogId,
	confirmButtonClassName,
	children,
	maxWidthClass = "max-w-lg",
}: ConfirmModalProps) => {
	if (!open) return null;

	const titleId = "confirm-modal-title";

	const handleConfirm = () => {
		void Promise.resolve(onConfirm()).catch(() => {
			// Errors are handled by the caller (e.g. showAlert); modal may already be closed.
		});
	};

	return (
		<ModalShell
			onClose={onClose}
			panelClassName={`relative bg-white rounded-lg shadow-xl p-4 w-90 max-w-[90vw] ${maxWidthClass} mx-4`}
			role="dialog"
			ariaLabelledBy={titleId}
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				className="absolute top-3 right-3 w-7 h-7 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200"
			>
				×
			</button>
			<div className="mb-3 pr-8">
				<div id={titleId} className="text-sm font-semibold mb-2">
					{title}
				</div>
				{children}
			</div>
			<div className="flex justify-end gap-2">
				<button
					type="button"
					className="text-sm px-3 py-1.5 rounded-full bg-grey-light text-grey-darkest hover:bg-grey transition disabled:opacity-50 disabled:cursor-not-allowed"
					onClick={onClose}
					disabled={confirmDisabled}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					log-id={confirmLogId}
					className={
						confirmButtonClassName ??
						(destructive
							? "bg-red-600 text-sm text-white rounded-full px-3 py-1.5 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
							: "text-sm text-white rounded-full px-3 py-1.5 disabled:bg-gray-400 disabled:cursor-not-allowed")
					}
					style={
						confirmButtonClassName || destructive
							? undefined
							: { backgroundColor: "#348b94" }
					}
					onClick={handleConfirm}
					disabled={confirmDisabled}
				>
					{confirmLabel}
				</button>
			</div>
		</ModalShell>
	);
};

export default ConfirmModal;
