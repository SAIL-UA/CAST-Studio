export type AlertLevel = "success" | "info" | "warning" | "error";

type AlertModalProps = {
	level: AlertLevel;
	message: string;
	onClose: () => void;
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
		return (
			<svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fillRule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9 10.94 7.28 9.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z"
					clipRule="evenodd"
				/>
			</svg>
		);
	}

	if (level === "warning") {
		return (
			<svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fillRule="evenodd"
					d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
					clipRule="evenodd"
				/>
			</svg>
		);
	}

	if (level === "error") {
		return (
			<svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fillRule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
					clipRule="evenodd"
				/>
			</svg>
		);
	}

	// info
	return (
		<svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path
				fillRule="evenodd"
				d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
				clipRule="evenodd"
			/>
		</svg>
	);
};

export const AlertModal = ({ level, message, onClose }: AlertModalProps) => {
	const styles = levelStyles[level];

	return (
		<div
			className="fixed inset-0 z-500 flex items-center justify-center bg-black/50"
			// Close modal on click outside modal
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className="relative mx-4 w-full max-w-lg rounded-lg bg-white p-4 shadow-xl"
				role="alertdialog"
				aria-modal="true"
				aria-label={styles.label}
				aria-describedby="alert-modal-message"
			>
				<div className={`flex items-start gap-3 rounded-md px-4 py-3 ${styles.panel}`}>
					<LevelIcon level={level} className={styles.icon} />
					<p
						id="alert-modal-message"
						className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-5"
					>
						{message}
					</p>
					<button
						type="button"
						log-id="alert-close-button"
						onClick={onClose}
						aria-label="Dismiss"
						className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-grey-dark"
					>
						<svg
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
};

export default AlertModal;
