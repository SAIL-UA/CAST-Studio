import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalShellProps = {
	onClose: () => void;
	children: ReactNode;
	panelClassName?: string;
	/** Overlay classes; default keeps alerts/confirms above content dialogs (z-500). */
	overlayClassName?: string;
	role?: "dialog" | "alertdialog";
	ariaLabel?: string;
	ariaLabelledBy?: string;
	ariaDescribedBy?: string;
};

export const ModalShell = ({
	onClose,
	children,
	panelClassName = "relative mx-4 w-full max-w-lg rounded-lg bg-white p-4 shadow-xl",
	overlayClassName = "fixed inset-0 z-600 flex items-center justify-center bg-black/50",
	role = "dialog",
	ariaLabel,
	ariaLabelledBy,
	ariaDescribedBy,
}: ModalShellProps) => {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	// Portal so overlays escape parent stacking contexts (e.g. transformed workspace panels).
	return createPortal(
		<div
			className={overlayClassName}
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className={panelClassName}
				role={role}
				aria-modal="true"
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				aria-describedby={ariaDescribedBy}
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
};

export default ModalShell;
