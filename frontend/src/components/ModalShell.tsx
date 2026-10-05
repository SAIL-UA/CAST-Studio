import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalShellProps = {
	onClose: () => void;
	children: ReactNode;
	panelClassName?: string;
	role?: "dialog" | "alertdialog";
	ariaLabel?: string;
	ariaLabelledBy?: string;
	ariaDescribedBy?: string;
};

export const ModalShell = ({
	onClose,
	children,
	panelClassName = "relative mx-4 w-full max-w-lg rounded-lg bg-white p-4 shadow-xl",
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

	// Portal + z-[600]: edit modals / menus sit at z-500; alerts must stack above them
	// and escape any parent stacking context (e.g. transformed workspace panels).
	return createPortal(
		<div
			className="fixed inset-0 z-600 flex items-center justify-center bg-black/50"
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
