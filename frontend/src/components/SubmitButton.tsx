import { useEffect, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { createSubmission, getSubmissionStatus } from "@/services/api";
import { logAction } from "@/utils/userActionLogger";
import { useAlert } from "@/contexts/Alert";

type SubmitButtonProps = {
	disabled?: boolean;
};

const SubmitButton = ({ disabled = false }: SubmitButtonProps) => {
	const { showAlert } = useAlert();
	const [used, setUsed] = useState(0);
	const [limit, setLimit] = useState(3);
	const [assignmentTitle, setAssignmentTitle] = useState<string | null>(null);
	const [hasActiveAssignment, setHasActiveAssignment] = useState(true);
	const [busy, setBusy] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const loadStatus = async () => {
		try {
			const data = await getSubmissionStatus();
			setUsed(data.used ?? 0);
			setLimit(data.limit ?? 3);
			setAssignmentTitle(data.assignment_title ?? null);
			setHasActiveAssignment(Boolean(data.assignment_id));
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
		if (!hasActiveAssignment) {
			showAlert({
				level: "warning",
				message: "No active assignment is available to submit to.",
			});
			return;
		}
		if (atCap) {
			showAlert({
				level: "warning",
				message:
					"You have used all submission attempts for this assignment. Please contact your instructor for more information.",
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
			setAssignmentTitle(data.assignment_title ?? assignmentTitle);
			setHasActiveAssignment(Boolean(data.assignment_id));
			const left = data.remaining ?? Math.max(0, (data.limit ?? limit) - (data.used ?? 0));
			showAlert({
				level: "success",
				message: `Submitted successfully${data.assignment_title ? ` to “${data.assignment_title}”` : ""}. ${left} of ${data.limit ?? limit} attempt${(data.limit ?? limit) === 1 ? "" : "s"} remaining.`,
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
						"Submission limit reached for this assignment. Please contact your instructor for more information.",
				});
			} else if (code === "no_active_assignment") {
				setHasActiveAssignment(false);
				showAlert({
					level: "warning",
					message:
						err.response.data.error ||
						"No active assignment is available to submit to.",
				});
			} else {
				showAlert({ level: "error", message: "Could not submit. Please try again." });
			}
			setConfirmOpen(false);
		} finally {
			setBusy(false);
		}
	};

	const titleHint = !hasActiveAssignment
		? "No active assignment"
		: atCap
			? "No submission attempts remaining for this assignment"
			: `Submit to ${assignmentTitle ?? "assignment"} (${remaining} of ${limit} remaining)`;

	return (
		<>
			<button
				id="submit-button"
				log-id="submit-button"
				type="button"
				disabled={disabled || busy || !hasActiveAssignment || atCap}
				title={titleHint}
				onClick={openConfirm}
				className={`text-sm text-white rounded-full px-3 py-1 mx-1 transition duration-200 ${
					disabled || busy || !hasActiveAssignment || atCap
						? "bg-green-600/50 cursor-not-allowed"
						: "bg-green-600 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95"
				}`}
			>
				{busy ? "Submitting..." : "Submit"}
			</button>

			<ConfirmModal
				open={confirmOpen}
				title="Submit your work?"
				onClose={() => setConfirmOpen(false)}
				onConfirm={doSubmit}
				confirmLabel={busy ? "Submitting..." : "Submit"}
				confirmDisabled={busy}
				maxWidthClass="max-w-md"
				confirmButtonClassName="text-sm px-3 py-1.5 rounded-full bg-green-600 text-white hover:brightness-95 disabled:opacity-50"
			>
				{assignmentTitle && (
					<p className="text-sm text-grey-dark mb-2">
						Assignment: <strong>{assignmentTitle}</strong>
					</p>
				)}
				<p className="text-sm text-grey-dark mb-2">
					<strong>
						{used} of {limit} attempts used, {remaining} remaining
					</strong>
				</p>
				<p className="text-sm text-grey-dark">
					Your submission is final and immutable — you will not be able to edit or reload
					it later. You can keep working in your live workspace afterward.
				</p>
			</ConfirmModal>
		</>
	);
};

export default SubmitButton;
