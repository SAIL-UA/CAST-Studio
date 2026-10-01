import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "@/contexts/Alert";
import { useAuth } from "@/contexts/Auth";
import {
	getFeatureFlags,
	updateFeatureFlags,
	getInstructorUsers,
	exportWorkspaceReport,
	getEngagementReport,
	getAssignments,
	createAssignment,
	updateAssignment,
	exportAssignmentGrades,
	type AssignmentRecord,
} from "@/services/api";
import Header from "@/components/Header";
import CompactSidebar from "@/components/CompactSidebar";
import Footer from "@/components/Footer";
import AssignmentEditor from "@/components/AssignmentEditor";

type UserRow = {
	id: string;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	is_instructor: boolean;
	last_modified: string | null;
	submission_count?: number;
	submission_limit?: number;
};

type SortColumn = string;
type SortDirection = "asc" | "desc";

const formatDate = (iso: string | null) => {
	if (!iso) return "—";
	const d = new Date(iso);
	return (
		d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
		", " +
		d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
	);
};

const Instructor = () => {
	const navigate = useNavigate();
	const { showAlert } = useAlert();
	const { userAuthenticated, isInstructor } = useAuth();

	const [leftMenuOpen, setLeftMenuOpen] = useState(false);
	const [annotateWithAI, setAnnotateWithAI] = useState(true);
	const [selectWithAI, setSelectWithAI] = useState(true);
	const [users, setUsers] = useState<UserRow[]>([]);
	const [saving, setSaving] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [engagementData, setEngagementData] = useState<any[] | null>(null);
	const [engagementCategories, setEngagementCategories] = useState<string[]>([]);
	const [activeTab, setActiveTab] = useState<"accounts" | "engagement" | "assignments">(
		"accounts",
	);
	const [sortColumn, setSortColumn] = useState<SortColumn>("last_name");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
	const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
	const [loadingAssignments, setLoadingAssignments] = useState(false);
	const [assignmentView, setAssignmentView] = useState<"list" | "create" | "edit">("list");
	const [editingAssignment, setEditingAssignment] = useState<AssignmentRecord | null>(null);
	const [savingAssignment, setSavingAssignment] = useState(false);
	const [togglingId, setTogglingId] = useState<string | null>(null);

	// Redirect non-instructor users
	useEffect(() => {
		if (!userAuthenticated) {
			navigate("/login");
		} else if (!isInstructor) {
			navigate("/home");
		}
	}, [userAuthenticated, isInstructor, navigate]);

	// Load feature flags and users
	useEffect(() => {
		const load = async () => {
			try {
				const flags = await getFeatureFlags();
				setAnnotateWithAI(flags.annotate_with_ai ?? true);
				setSelectWithAI(flags.select_with_ai ?? true);
			} catch (err) {
				console.error("Error loading feature flags:", err);
			}

			try {
				const data = await getInstructorUsers();
				setUsers(data.users || []);
			} catch (err) {
				console.error("Error loading users:", err);
			}
		};

		if (isInstructor) load();
	}, [isInstructor]);

	const loadAssignments = async () => {
		setLoadingAssignments(true);
		try {
			const data = await getAssignments();
			setAssignments(data.assignments || []);
			setAssignmentsLoaded(true);
		} catch (err) {
			console.error("Error loading assignments:", err);
			showAlert({
				level: "error",
				message: "An error occurred while loading assignments.",
			});
		} finally {
			setLoadingAssignments(false);
		}
	};

	useEffect(() => {
		if (isInstructor && activeTab === "assignments" && !assignmentsLoaded) {
			loadAssignments();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isInstructor, activeTab, assignmentsLoaded]);

	const handleAssignmentTab = () => {
		setActiveTab("assignments");
		setAssignmentView("list");
		setEditingAssignment(null);
	};

	const handleToggleActive = async (assignment: AssignmentRecord) => {
		setTogglingId(assignment.id);
		try {
			const result = await updateAssignment(assignment.id, {
				is_active: !assignment.is_active,
			});
			setAssignments((prev) => {
				const updated = prev.map((a) =>
					a.id === assignment.id ? result.assignment : a,
				);
				if (result.assignment.is_active) {
					return updated.map((a) =>
						a.id === result.assignment.id ? a : { ...a, is_active: false },
					);
				}
				return updated;
			});
		} catch (err) {
			console.error("Error toggling assignment:", err);
			showAlert({
				level: "error",
				message: "An error occurred while updating the assignment.",
			});
		} finally {
			setTogglingId(null);
		}
	};

	const handleSaveAssignment = async (data: {
		title: string;
		body: string;
		max_points: number;
		is_active: boolean;
	}) => {
		setSavingAssignment(true);
		try {
			if (assignmentView === "edit" && editingAssignment) {
				const result = await updateAssignment(editingAssignment.id, data);
				setAssignments((prev) => {
					const updated = prev.map((a) =>
						a.id === editingAssignment.id ? result.assignment : a,
					);
					// Server deactivates others when this one is active.
					if (result.assignment.is_active) {
						return updated.map((a) =>
							a.id === result.assignment.id ? a : { ...a, is_active: false },
						);
					}
					return updated;
				});
				showAlert({ level: "success", message: "Assignment updated." });
			} else {
				const result = await createAssignment(data);
				setAssignments((prev) => {
					const next = [result.assignment, ...prev];
					if (result.assignment.is_active) {
						return next.map((a) =>
							a.id === result.assignment.id ? a : { ...a, is_active: false },
						);
					}
					return next;
				});
				showAlert({ level: "success", message: "Assignment created." });
			}
			setAssignmentView("list");
			setEditingAssignment(null);
		} catch (err: any) {
			if (err?.response?.status === 403) {
				showAlert({ level: "error", message: "Not authorized." });
			} else {
				showAlert({
					level: "error",
					message: "An error occurred while saving the assignment.",
				});
			}
		} finally {
			setSavingAssignment(false);
		}
	};

	const handleDownloadGrades = async (assignment: AssignmentRecord) => {
		try {
			await exportAssignmentGrades(assignment.id);
		} catch (err) {
			console.error("Error exporting grades:", err);
			showAlert({
				level: "error",
				message: "An error occurred while exporting the grade report.",
			});
		}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await updateFeatureFlags({
				annotate_with_ai: annotateWithAI,
				select_with_ai: selectWithAI,
			});
			showAlert({
				level: "success",
				message: "Settings saved successfully.",
				onClose: () => navigate("/home"),
			});
		} catch (err: any) {
			if (err?.response?.status === 403) {
				showAlert({ level: "error", message: "Not authorized." });
			} else {
				showAlert({ level: "error", message: "An error occurred while saving settings." });
			}
		} finally {
			setSaving(false);
		}
	};

	const handleSort = (column: SortColumn) => {
		if (sortColumn === column) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortColumn(column);
			setSortDirection("asc");
		}
	};

	const sortedUsers = [...users].sort((a, b) => {
		const dir = sortDirection === "asc" ? 1 : -1;
		let aVal: string | number;
		let bVal: string | number;

		switch (sortColumn) {
			case "username":
				aVal = a.username.toLowerCase();
				bVal = b.username.toLowerCase();
				break;
			case "email":
				aVal = a.email.toLowerCase();
				bVal = b.email.toLowerCase();
				break;
			case "last_name":
				aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
				bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
				break;
			case "is_instructor":
				aVal = a.is_instructor ? 0 : 1;
				bVal = b.is_instructor ? 0 : 1;
				break;
			case "last_modified":
				aVal = a.last_modified || "";
				bVal = b.last_modified || "";
				break;
			default:
				// Handle numeric columns (categories, Total) from engagement data
				aVal = (a as any)[sortColumn] ?? 0;
				bVal = (b as any)[sortColumn] ?? 0;
				break;
		}

		if (aVal < bVal) return -1 * dir;
		if (aVal > bVal) return 1 * dir;
		return 0;
	});

	const SortArrow = ({ column }: { column: SortColumn }) => {
		if (sortColumn !== column)
			return <span className="text-bama-crimson ml-1">{"\u2195"}</span>;
		return (
			<span className="text-bama-crimson ml-1 text-[0.6em]">
				{sortDirection === "asc" ? "\u25B2" : "\u25BC"}
			</span>
		);
	};

	const thClass =
		"text-left p-3 font-medium text-grey-darkest cursor-pointer select-none hover:bg-grey-light transition-colors duration-100 whitespace-nowrap";

	if (!isInstructor) return null;

	return (
		<>
			<Header
				onMenuOpen={() => setLeftMenuOpen((prev) => !prev)}
				floating
				menuOpen={leftMenuOpen}
				subtitle="Instructor"
				pillLink="/instructor"
			/>

			{/* Left Panel */}
			{leftMenuOpen && (
				<>
					<div
						className="fixed inset-0 bg-black/30 z-400"
						onClick={() => setLeftMenuOpen(false)}
					/>
					<div className="fixed top-0 left-0 bottom-0 w-1/5 min-w-[320px] bg-grey-lighter-2 shadow-xl z-401 overflow-y-auto pt-8">
						<CompactSidebar
							setCenterNarrativePatternsOpen={() => setLeftMenuOpen(false)}
						/>
						<div id="footer" className="flex flex-col justify-start items-start mb-6">
							<Footer />
						</div>
					</div>
				</>
			)}

			<div className="min-h-screen bg-grey-lighter pt-20 px-8">
				{/* Feature Flags Section */}
				<div className="max-w-2xl mx-auto">
					<button
						onClick={() => navigate("/home")}
						className="text-sm text-bama-crimson hover:underline mb-4 inline-block"
					>
						← Back to Workspace
					</button>

					<h2 className="text-lg font-semibold text-grey-darkest mb-4">
						Select to enable StoryStudio features:
					</h2>
					<div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={annotateWithAI}
								onChange={(e) => setAnnotateWithAI(e.target.checked)}
								className="w-4 h-4 accent-bama-crimson"
							/>
							<span className="text-sm text-grey-darkest">
								Annotate visuals with AI
							</span>
						</label>
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={selectWithAI}
								onChange={(e) => setSelectWithAI(e.target.checked)}
								className="w-4 h-4 accent-bama-crimson"
							/>
							<span className="text-sm text-grey-darkest">
								Select narrative with AI
							</span>
						</label>
						<div className="pt-2">
							<button
								onClick={handleSave}
								disabled={saving}
								className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{saving ? "Saving..." : "Save Settings"}
							</button>
						</div>
					</div>
				</div>

				{/* Users Section — wider */}
				<div className="max-w-5xl mx-auto mt-8">
					{/* Tabs */}
					<div className="flex items-end justify-between mb-0">
						<div className="flex">
							<button
								onClick={() => setActiveTab("accounts")}
								className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-150 ${
									activeTab === "accounts"
										? "bg-white text-grey-darkest border border-grey-light border-b-white"
										: "bg-grey-lighter text-grey-dark hover:text-grey-darkest"
								}`}
							>
								User Accounts
							</button>
							<button
								onClick={() => setActiveTab("engagement")}
								className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-150 ${
									activeTab === "engagement"
										? "bg-white text-grey-darkest border border-grey-light border-b-white"
										: "bg-grey-lighter text-grey-dark hover:text-grey-darkest"
								}`}
							>
								User Engagement
							</button>
							<button
								onClick={handleAssignmentTab}
								className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-150 ${
									activeTab === "assignments"
										? "bg-white text-grey-darkest border border-grey-light border-b-white"
										: "bg-grey-lighter text-grey-dark hover:text-grey-darkest"
								}`}
							>
								Assignments
							</button>
						</div>
						{activeTab === "engagement" && (
							<div className="flex items-center gap-2 mb-1">
								<button
									onClick={async () => {
										setRefreshing(true);
										try {
											const data = await getEngagementReport();
											setEngagementData(data.users || []);
											setEngagementCategories(data.categories || []);
										} catch (err) {
											console.error("Error loading engagement data:", err);
											showAlert({
												level: "error",
												message:
													"An error occurred while loading engagement data.",
											});
										} finally {
											setRefreshing(false);
										}
									}}
									disabled={refreshing}
									className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{refreshing ? "Refreshing..." : "Refresh"}
								</button>
								<button
									onClick={async () => {
										setExporting(true);
										try {
											await exportWorkspaceReport();
										} catch (err) {
											console.error("Error exporting report:", err);
											showAlert({
												level: "error",
												message:
													"An error occurred while exporting the report.",
											});
										} finally {
											setExporting(false);
										}
									}}
									disabled={exporting}
									className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{exporting ? "Exporting..." : "Export User Engagement Report"}
								</button>
							</div>
						)}
						{activeTab === "assignments" && assignmentView === "list" && (
							<div className="flex items-center gap-2 mb-1">
								<button
									onClick={() => {
										setEditingAssignment(null);
										setAssignmentView("create");
									}}
									className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:translate-y-[-0.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
								>
									+ Create Assignment
								</button>
							</div>
						)}
					</div>

					{/* Tab content */}
					{activeTab === "accounts" && (
						<div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-grey-light overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-grey-lighter border-b border-grey-lightest">
										<th
											className={thClass}
											onClick={() => handleSort("username")}
										>
											Username
											<SortArrow column="username" />
										</th>
										<th className={thClass} onClick={() => handleSort("email")}>
											Email
											<SortArrow column="email" />
										</th>
										<th
											className={thClass}
											onClick={() => handleSort("last_name")}
										>
											Name
											<SortArrow column="last_name" />
										</th>
										<th
											className={thClass}
											onClick={() => handleSort("is_instructor")}
										>
											Role
											<SortArrow column="is_instructor" />
										</th>
										<th
											className={thClass}
											onClick={() => handleSort("last_modified")}
										>
											Last Modified
											<SortArrow column="last_modified" />
										</th>
										<th className="text-left p-3 font-medium text-grey-darkest">
											Submissions
										</th>
										<th className="text-left p-3 font-medium text-grey-darkest">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedUsers.map((user) => (
										<tr
											key={user.id}
											className="border-b border-grey-lightest hover:bg-grey-lighter"
										>
											<td className="p-3 text-grey-darkest">
												{user.username}
											</td>
											<td className="p-3 text-grey-darkest">{user.email}</td>
											<td className="p-3 text-grey-darkest">
												{user.first_name} {user.last_name}
											</td>
											<td className="p-3">
												<span
													className={`text-xs px-2 py-0.5 rounded-full ${user.is_instructor ? "bg-bama-crimson text-white" : "bg-grey-lighter text-grey-darkest"}`}
												>
													{user.is_instructor ? "Instructor" : "Student"}
												</span>
											</td>
											<td className="p-3 text-grey-darkest whitespace-nowrap">
												{formatDate(user.last_modified)}
											</td>
											<td className="p-3 text-grey-darkest whitespace-nowrap">
												{!user.is_instructor
													? `${user.submission_count ?? 0}/${user.submission_limit ?? 3}`
													: "—"}
											</td>
											<td className="p-3">
												{!user.is_instructor && (
													<button
														onClick={() =>
															window.open(
																`/workspace/${user.id}`,
																"_blank",
															)
														}
														className="bg-bama-crimson text-xs text-white rounded-full px-3 py-1 hover:brightness-95 transition duration-200"
													>
														View Workspace
													</button>
												)}
											</td>
										</tr>
									))}
									{users.length === 0 && (
										<tr>
											<td
												colSpan={7}
												className="p-3 text-center text-grey-dark"
											>
												No users found.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					)}

					{activeTab === "engagement" && (
						<div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-grey-light overflow-x-auto min-h-50">
							{engagementData === null ? (
								<p className="text-sm text-grey-dark text-center p-6">
									Click "Refresh" to load engagement data.
								</p>
							) : engagementData.length === 0 ? (
								<p className="text-sm text-grey-dark text-center p-6">
									No engagement data found.
								</p>
							) : (
								<table className="w-full text-sm">
									<thead>
										<tr className="bg-grey-lighter border-b border-grey-lightest">
											<th
												className={thClass}
												onClick={() => handleSort("username")}
											>
												Username
												<SortArrow column="username" />
											</th>
											<th
												className={thClass}
												onClick={() => handleSort("last_name")}
											>
												Name
												<SortArrow column="last_name" />
											</th>
											<th
												className={thClass}
												onClick={() => handleSort("Total")}
											>
												Total
												<SortArrow column="Total" />
											</th>
											{engagementCategories.map((cat) => (
												<th
													key={cat}
													className={`${thClass} text-xs`}
													onClick={() => handleSort(cat)}
												>
													{cat}
													<SortArrow column={cat} />
												</th>
											))}
											<th
												className={thClass}
												onClick={() => handleSort("last_modified")}
											>
												Last Modified
												<SortArrow column="last_modified" />
											</th>
										</tr>
									</thead>
									<tbody>
										{[...engagementData]
											.sort((a, b) => {
												const dir = sortDirection === "asc" ? 1 : -1;
												let aVal: string | number, bVal: string | number;
												if (sortColumn === "username") {
													aVal = a.username.toLowerCase();
													bVal = b.username.toLowerCase();
												} else if (sortColumn === "last_name") {
													aVal =
														`${a.last_name} ${a.first_name}`.toLowerCase();
													bVal =
														`${b.last_name} ${b.first_name}`.toLowerCase();
												} else if (sortColumn === "last_modified") {
													aVal = a.last_modified || "";
													bVal = b.last_modified || "";
												} else {
													aVal = a[sortColumn] ?? 0;
													bVal = b[sortColumn] ?? 0;
												}
												if (aVal < bVal) return -1 * dir;
												if (aVal > bVal) return 1 * dir;
												return 0;
											})
											.map((user: any) => (
												<tr
													key={user.username}
													className="border-b border-grey-lightest hover:bg-grey-lighter"
												>
													<td className="p-3 text-grey-darkest">
														{user.username}
													</td>
													<td className="p-3 text-grey-darkest whitespace-nowrap">
														{user.first_name} {user.last_name}
													</td>
													<td className="p-3 text-grey-darkest text-center font-medium">
														{user.Total || 0}
													</td>
													{engagementCategories.map((cat) => (
														<td
															key={cat}
															className="p-3 text-grey-darkest text-center"
														>
															{user[cat] || 0}
														</td>
													))}
													<td className="p-3 text-grey-darkest whitespace-nowrap">
														{formatDate(user.last_modified)}
													</td>
												</tr>
											))}
									</tbody>
								</table>
							)}
						</div>
					)}

					{activeTab === "assignments" &&
						(assignmentView === "create" || assignmentView === "edit" ? (
							<AssignmentEditor
								key={editingAssignment?.id ?? "new"}
								initial={editingAssignment}
								saving={savingAssignment}
								onSave={handleSaveAssignment}
								onCancel={() => {
									setAssignmentView("list");
									setEditingAssignment(null);
								}}
							/>
						) : (
							<div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-grey-light overflow-x-auto">
								{loadingAssignments ? (
									<p className="text-sm text-grey-dark text-center p-6">
										Loading assignments…
									</p>
								) : (
									<table className="w-full text-sm">
										<thead>
											<tr className="bg-grey-lighter border-b border-grey-lightest">
												<th className="text-left p-3 font-medium text-grey-darkest">
													Title
												</th>
												<th className="text-left p-3 font-medium text-grey-darkest">
													Max Points
												</th>
												<th className="text-left p-3 font-medium text-grey-darkest">
													Status
												</th>
												<th className="text-left p-3 font-medium text-grey-darkest">
													Last Modified
												</th>
												<th className="text-left p-3 font-medium text-grey-darkest">
													Actions
												</th>
											</tr>
										</thead>
										<tbody>
											{assignments.map((assignment) => (
												<tr
													key={assignment.id}
													className="border-b border-grey-lightest hover:bg-grey-lighter"
												>
													<td className="p-3 text-grey-darkest">
														{assignment.title}
													</td>
													<td className="p-3 text-grey-darkest">
														{assignment.max_points}
													</td>
													<td className="p-3">
														<label className="inline-flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																checked={assignment.is_active}
																disabled={
																	togglingId === assignment.id
																}
																onChange={() =>
																	handleToggleActive(assignment)
																}
																className="w-4 h-4 accent-bama-crimson"
															/>
															<span
																className={`text-xs px-2 py-0.5 rounded-full ${
																	assignment.is_active
																		? "bg-bama-crimson text-white"
																		: "bg-grey-lighter text-grey-darkest"
																}`}
															>
																{assignment.is_active
																	? "Active"
																	: "Inactive"}
															</span>
														</label>
													</td>
													<td className="p-3 text-grey-darkest whitespace-nowrap">
														{formatDate(assignment.last_modified)}
													</td>
													<td className="p-3">
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => {
																	setEditingAssignment(assignment);
																	setAssignmentView("edit");
																}}
																className="bg-bama-crimson text-xs text-white rounded-full px-3 py-1 hover:brightness-95 transition duration-200"
															>
																Edit
															</button>
															<button
																type="button"
																onClick={() =>
																	handleDownloadGrades(assignment)
																}
																className="bg-white text-xs text-grey-darkest border border-grey-light rounded-full px-3 py-1 hover:bg-grey-lighter transition duration-200"
															>
																Download grades
															</button>
														</div>
													</td>
												</tr>
											))}
											{assignments.length === 0 && (
												<tr>
													<td
														colSpan={5}
														className="p-3 text-center text-grey-dark"
													>
														No assignments yet. Click "+ Create
														Assignment" to add one.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								)}
							</div>
						))}
				</div>
			</div>
		</>
	);
};

export default Instructor;
