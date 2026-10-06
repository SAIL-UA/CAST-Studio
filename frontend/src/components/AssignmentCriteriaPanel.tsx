import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getActiveAssignment, type ActiveAssignment } from "@/services/api";

const markdownComponents = {
	h1: ({ children }: { children?: React.ReactNode }) => (
		<h1 className="text-2xl font-bold text-grey-darkest mb-3 mt-2 leading-tight">{children}</h1>
	),
	h2: ({ children }: { children?: React.ReactNode }) => (
		<h2 className="text-xl font-bold text-grey-darkest mb-2 mt-2 leading-tight">{children}</h2>
	),
	h3: ({ children }: { children?: React.ReactNode }) => (
		<h3 className="text-lg font-semibold text-grey-darkest mb-2 mt-1 leading-snug">
			{children}
		</h3>
	),
	p: ({ children }: { children?: React.ReactNode }) => (
		<p className="mb-3 text-sm text-grey-darkest leading-relaxed">{children}</p>
	),
	ul: ({ children }: { children?: React.ReactNode }) => (
		<ul className="list-disc list-inside mb-3 text-sm text-grey-darkest space-y-1">
			{children}
		</ul>
	),
	ol: ({ children }: { children?: React.ReactNode }) => (
		<ol className="list-decimal list-inside mb-3 text-sm text-grey-darkest space-y-1">
			{children}
		</ol>
	),
	strong: ({ children }: { children?: React.ReactNode }) => (
		<strong className="font-bold">{children}</strong>
	),
	em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
};

type AssignmentCriteriaPanelProps = {
	/** Bump to refetch (e.g. after instructor activates an assignment elsewhere). */
	refreshKey?: number;
};

const AssignmentCriteriaPanel = ({ refreshKey = 0 }: AssignmentCriteriaPanelProps) => {
	const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			try {
				const data = await getActiveAssignment();
				if (!cancelled) setAssignment(data.assignment ?? null);
			} catch (err) {
				console.error("Error loading active assignment:", err);
				if (!cancelled) setAssignment(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [refreshKey]);

	return (
		<div className="w-full p-3">
			{/* Panel header — permanent pill, mirrors Research Questions / Feedback. */}
			<div className="flex flex-row w-full">
				<span
					style={{ background: "#5b4a8a" }}
					className="text-white text-lg font-roboto-semibold px-3 py-1.5 rounded-lg inline-block"
				>
					Assignment
				</span>
			</div>

			{loading && <p className="text-sm text-grey-dark mt-4">Loading assignment…</p>}

			{!loading && !assignment && (
				<p className="text-sm text-grey-dark mt-4">
					No active assignment right now. Check back when your instructor posts one.
				</p>
			)}

			{!loading && assignment && (
				<div className="space-y-3 mt-4">
					<div>
						<h2 className="text-base font-semibold text-grey-darkest">
							{assignment.title}
						</h2>
						<p className="text-xs text-grey-dark mt-0.5">
							Max points: {assignment.max_points}
						</p>
					</div>
					<div className="border-t border-grey-light pt-3">
						{assignment.body.trim() ? (
							<ReactMarkdown
								remarkPlugins={[remarkGfm]}
								components={markdownComponents}
							>
								{assignment.body}
							</ReactMarkdown>
						) : (
							<p className="text-sm text-grey-dark">No criteria provided.</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default AssignmentCriteriaPanel;
