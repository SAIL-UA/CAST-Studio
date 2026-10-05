import { useState } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";

export type AlertLevel = "success" | "info" | "warning" | "error";

export type AlertModalProps = {
	level: AlertLevel;
	message: string;
	title?: string;
	onClose: () => void;
	actionLabel?: string;
	onAction?: () => void | Promise<void>;
	cancelLabel?: string;
	destructive?: boolean;
};

const levelStyles: Record<AlertLevel, { panel: string; icon: string; label: string }> = {
	success: {
		panel: "bg-green-50 text-green-800",
		icon: "text-green-600",
		label: "Success",
	},
	info: {
		panel: "bg-[#e6f2f6] text-[#003d52]",
		icon: "text-bama-crimson",
		label: "Info",
	},
	warning: {
		panel: "bg-amber-50 text-amber-900",
		icon: "text-amber-500",
		label: "Warning",
	},
	error: {
		panel: "bg-red-50 text-red-800",
		icon: "text-red-600",
		label: "Error",
	},
};

const LevelIcon = ({ level, className }: { level: AlertLevel; className?: string }) => {
	const common = `w-5 h-5 shrink-0 ${className ?? ""}`;

	if (level === "success") {
		return <CircleCheck className={common} strokeWidth={1.5} aria-hidden />;
	}

	if (level === "warning") {
		return <TriangleAlert className={common} strokeWidth={1.5} aria-hidden />;
	}

	if (level === "error") {
		return <CircleAlert className={common} strokeWidth={1.5} aria-hidden />;
	}

	return <Info className={common} strokeWidth={1.5} aria-hidden />;
};

export const AlertModal = ({
	level,
	message,
	title,
	onClose,
	actionLabel,
	onAction,
	cancelLabel = "Cancel",
	destructive = false,
}: AlertModalProps) => {
	const styles = levelStyles[level];
	const [actionPending, setActionPending] = useState(false);
	const isConfirm = Boolean(onAction && actionLabel);
	const messageId = "alert-modal-message";
	const titleId = "alert-modal-title";

	const handleAction = async () => {
		if (!onAction || actionPending) return;
		setActionPending(true);
		try {
			await onAction();
			onClose();
		} catch {
			// Callers show errors via showAlert inside onAction; dismiss either way.
			onClose();
		} finally {
			setActionPending(false);
		}
	};

	return (
		<ModalShell
			onClose={onClose}
			role={isConfirm ? "dialog" : "alertdialog"}
			ariaLabel={isConfirm ? undefined : styles.label}
			ariaLabelledBy={isConfirm && title ? titleId : undefined}
			ariaDescribedBy={messageId}
		>
			{title && isConfirm && (
				<h2 id={titleId} className="mb-2 text-base font-semibold text-grey-darkest">
					{title}
				</h2>
			)}
			<div className={`flex items-center gap-3 rounded-md px-4 py-3 ${styles.panel}`}>
				<LevelIcon level={level} className={styles.icon} />
				<p id={messageId} className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-5">
					{message}
				</p>
				{isConfirm ? (
					<div className="flex shrink-0 items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={actionPending}
							className="text-sm font-medium opacity-70 transition hover:opacity-100 focus:outline-none focus:underline disabled:opacity-50"
						>
							{cancelLabel}
						</button>
						<button
							type="button"
							onClick={() => void handleAction()}
							disabled={actionPending}
							className={
								destructive
									? "text-sm font-semibold text-red-700 transition hover:underline focus:outline-none focus:underline disabled:opacity-50"
									: "text-sm font-semibold transition hover:underline focus:outline-none focus:underline disabled:opacity-50"
							}
						>
							{actionPending ? "…" : actionLabel}
						</button>
					</div>
				) : (
					<button
						type="button"
						log-id="alert-close-button"
						onClick={onClose}
						aria-label="Dismiss"
						className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-grey-dark"
					>
						<X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
					</button>
				)}
			</div>
		</ModalShell>
	);
};

export default AlertModal;
