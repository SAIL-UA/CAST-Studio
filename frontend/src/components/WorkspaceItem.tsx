import type { SavedWorkspace } from "@/services/api";

type WorkspaceItemProps = {
	workspace: SavedWorkspace;
	disabled?: boolean;
	canDelete?: boolean;
	onSelect: (workspace: SavedWorkspace) => void;
	onRename: (workspace: SavedWorkspace) => void;
	onDelete: (workspace: SavedWorkspace) => void;
};

const iconBtn =
	"p-1 rounded text-gray-500 hover:bg-grey-lighter hover:text-grey-darkest transition disabled:opacity-40 disabled:cursor-not-allowed";

const WorkspaceItem = ({
	workspace,
	disabled = false,
	canDelete = true,
	onSelect,
	onRename,
	onDelete,
}: WorkspaceItemProps) => {
	return (
		<div className="flex items-center gap-0.5 px-2 py-1 hover:bg-grey-lighter">
			<button
				type="button"
				disabled={disabled}
				title={workspace.is_active ? "Current workspace" : `Load ${workspace.name}`}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onSelect(workspace);
				}}
				className={`flex-1 min-w-0 text-left text-sm truncate outline-none disabled:opacity-50 ${
					workspace.is_active ? "font-medium text-grey-darkest" : "text-grey-darkest"
				}`}
			>
				{workspace.name}
				{workspace.is_active && (
					<span className="ml-1 text-xs font-normal text-gray-400">(current)</span>
				)}
			</button>
			<button
				type="button"
				disabled={disabled}
				title="Rename"
				className={iconBtn}
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onRename(workspace);
				}}
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			</button>
			<button
				type="button"
				disabled={disabled || !canDelete}
				title={canDelete ? "Delete" : "You cannot delete your only workspace"}
				className={`${iconBtn} hover:text-red-600`}
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onDelete(workspace);
				}}
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		</div>
	);
};

export default WorkspaceItem;
