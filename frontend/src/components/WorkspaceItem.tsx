import type { SavedWorkspace } from "@/services/api";
import { Pencil, Trash2 } from "lucide-react";

type WorkspaceItemProps = {
	workspace: SavedWorkspace;
	disabled?: boolean;
	onSelect: (workspace: SavedWorkspace) => void;
	onRename: (workspace: SavedWorkspace) => void;
	onDelete: (workspace: SavedWorkspace) => void;
};

const iconBtn =
	"p-1 rounded text-gray-500 hover:bg-grey-lighter hover:text-grey-darkest transition disabled:opacity-40 disabled:cursor-not-allowed";

const WorkspaceItem = ({
	workspace,
	disabled = false,
	onSelect,
	onRename,
	onDelete,
}: WorkspaceItemProps) => {
	return (
		<div className="flex items-center gap-0.5 px-2 py-1 hover:bg-grey-lighter">
			<button
				type="button"
				disabled={disabled}
				title={`Load ${workspace.name} into the editor`}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onSelect(workspace);
				}}
				className="flex-1 min-w-0 text-left text-sm truncate outline-none disabled:opacity-50 text-grey-darkest"
			>
				{workspace.name}
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
				<Pencil className="w-4 h-4" strokeWidth={1.5} aria-hidden />
			</button>
			<button
				type="button"
				disabled={disabled}
				title="Delete"
				className={`${iconBtn} hover:text-red-600`}
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onDelete(workspace);
				}}
			>
				<Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden />
			</button>
		</div>
	);
};

export default WorkspaceItem;
