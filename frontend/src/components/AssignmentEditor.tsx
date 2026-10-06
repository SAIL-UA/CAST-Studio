import { useState } from "react";
import { DataStoryLexicalField } from "@/components/dataStory/DataStoryLexicalField";
import type { AssignmentRecord } from "@/services/api";

type AssignmentEditorProps = {
	initial?: AssignmentRecord | null;
	saving?: boolean;
	onSave: (data: {
		title: string;
		body: string;
		max_points: number;
		is_active: boolean;
	}) => void | Promise<void>;
	onCancel: () => void;
};

const noopCaption = () => "";

const AssignmentEditor = ({ initial, saving = false, onSave, onCancel }: AssignmentEditorProps) => {
	const [title, setTitle] = useState(initial?.title ?? "");
	const [body, setBody] = useState(initial?.body ?? "");
	const [maxPoints, setMaxPoints] = useState(String(initial?.max_points ?? 100));
	const [isActive, setIsActive] = useState(initial?.is_active ?? false);
	const [composerKey] = useState(() => `assignment-${initial?.id ?? "new"}-${Date.now()}`);

	const parsedMax = Number(maxPoints);
	const maxValid = Number.isInteger(parsedMax) && parsedMax > 0;

	const handleSave = () => {
		const trimmed = title.trim();
		if (!trimmed || !maxValid) return;
		onSave({
			title: trimmed,
			body,
			max_points: parsedMax,
			is_active: isActive,
		});
	};

	return (
		<div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-grey-light p-6 space-y-5">
			<div>
				<label
					htmlFor="assignment-title"
					className="block text-sm font-medium text-grey-darkest mb-1"
				>
					Title
				</label>
				<input
					id="assignment-title"
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Assignment title"
					className="w-full border border-grey-light rounded-lg px-3 py-2 text-sm text-grey-darkest outline-none focus:border-bama-crimson"
				/>
			</div>

			<div>
				<label
					htmlFor="assignment-max-points"
					className="block text-sm font-medium text-grey-darkest mb-1"
				>
					Maximum points
				</label>
				<input
					id="assignment-max-points"
					type="number"
					min={1}
					step={1}
					value={maxPoints}
					onChange={(e) => setMaxPoints(e.target.value)}
					className="w-32 border border-grey-light rounded-lg px-3 py-2 text-sm text-grey-darkest outline-none focus:border-bama-crimson"
				/>
				{!maxValid && (
					<p className="text-xs text-bama-crimson mt-1">Enter a positive whole number.</p>
				)}
			</div>

			<div>
				<label className="block text-sm font-medium text-grey-darkest mb-1">Content</label>
				<p className="text-xs text-grey-dark mb-2">
					Use the H1–H3 toolbar buttons, or type # / ## / ### then space to start a
					heading.
				</p>
				<div className="border border-grey-light rounded-lg overflow-hidden">
					<DataStoryLexicalField
						composerKey={composerKey}
						initialMarkdown={initial?.body ?? ""}
						editable
						trackChanges
						getCaption={noopCaption}
						onMarkdownChange={setBody}
						placeholder="Write assignment instructions…"
						aria-label="Assignment content"
					/>
				</div>
			</div>

			<label className="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					checked={isActive}
					onChange={(e) => setIsActive(e.target.checked)}
					className="w-4 h-4 accent-bama-crimson"
				/>
				<span className="text-sm text-grey-darkest">
					Active (only one assignment can be active at a time)
				</span>
			</label>

			<div className="flex items-center gap-3 pt-2">
				<button
					type="button"
					onClick={handleSave}
					disabled={saving || !title.trim() || !maxValid}
					className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{saving ? "Saving..." : initial ? "Save Changes" : "Create Assignment"}
				</button>
				<button
					type="button"
					onClick={onCancel}
					disabled={saving}
					className="text-sm text-grey-dark hover:text-grey-darkest px-3 py-1.5 disabled:opacity-50"
				>
					Cancel
				</button>
			</div>
		</div>
	);
};

export default AssignmentEditor;
