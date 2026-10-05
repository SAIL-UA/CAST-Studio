// Import dependencies
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, House, Tags } from "lucide-react";
import { logAction } from "@/utils/userActionLogger";

// Define props interface
type CompactSidebarProps = {
	setCenterNarrativePatternsOpen:
		| React.Dispatch<React.SetStateAction<boolean>>
		| ((val: boolean) => void);
};

const CompactSidebar = ({ setCenterNarrativePatternsOpen }: CompactSidebarProps) => {
	const navigate = useNavigate();
	const [tutorialsOpen, setTutorialsOpen] = useState(true);

	const toggleDropdown = (e: React.MouseEvent) => {
		logAction(e);
		setTutorialsOpen(!tutorialsOpen);
	};

	const handleDropdownSelection = (e: React.MouseEvent) => {
		logAction(e);
	};

	return (
		<div
			id="nav-dropdown-container"
			className="flex flex-col mt-10 mx-8 font-roboto-regular text-indigo-darkest"
		>
			<ul className="space-y-4 text-sm font-sans">
				<li
					log-id="compact-nav-home"
					className="cursor-pointer hover:text-indigo"
					onClick={(e) => {
						logAction(e);
						setCenterNarrativePatternsOpen(false);
						navigate("/");
					}}
				>
					<span className="flex items-center justify-start">
						<House className="w-4 h-4 mr-2" strokeWidth={1.5} aria-hidden />
						Home
					</span>
				</li>

				<li
					log-id="compact-nav-get-started"
					className="cursor-pointer flex justify-between items-center hover:text-indigo"
					onClick={toggleDropdown}
				>
					<span className="flex items-center justify-start">
						<Tags className="w-4 h-4 mr-2" strokeWidth={1.5} aria-hidden />
						Get Started
					</span>
					<span
						className={`flex items-center justify-end transition-transform duration-300 ease-in ${tutorialsOpen ? "rotate-180" : "rotate-0"}`}
					>
						<ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
					</span>
				</li>

				<ul
					className={` ml-4 pl-4 border-l border-grey space-y-1
                        dropdown-open text-grey-dark
                        ${tutorialsOpen ? "dropdown-open-active" : "hidden"}
                    `}
				>
					<li
						log-id="compact-nav-tutorial-gather-data"
						className="cursor-pointer hover:text-indigo-dark"
						onClick={(e) => {
							logAction(e);
							setCenterNarrativePatternsOpen(false);
							navigate("/tutorials", { state: { targetId: "tutorial_one" } });
						}}
					>
						Gather Data Visualizations
					</li>
					<li
						log-id="compact-nav-tutorial-create-insights"
						className="cursor-pointer hover:text-indigo-dark"
						onClick={(e) => {
							logAction(e);
							setCenterNarrativePatternsOpen(false);
							navigate("/tutorials", { state: { targetId: "tutorial_two" } });
						}}
					>
						Create Data Insights
					</li>
					<li
						log-id="compact-nav-tutorial-generate-structure"
						className="cursor-pointer hover:text-indigo-dark"
						onClick={(e) => {
							logAction(e);
							setCenterNarrativePatternsOpen(false);
							navigate("/tutorials", { state: { targetId: "tutorial_three" } });
						}}
					>
						Generate Narrative Structure
					</li>
					<li
						log-id="compact-nav-tutorial-generate-story"
						className="cursor-pointer hover:text-indigo-dark"
						onClick={(e) => {
							logAction(e);
							setCenterNarrativePatternsOpen(false);
							navigate("/tutorials", { state: { targetId: "tutorial_four" } });
						}}
					>
						Generate Data Story
					</li>
				</ul>

				<li
					log-id="compact-nav-jupyterhub"
					className="cursor-pointer hover:text-indigo"
					onClick={handleDropdownSelection}
				>
					<span className="flex items-center justify-start">
						<House className="w-4 h-4 mr-2" strokeWidth={1.5} aria-hidden />
						<a
							href="https://cast-storystudio.com/jupyterhub"
							target="_blank"
							rel="noreferrer"
						>
							Return to JupyterHub
						</a>
					</span>
				</li>
			</ul>
		</div>
	);
};

export default CompactSidebar;
