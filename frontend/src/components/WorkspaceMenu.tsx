import { useEffect, useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	getWorkspaces,
	saveWorkspace,
	renameWorkspace,
	restoreWorkspace,
	deleteSavedWorkspace,
	type SavedWorkspace,
} from "@/services/api";
import WorkspaceItem from "@/components/WorkspaceItem";

type WorkspaceMenuProps = {
	onWorkspaceChanged?: () => void | Promise<void>;
	disabled?: boolean;
};

const WorkspaceMenu = ({ onWorkspaceChanged, disabled = false }: WorkspaceMenuProps) => {
	const [workspaces, setWorkspaces] = useState<SavedWorkspace[]>([]);
	const [limit, setLimit] = useState(3);
	const [menuOpen, setMenuOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	const [renameTarget, setRenameTarget] = useState<SavedWorkspace | null>(null);
	const [renameValue, setRenameValue] = useState("");

	const [deleteTarget, setDeleteTarget] = useState<SavedWorkspace | null>(null);
	const [loadTarget, setLoadTarget] = useState<SavedWorkspace | null>(null);

	const [saveOpen, setSaveOpen] = useState(false);
	const [saveName, setSaveName] = useState("");
	const [replaceId, setReplaceId] = useState("");
	const [replaceConfirm, setReplaceConfirm] = useState(false);

	const [alertModal, setAlertModal] = useState<string | null>(null);

	const snapshots = workspaces.filter((w) => !w.is_active);

	const loadList = async () => {
		try {
			const data = await getWorkspaces();
			setWorkspaces(data.workspaces || []);
			setLimit(data.limit ?? 3);
		} catch (err) {
			console.error("Error loading workspaces:", err);
		}
	};

	useEffect(() => {
		loadList();
	}, []);

	const atCap = snapshots.length >= limit;
	const replaceTarget = snapshots.find((w) => w.id === replaceId);

	const closeMenuThen = (fn: () => void) => {
		setMenuOpen(false);
		fn();
	};

	const submitLoad = async () => {
		if (!loadTarget) return;
		setBusy(true);
		try {
			await restoreWorkspace(loadTarget.id);
			setLoadTarget(null);
			await loadList();
			await onWorkspaceChanged?.();
		} catch (err) {
			console.error(err);
			setAlertModal("Could not load snapshot into the editor.");
		} finally {
			setBusy(false);
		}
	};

	const submitRename = async () => {
		if (!renameTarget) return;
		const name = renameValue.trim();
		if (!name) return;
		setBusy(true);
		try {
			await renameWorkspace(renameTarget.id, name);
			setRenameTarget(null);
			await loadList();
		} catch (err) {
			console.error(err);
			setAlertModal("Could not rename snapshot.");
		} finally {
			setBusy(false);
		}
	};

	const submitDelete = async () => {
		if (!deleteTarget) return;
		setBusy(true);
		try {
			await deleteSavedWorkspace(deleteTarget.id);
			setDeleteTarget(null);
			await loadList();
		} catch (err: any) {
			if (err?.response?.data?.code === "editor_workspace") {
				setAlertModal("The editor cannot be deleted.");
			} else {
				setAlertModal("Could not delete snapshot.");
			}
		} finally {
			setBusy(false);
		}
	};

	const openSave = () => {
		setMenuOpen(false);
		setSaveName("");
		setReplaceId("");
		setReplaceConfirm(false);
		setSaveOpen(true);
	};

	useEffect(() => {
		if (disabled) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
			e.preventDefault();
			if (busy) return;
			if (saveOpen && replaceConfirm) {
				void submitSave();
				return;
			}
			if (saveOpen) {
				requestSave();
				return;
			}
			openSave();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	});

	const requestSave = () => {
		const name = saveName.trim();
		if (!name) {
			setAlertModal("Enter a name for the snapshot.");
			return;
		}
		if (atCap) {
			if (!replaceId) {
				setAlertModal("Replace one of the saved snapshots to save this editor.");
				return;
			}
			setReplaceConfirm(true);
			return;
		}
		void submitSave();
	};

	const submitSave = async () => {
		const name = saveName.trim();
		if (!name) return;
		setBusy(true);
		try {
			await saveWorkspace(name, atCap ? replaceId : undefined);
			setSaveOpen(false);
			setReplaceConfirm(false);
			setSaveName("");
			setReplaceId("");
			await loadList();
		} catch (err: any) {
			const code = err?.response?.data?.code;
			if (code === "workspace_limit") {
				setAlertModal("Replace one of the saved snapshots to save this editor.");
			} else if (code === "invalid_replace") {
				setAlertModal("Choose a snapshot to replace.");
			} else {
				setAlertModal("Could not save snapshot.");
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<div className="inline-flex mx-1">
				<button
					id="workspace-menu-button"
					type="button"
					disabled={disabled || busy}
					title="Save (Ctrl+S)"
					onClick={openSave}
					className="bg-bama-crimson text-sm text-white rounded-l-2xl px-3 py-1 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50"
				>
					<span className="flex items-center justify-center gap-1.5">
						<FileIcon />
						Save
					</span>
				</button>
				<DropdownMenu.Root
					open={menuOpen}
					onOpenChange={(open) => {
						setMenuOpen(open);
						if (open) loadList();
					}}
				>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							disabled={disabled}
							title="Saved snapshots"
							aria-label="Saved snapshots"
							className="bg-bama-crimson text-white rounded-r-2xl px-1.5 py-1 border-l border-white/25 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50"
						>
							<svg
								className="fill-current h-4 w-4"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
							</svg>
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							className="mt-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[240px]"
							sideOffset={4}
							align="end"
							onCloseAutoFocus={(e) => e.preventDefault()}
						>
							{snapshots.length === 0 ? (
								<div className="px-3 py-1.5 text-sm text-gray-400">
									No saved snapshots
								</div>
							) : (
								snapshots.map((w) => (
									<WorkspaceItem
										key={w.id}
										workspace={w}
										disabled={busy}
										onSelect={(ws) =>
											closeMenuThen(() => setLoadTarget(ws))
										}
										onRename={(ws) =>
											closeMenuThen(() => {
												setRenameTarget(ws);
												setRenameValue(ws.name);
											})
										}
										onDelete={(ws) =>
											closeMenuThen(() => setDeleteTarget(ws))
										}
									/>
								))
							)}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>

			{loadTarget && (
				<Modal onClose={() => !busy && setLoadTarget(null)}>
					<div className="text-sm font-semibold mb-2">Load snapshot</div>
					<div className="text-sm text-gray-600 mb-3">
						Replace everything in the editor with “{loadTarget.name}”? Unsaved
						editor changes will be lost.
					</div>
					<div className="flex justify-end gap-2">
						<button
							className="text-sm px-3 py-1 rounded border"
							disabled={busy}
							onClick={() => setLoadTarget(null)}
						>
							Cancel
						</button>
						<button
							className="bg-bama-crimson text-sm text-white rounded px-3 py-1 hover:brightness-95 disabled:opacity-50"
							disabled={busy}
							onClick={() => void submitLoad()}
						>
							Load
						</button>
					</div>
				</Modal>
			)}

			{renameTarget && (
				<Modal onClose={() => !busy && setRenameTarget(null)}>
					<div className="text-sm font-semibold mb-2">Rename snapshot</div>
					<input
						autoFocus
						value={renameValue}
						onChange={(e) => setRenameValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") void submitRename();
						}}
						className="w-full text-sm px-2 py-1.5 border border-grey-lightest rounded mb-3"
					/>
					<div className="flex justify-end gap-2">
						<button
							className="text-sm px-3 py-1 rounded border"
							disabled={busy}
							onClick={() => setRenameTarget(null)}
						>
							Cancel
						</button>
						<button
							className="bg-bama-crimson text-sm text-white rounded px-3 py-1 hover:brightness-95 disabled:opacity-50"
							disabled={busy || !renameValue.trim()}
							onClick={() => void submitRename()}
						>
							Save
						</button>
					</div>
				</Modal>
			)}

			{deleteTarget && (
				<Modal onClose={() => !busy && setDeleteTarget(null)}>
					<div className="text-sm font-semibold mb-2">Delete snapshot</div>
					<div className="text-sm text-gray-600 mb-3">
						Delete “{deleteTarget.name}”? This cannot be undone.
					</div>
					<div className="flex justify-end gap-2">
						<button
							className="text-sm px-3 py-1 rounded border"
							disabled={busy}
							onClick={() => setDeleteTarget(null)}
						>
							Cancel
						</button>
						<button
							className="bg-red-600 text-sm text-white rounded px-3 py-1 hover:bg-red-700 disabled:opacity-50"
							disabled={busy}
							onClick={() => void submitDelete()}
						>
							Delete
						</button>
					</div>
				</Modal>
			)}

			{saveOpen && !replaceConfirm && (
				<Modal onClose={() => !busy && setSaveOpen(false)}>
					<div className="text-sm font-semibold mb-2">Save snapshot</div>
					<div className="text-sm text-gray-600 mb-3">
						{atCap
							? `You already have ${limit} snapshots. Replace one to save the current editor.`
							: "A copy of the editor will be saved. You will keep working in the editor."}
					</div>
					<label className="block text-sm mb-3">
						<span className="block text-gray-500 mb-1">Name</span>
						<input
							autoFocus
							value={saveName}
							onChange={(e) => setSaveName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") requestSave();
							}}
							placeholder="Snapshot name"
							className="w-full text-sm px-2 py-1.5 border border-grey-lightest rounded"
						/>
					</label>
					{atCap && (
						<label className="block text-sm mb-3">
							<span className="block text-gray-500 mb-1">Replace snapshot</span>
							<select
								value={replaceId}
								onChange={(e) => setReplaceId(e.target.value)}
								className="w-full text-sm px-2 py-1.5 border border-grey-lightest rounded"
							>
								<option value="">Choose a snapshot…</option>
								{snapshots.map((w) => (
									<option key={w.id} value={w.id}>
										{w.name}
									</option>
								))}
							</select>
						</label>
					)}
					<div className="flex justify-end gap-2">
						<button
							className="text-sm px-3 py-1 rounded border"
							disabled={busy}
							onClick={() => setSaveOpen(false)}
						>
							Cancel
						</button>
						<button
							className="bg-bama-crimson text-sm text-white rounded px-3 py-1 hover:brightness-95 disabled:opacity-50"
							disabled={busy || !saveName.trim()}
							onClick={requestSave}
						>
							Save
						</button>
					</div>
				</Modal>
			)}

			{saveOpen && replaceConfirm && (
				<Modal onClose={() => !busy && setReplaceConfirm(false)}>
					<div className="text-sm font-semibold mb-2">Replace snapshot</div>
					<div className="text-sm text-gray-600 mb-3">
						This will replace everything in “
						{replaceTarget?.name || "the selected snapshot"}” with the current
						editor, named “{saveName.trim()}”. This cannot be undone.
					</div>
					<div className="flex justify-end gap-2">
						<button
							className="text-sm px-3 py-1 rounded border"
							disabled={busy}
							onClick={() => setReplaceConfirm(false)}
						>
							Back
						</button>
						<button
							className="bg-red-600 text-sm text-white rounded px-3 py-1 hover:bg-red-700 disabled:opacity-50"
							disabled={busy}
							onClick={() => void submitSave()}
						>
							Replace
						</button>
					</div>
				</Modal>
			)}

			{alertModal && (
				<Modal onClose={() => setAlertModal(null)}>
					<p className="text-sm text-grey-darkest mb-3">{alertModal}</p>
					<div className="flex justify-end">
						<button
							className="text-sm bg-bama-crimson text-white rounded px-3 py-1"
							onClick={() => setAlertModal(null)}
						>
							OK
						</button>
					</div>
				</Modal>
			)}
		</>
	);
};

const FileIcon = () => (
	<svg
		className="w-4 h-4 shrink-0"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M7 3h8l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3v6h6" />
	</svg>
);

const Modal = ({ children, onClose }: { children: ReactNode; onClose?: () => void }) => (
	<div className="fixed inset-0 z-[500] flex items-center justify-center">
		<div className="absolute inset-0 bg-black/50" onClick={onClose} />
		<div className="relative bg-white rounded-lg shadow-xl p-4 w-[360px] max-w-[90vw]">
			{children}
		</div>
	</div>
);

export default WorkspaceMenu;
