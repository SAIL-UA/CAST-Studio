import { useEffect, useState, type ReactNode } from "react";
import { createSubmission, getSubmissionStatus } from "@/services/api";
import { logAction } from "@/utils/userActionLogger";
import { useAlert } from "@/contexts/Alert";

type SubmitButtonProps = {
	disabled?: boolean;
};

const Modal = ({
	open,
	title,
	children,
	onClose,
}: {
	open: boolean;
	title: string;
	children: ReactNode;
	onClose: () => void;
}) => {
	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-5"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className="text-lg font-semibold text-grey-darkest mb-3">{title}</h3>
				{children}
			</div>
		</div>
	);
};

const SubmitButton = ({ disabled = false }: SubmitButtonProps) => {
	const { showAlert } = useAlert();
	const [used, setUsed] = useState(0);
	const [limit, setLimit] = useState(3);
	const [busy, setBusy] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const loadStatus = async () => {
		try {
			const data = await getSubmissionStatus();
			setUsed(data.used ?? 0);
			setLimit(data.limit ?? 3);
		} catch (err) {
			console.error("Error loading submission status:", err);
		}
	};

	useEffect(() => {
		loadStatus();
	}, []);

	const atCap = used >= limit;
	const remaining = Math.max(0, limit - used);

	const openConfirm = (e: React.MouseEvent) => {
		logAction(e);
		if (disabled || busy) return;
		if (atCap) {
			showAlert({
				level: "warning",
				message:
					"You have used all submission attempts. Please contact your instructor for more information.",
			});
			return;
		}
		setConfirmOpen(true);
	};

	const doSubmit = async () => {
		setBusy(true);
		try {
			const data = await createSubmission();
			setConfirmOpen(false);
			setUsed(data.used ?? used + 1);
			setLimit(data.limit ?? limit);
			const left = data.remaining ?? Math.max(0, (data.limit ?? limit) - (data.used ?? 0));
			showAlert({
				level: "success",
				message: `Submitted successfully. ${left} of ${data.limit ?? limit} attempt${(data.limit ?? limit) === 1 ? "" : "s"} remaining.`,
			});
		} catch (err: any) {
			const code = err?.response?.data?.code;
			if (code === "submission_limit") {
				setUsed(err.response.data.used ?? limit);
				setLimit(err.response.data.limit ?? limit);
				showAlert({
					level: "warning",
					message:
						err.response.data.error ||
						"Submission limit reached. Please contact your instructor for more information.",
				});
			} else {
				showAlert({ level: "error", message: "Could not submit. Please try again." });
			}
			setConfirmOpen(false);
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<button
				id="submit-button"
				log-id="submit-button"
				type="button"
				disabled={disabled || busy}
				title={
					atCap
						? "No submission attempts remaining"
						: `Submit (${remaining} of ${limit} remaining)`
				}
				onClick={openConfirm}
				className={`text-sm text-white rounded-full px-3 py-1 mx-1 transition duration-200 ${
					disabled || busy || atCap
						? "bg-green-600/50 cursor-not-allowed"
						: "bg-green-600 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95"
				}`}
			>
				{busy ? "Submitting..." : "Submit"}
			</button>

			<Modal
				open={confirmOpen}
				title="Submit your work?"
				onClose={() => !busy && setConfirmOpen(false)}
			>
				<p className="text-sm text-grey-dark mb-2">
					Submitting uses <strong>one of your {limit} submission attempts</strong> ({used}{" "}
					used, {remaining} remaining).
				</p>
				<p className="text-sm text-grey-dark mb-4">
					Your submission is final and immutable — you will not be able to edit or reload
					it later. You can keep working in your live workspace afterward.
				</p>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						disabled={busy}
						onClick={() => setConfirmOpen(false)}
						className="text-sm px-3 py-1.5 rounded-full border border-grey-light text-grey-darkest hover:bg-grey-lighter"
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={busy}
						onClick={doSubmit}
						className="text-sm px-3 py-1.5 rounded-full bg-green-600 text-white hover:brightness-95 disabled:opacity-50"
					>
						{busy ? "Submitting..." : "Submit"}
					</button>
				</div>
			</Modal>
		</>
	);
};

export default SubmitButton;
