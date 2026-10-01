import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/Auth";
import { useResearchQuestions } from "@/contexts/ResearchQuestions";
import {
	getInstructorWorkspace,
	getInstructorUsers,
	createInstructorNote,
	getSubmissions,
	type SubmissionRecord,
} from "@/services/api";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Header from "@/components/Header";
import Workspace from "@/components/Workspace";
import DataStories from "@/components/DataStories";
import CompactSidebar from "@/components/CompactSidebar";
import Footer from "@/components/Footer";

type StudentInfo = {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
};

const ViewWorkspace = () => {
	const { studentId } = useParams<{ studentId: string }>();
	const navigate = useNavigate();
	const { userAuthenticated, isInstructor } = useAuth();
	const { refreshRqLinks } = useResearchQuestions();

	const [student, setStudent] = useState<StudentInfo | null>(null);
	const [selectedPattern, setSelectedPattern] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);
	const [leftMenuOpen, setLeftMenuOpen] = useState(false);
	const [dataStoriesExpanded, setDataStoriesExpanded] = useState(false);
	const [allUsers, setAllUsers] = useState<StudentInfo[]>([]);
	const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
	const [submissionLimit, setSubmissionLimit] = useState(3);
	/** null = live workspace */
	const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

	// Redirect non-admin users
	useEffect(() => {
		if (!userAuthenticated) {
			navigate("/login");
		} else if (!isInstructor) {
			navigate("/home");
		}
	}, [userAuthenticated, isInstructor, navigate]);

	// Validate admin access and get student info
	useEffect(() => {
		if (!studentId || !isInstructor) return;

		setSelectedSubmissionId(null);

		const loadStudentInfo = async () => {
			setLoading(true);
			try {
				const studentInfo = await getInstructorWorkspace(studentId);
				setStudent(studentInfo);
			} catch (err: any) {
				if (err?.response?.status === 404) {
					setError("User not found.");
				} else if (err?.response?.status === 403) {
					setError("Not authorized to view this workspace.");
				} else {
					setError("An error occurred while loading the workspace.");
				}
			} finally {
				setLoading(false);
			}
		};

		loadStudentInfo();

		const loadUsers = async () => {
			try {
				const data = await getInstructorUsers();
				setAllUsers(
					(data.users || [])
						.filter((u: any) => !u.is_instructor)
						.sort((a: any, b: any) => {
							const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
							const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
							return aName.localeCompare(bName);
						}),
				);
			} catch (err) {
				console.error("Error loading users:", err);
			}
		};
		loadUsers();

		const loadSubmissions = async () => {
			try {
				const data = await getSubmissions(studentId);
				setSubmissions(data.submissions || []);
				setSubmissionLimit(data.limit ?? 3);
			} catch (err) {
				console.error("Error loading submissions:", err);
				setSubmissions([]);
			}
		};
		loadSubmissions();
	}, [studentId, isInstructor]);

	useEffect(() => {
		if (!studentId) return;
		refreshRqLinks(studentId, selectedSubmissionId ?? undefined);
	}, [studentId, selectedSubmissionId, refreshRqLinks]);

	const studentName = student
		? `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.username
		: "";

	const viewingLive = selectedSubmissionId === null;
	const selectedSubmission = submissions.find((s) => s.id === selectedSubmissionId);

	const handleGiveFeedback = async () => {
		if (!studentId || !viewingLive) return;
		try {
			await createInstructorNote(studentId);
			setRefreshKey((prev) => prev + 1);
		} catch (err) {
			console.error("Error creating instructor feedback:", err);
		}
	};

	if (error) {
		return (
			<>
				<Header floating subtitle="View Workspace" />
				<div className="min-h-screen bg-grey-lighter pt-20 px-8 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 shadow-sm text-center">
						<p className="text-sm text-grey-darkest">{error}</p>
						<button
							onClick={() => navigate("/instructor")}
							className="mt-4 bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:brightness-95 transition duration-200"
						>
							Back to Instructor View
						</button>
					</div>
				</div>
			</>
		);
	}

	if (loading || !student) {
		return (
			<>
				<Header floating subtitle="View Workspace" />
				<div className="min-h-screen bg-grey-lighter pt-20 px-8 flex items-center justify-center">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-dark"></div>
						<p className="mt-4 text-grey-dark">Loading workspace...</p>
					</div>
				</div>
			</>
		);
	}

	const viewLabel = viewingLive
		? `${studentName}'s Live Workspace`
		: `${studentName} — ${selectedSubmission?.name || "Submission"}`;

	return (
		<>
			<Header
				onMenuOpen={() => setLeftMenuOpen((prev) => !prev)}
				floating
				menuOpen={leftMenuOpen}
				subtitle="Instructor"
				pillLink="/instructor"
				extraContent={
					<>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<button className="flex items-center gap-2 bg-bama-crimson text-white text-sm rounded-full px-3 py-1 whitespace-nowrap shadow-lg hover:brightness-95 transition duration-200">
									Viewing: {studentName}
									<svg
										className="fill-current h-4 w-4"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
									>
										<path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
									</svg>
								</button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									className="mt-1 shadow-lg z-[500] bg-white rounded-lg py-1 min-w-[200px] max-h-[400px] overflow-y-auto"
									sideOffset={4}
									align="start"
								>
									<DropdownMenu.Item
										className="block w-full text-left text-sm !font-light text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
										onSelect={() => navigate("/instructor")}
									>
										Back to Instructor View
									</DropdownMenu.Item>
									<DropdownMenu.Separator className="h-px bg-grey-lightest my-1" />
									<DropdownMenu.Label className="px-3 py-1 text-xs text-gray-400 font-medium">
										View another workspace
									</DropdownMenu.Label>
									{allUsers.map((user) => (
										<DropdownMenu.Item
											key={user.id}
											className={`block w-full text-left text-sm !font-light text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none ${user.id === studentId ? "font-bold bg-grey-lighter" : ""}`}
											onSelect={() => {
												if (user.id !== studentId) {
													navigate(`/workspace/${user.id}`);
												}
											}}
										>
											{user.username} ({user.first_name} {user.last_name})
										</DropdownMenu.Item>
									))}
									{allUsers.length === 0 && (
										<div className="px-3 py-1.5 text-xs text-gray-400">
											No students found
										</div>
									)}
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>

						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<button className="flex items-center gap-2 bg-white text-grey-darkest text-sm rounded-full px-3 py-1 whitespace-nowrap shadow-lg border border-grey-light hover:bg-grey-lighter transition duration-200">
									{viewLabel}
									<span className="text-xs text-grey-dark">
										({submissions.length}/{submissionLimit})
									</span>
									<svg
										className="fill-current h-4 w-4"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
									>
										<path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
									</svg>
								</button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									className="mt-1 shadow-lg z-[500] bg-white rounded-lg py-1 min-w-[240px] max-h-[400px] overflow-y-auto"
									sideOffset={4}
									align="start"
								>
									<DropdownMenu.Label className="px-3 py-1 text-xs text-gray-400 font-medium">
										Canvas version
									</DropdownMenu.Label>
									<DropdownMenu.Item
										className={`block w-full text-left text-sm !font-light text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none ${viewingLive ? "font-bold bg-grey-lighter" : ""}`}
										onSelect={() => setSelectedSubmissionId(null)}
									>
										Live workspace
									</DropdownMenu.Item>
									<DropdownMenu.Separator className="h-px bg-grey-lightest my-1" />
									{submissions.length === 0 && (
										<div className="px-3 py-1.5 text-xs text-gray-400">
											No submissions yet
										</div>
									)}
									{submissions.map((sub) => (
										<DropdownMenu.Item
											key={sub.id}
											className={`block w-full text-left text-sm !font-light text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none ${selectedSubmissionId === sub.id ? "font-bold bg-grey-lighter" : ""}`}
											onSelect={() => setSelectedSubmissionId(sub.id)}
										>
											<div>{sub.name}</div>
											<div className="text-xs text-grey-dark">
												{new Date(sub.created_at).toLocaleString()}
											</div>
										</DropdownMenu.Item>
									))}
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>

						{viewingLive && (
							<button
								onClick={handleGiveFeedback}
								className="bg-red-400 text-sm text-white rounded-full px-3 py-1 shadow-lg hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 whitespace-nowrap"
							>
								Give Feedback
							</button>
						)}
					</>
				}
			/>

			{leftMenuOpen && (
				<>
					<div
						className="fixed inset-0 bg-black/30 z-[400]"
						onClick={() => setLeftMenuOpen(false)}
					/>
					<div className="fixed top-0 left-0 bottom-0 w-1/5 min-w-[320px] bg-grey-lighter-2 shadow-xl z-[401] overflow-y-auto pt-8">
						<CompactSidebar
							setCenterNarrativePatternsOpen={() => setLeftMenuOpen(false)}
						/>
						<div id="footer" className="flex flex-col justify-start items-start mb-6">
							<Footer />
						</div>
					</div>
				</>
			)}

			<div className="h-screen">
				<Workspace
					key={`${refreshKey}-${selectedSubmissionId ?? "live"}`}
					setRightNarrativePatternsOpen={() => {}}
					setSelectedPattern={setSelectedPattern}
					selectedPattern={selectedPattern}
					storyLoading={false}
					setStoryLoading={() => {}}
					readOnly={true}
					targetUser={studentId}
					submissionId={selectedSubmissionId ?? undefined}
					hideToolbar={true}
				/>
			</div>

			<div
				className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 z-[300] flex flex-col bg-bama-crimson rounded-t-xl shadow-2xl transition-all duration-300 ${
					dataStoriesExpanded ? "max-h-[75vh]" : "max-h-[32px]"
				}`}
			>
				<button
					className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-white hover:brightness-110 rounded-t-xl transition-colors duration-150 flex-shrink-0"
					onClick={() => setDataStoriesExpanded(!dataStoriesExpanded)}
				>
					<svg
						className={`w-3 h-3 transition-transform duration-300 ${dataStoriesExpanded ? "rotate-180" : ""}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 15l7-7 7 7"
						/>
					</svg>
					{dataStoriesExpanded ? "Collapse" : "Expand"} Story
				</button>
				<div
					className={`flex-1 min-h-0 overflow-y-auto px-1 pb-1 ${dataStoriesExpanded ? "" : "hidden"}`}
				>
					<div className="bg-grey-lighter-2 rounded-lg px-4 pb-4">
						<DataStories
							key={selectedSubmissionId ?? "live"}
							targetUser={studentId}
							submissionId={selectedSubmissionId ?? undefined}
							readOnly={true}
						/>
					</div>
				</div>
			</div>
		</>
	);
};

export default ViewWorkspace;
