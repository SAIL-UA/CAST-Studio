import { useEffect, useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	getWorkspaces,
	createWorkspace,
	renameWorkspace,
	activateWorkspace,
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

	const [createOpen, setCreateOpen] = useState(false);
	const [createName, setCreateName] = useState("");
	const [replaceId, setReplaceId] = useState("");
	const [replaceConfirm, setReplaceConfirm] = useState(false);

	const [alertModal, setAlertModal] = useState<string | null>(null);

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

	const atCap = workspaces.length >= limit;
	const replaceTarget = workspaces.find((w) => w.id === replaceId);

	const closeMenuThen = (fn: () => void) => {
		setMenuOpen(false);
		fn();
	};

	const handleLoad = async (workspace: SavedWorkspace) => {
		if (workspace.is_active) return;
		setBusy(true);
		try {
			await activateWorkspace(workspace.id);
			await loadList();
			await onWorkspaceChanged?.();
		} catch (err) {
			console.error(err);
			setAlertModal("Could not load workspace.");
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
			setAlertModal("Could not rename workspace.");
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
			await onWorkspaceChanged?.();
		} catch (err: any) {
			if (err?.response?.data?.code === "last_workspace") {
				setAlertModal("You cannot delete your only workspace.");
			} else {
				setAlertModal("Could not delete workspace.");
			}
		} finally {
			setBusy(false);
		}
	};

	const openCreate = () => {
		setCreateName("");
		setReplaceId("");
		setReplaceConfirm(false);
		setCreateOpen(true);
	};

	const requestCreate = () => {
		const name = createName.trim();
		if (!name) {
			setAlertModal("Enter a name for the new workspace.");
			return;
		}
		if (atCap) {
			if (!replaceId) {
				setAlertModal("Replace one of the current workspaces to create a new one.");
				return;
			}
			setReplaceConfirm(true);
			return;
		}
		void submitCreate();
	};

	const submitCreate = async () => {
		const name = createName.trim();
		if (!name) return;
		setBusy(true);
		try {
			await createWorkspace(name, atCap ? replaceId : undefined);
			setCreateOpen(false);
			setReplaceConfirm(false);
			setCreateName("");
			setReplaceId("");
			await loadList();
			await onWorkspaceChanged?.();
		} catch (err: any) {
			const code = err?.response?.data?.code;
			if (code === "workspace_limit") {
				setAlertModal("Replace one of the current workspaces to create a new one.");
			} else if (code === "invalid_replace") {
				setAlertModal("Choose a workspace to replace.");
			} else {
				setAlertModal("Could not create workspace.");
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<DropdownMenu.Root
				open={menuOpen}
				onOpenChange={(open) => {
					setMenuOpen(open);
					if (open) loadList();
				}}
			>
				<DropdownMenu.Trigger asChild>
					<button
						id="workspace-menu-button"
						disabled={disabled}
						className="bg-bama-crimson text-sm text-white rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
					>
						<span className="flex items-center justify-center gap-2">
							Workspace
							<svg
								className="fill-current h-4 w-4"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
							>
								<path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
							</svg>
						</span>
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content
						className="mt-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[240px]"
						sideOffset={4}
						align="start"
						onCloseAutoFocus={(e) => e.preventDefault()}
					>
						{workspaces.map((w) => (
							<WorkspaceItem
								key={w.id}
								workspace={w}
								disabled={busy}
								canDelete={workspaces.length > 1}
								onSelect={(ws) =>
									closeMenuThen(() => {
										void handleLoad(ws);
									})
								}
								onRename={(ws) =>
									closeMenuThen(() => {
										setRenameTarget(ws);
										setRenameValue(ws.name);
									})
								}
								onDelete={(ws) => closeMenuThen(() => setDeleteTarget(ws))}
							/>
						))}
						<div className="h-px mx-3 my-1 bg-grey" />
						<DropdownMenu.Item
							disabled={busy}
							className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
							onSelect={(e) => {
								e.preventDefault();
								closeMenuThen(openCreate);
							}}
						>
							+ Create new workspace
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>

			{renameTarget && (
				<Modal onClose={() => !busy && setRenameTarget(null)}>
					<div className="text-sm font-semibold mb-2">Rename workspace</div>
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
					<div className="text-sm font-semibold mb-2">Delete workspace</div>
					<div className="text-sm text-gray-600 mb-3">
						Delete “{deleteTarget.name}”? This cannot be undone.
						{deleteTarget.is_active && (
							<span className="block mt-2">
								This is your current workspace. Another saved workspace will be
								loaded instead.
							</span>
						)}
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

			{createOpen && !replaceConfirm && (
				<Modal onClose={() => !busy && setCreateOpen(false)}>
					<div className="text-sm font-semibold mb-2">Create new workspace</div>
					<div className="text-sm text-gray-600 mb-3">
						{atCap
							? `You already have ${limit} workspaces. Replace one of the current workspaces to create a new empty one.`
							: "Your current workspace will stay saved. You’ll switch to a new empty workspace."}
					</div>
					<label className="block text-sm mb-3">
						<span className="block text-gray-500 mb-1">Name</span>
						<input
							autoFocus
							value={createName}
							onChange={(e) => setCreateName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") requestCreate();
							}}
							placeholder="Workspace name"
							className="w-full text-sm px-2 py-1.5 border border-grey-lightest rounded"
						/>
					</label>
					{atCap && (
						<label className="block text-sm mb-3">
							<span className="block text-gray-500 mb-1">Replace workspace</span>
							<select
								value={replaceId}
								onChange={(e) => setReplaceId(e.target.value)}
								className="w-full text-sm px-2 py-1.5 border border-grey-lightest rounded"
							>
								<option value="">Choose a workspace…</option>
								{workspaces.map((w) => (
									<option key={w.id} value={w.id}>
										{w.name}
										{w.is_active ? " (current)" : ""}
									</option>
								))}
							</select>
						</label>
					)}
					<div className="flex justify-end gap-2">
						<button
							className="text-sm px-3 py-1 rounded border"
							disabled={busy}
							onClick={() => setCreateOpen(false)}
						>
							Cancel
						</button>
						<button
							className="bg-bama-crimson text-sm text-white rounded px-3 py-1 hover:brightness-95 disabled:opacity-50"
							disabled={busy || !createName.trim()}
							onClick={requestCreate}
						>
							Create
						</button>
					</div>
				</Modal>
			)}

			{createOpen && replaceConfirm && (
				<Modal onClose={() => !busy && setReplaceConfirm(false)}>
					<div className="text-sm font-semibold mb-2">Replace workspace</div>
					<div className="text-sm text-gray-600 mb-3">
						This will replace everything in “
						{replaceTarget?.name || "the selected workspace"}” with a new empty
						workspace named “{createName.trim()}”. This cannot be undone.
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
							onClick={() => void submitCreate()}
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

const Modal = ({ children, onClose }: { children: ReactNode; onClose?: () => void }) => (
	<div className="fixed inset-0 z-[500] flex items-center justify-center">
		<div className="absolute inset-0 bg-black/50" onClick={onClose} />
		<div className="relative bg-white rounded-lg shadow-xl p-4 w-[360px] max-w-[90vw]">
			{children}
		</div>
	</div>
);

export default WorkspaceMenu;
