// Import dependencies
import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { logAction } from "@/utils/userActionLogger";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useGuestTourOpen } from "@/utils/useGuestTourOpen";
import { Rows2, ChevronDown, Check } from "lucide-react";

type GenerateStoryButtonProps = {
	setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
	selectedPattern: string;
	storyLoading: boolean;
};

// Generate story button component
const GenerateStoryButton = ({
	setRightNarrativePatternsOpen,
	setSelectedPattern,
	selectedPattern,
	storyLoading,
}: GenerateStoryButtonProps) => {
	const { selectWithAI } = useFeatureFlags();

	// Force-open during the guest tour screen for narrative
	const tourOpen = useGuestTourOpen("narrative");
	const [userOpen, setUserOpen] = useState(false);
	const menuOpen = tourOpen || userOpen;

	// Reset stale AI pattern if feature is disabled
	useEffect(() => {
		if (!selectWithAI && selectedPattern === "AI Assistance") {
			setSelectedPattern("");
		}
	}, [selectWithAI, selectedPattern, setSelectedPattern]);

	// Handle generate story
	const handleAIStoryGeneration = async () => {
		setSelectedPattern("AI Assistance");
		logAction(
			{ actionType: "click", elementId: "select-narrative-ai-button" },
			{ narrative_pattern: "AI Assistance" },
		);
	};

	// Handle select manually
	const handleSelectManually = () => {
		logAction({ actionType: "click", elementId: "select-narrative-manually-button" });
		setRightNarrativePatternsOpen(true);
	};

	// Format pattern name for display
	const formatPatternName = (pattern: string) => {
		if (pattern === "") {
			return "Select Narrative";
		} else if (pattern === "AI Assistance") {
			return "AI Assistance";
		} else {
			return pattern
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");
		}
	};

	// Derive selection state
	const isAISelected = selectedPattern === "AI Assistance";
	const isManualSelected = selectedPattern !== "" && selectedPattern !== "AI Assistance";
	const currentNarrativeLabel =
		selectedPattern === "" ? "None" : formatPatternName(selectedPattern);

	// Tick mark component
	const Tick = () => (
		<Check className="w-3.5 h-3.5 mr-1.5 inline-block" strokeWidth={3} aria-hidden />
	);

	// Visible component
	return (
		<DropdownMenu.Root open={menuOpen} onOpenChange={setUserOpen}>
			<DropdownMenu.Trigger asChild disabled={storyLoading}>
				<button
					id="select-narrative-button"
					data-tour-target="narrative"
					className="flex items-center whitespace-nowrap bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={storyLoading}
				>
					<span className="flex items-center justify-center gap-2">
						<Rows2 className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
						{storyLoading ? "Generating..." : "Select Narrative"}
						<ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
					</span>
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					className="mt-1 ml-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[200px]"
					sideOffset={4}
					align="start"
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					{selectWithAI && (
						<>
							<DropdownMenu.Item
								className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
								log-id="select-narrative-ai-button"
								onSelect={() => handleAIStoryGeneration()}
							>
								{isAISelected && <Tick />}
								Select With AI
							</DropdownMenu.Item>
							<div className="h-px mx-3 bg-grey" />
						</>
					)}
					<DropdownMenu.Item
						className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
						log-id="select-narrative-manually-button"
						onSelect={() => handleSelectManually()}
					>
						{isManualSelected && <Tick />}
						Select Manually
					</DropdownMenu.Item>
					<div className="h-px mx-3 bg-grey" />
					<div className="px-3 py-1.5 text-xs text-grey-dark">
						Current Narrative:{" "}
						<span className="font-medium text-grey-darkest">
							{currentNarrativeLabel}
						</span>
					</div>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
};

export default GenerateStoryButton;
