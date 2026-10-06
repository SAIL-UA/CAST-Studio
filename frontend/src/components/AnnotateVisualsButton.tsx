// Import dependencies
import { useState, useRef, useEffect, useCallback } from "react";
import { generateDescription, getImageDataAll } from "@/services/api";
import { logAction } from "@/utils/userActionLogger";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAlert } from "@/contexts/Alert";
import { useGuestTourOpen } from "@/utils/useGuestTourOpen";
import type { ImageData } from "@/types/types";
import { Pencil, ChevronDown, ChevronRight } from "lucide-react";

// Legacy placeholder text — kept for backward compatibility with existing images
const DESCRIPTION_PLACEHOLDER = "Ask AI to create a description for this visual.";
const POLL_INTERVAL_MS = 2500;

type AnnotateVisualsButtonProps = {
	images: ImageData[];
	storyLoading?: boolean;
	onDescriptionsUpdated?: () => void | Promise<void>;
};

const AnnotateVisualsButton = ({
	images,
	storyLoading = false,
	onDescriptionsUpdated,
}: AnnotateVisualsButtonProps) => {
	const { annotateWithAI } = useFeatureFlags();
	const { showAlert } = useAlert();
	const [aiRunning, setAiRunning] = useState(false);
	const [progress, setProgress] = useState(0);
	const isDisabled = aiRunning || storyLoading;

	// Force-open during the guest tour screen for annotate
	const tourOpen = useGuestTourOpen("annotate");
	const [userOpen, setUserOpen] = useState(false);
	const menuOpen = tourOpen || userOpen;

	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stopPolling = useCallback(() => {
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => stopPolling();
	}, [stopPolling]);

	const needsDescription = (img: ImageData) => {
		const desc = img.long_desc;
		return !desc || desc.trim() === "" || desc === DESCRIPTION_PLACEHOLDER;
	};

	const runAiGeneration = async (imagesToProcess: ImageData[]) => {
		const total = imagesToProcess.length;
		setProgress(10);
		setAiRunning(true);

		for (const image of imagesToProcess) {
			try {
				await generateDescription(image.id);
			} catch (err) {
				console.error("Error starting description generation for image", image.id, err);
			}
		}

		pollRef.current = setInterval(async () => {
			try {
				const response = await getImageDataAll();
				const backendImages: ImageData[] = response.data.images;
				const storyboardImages = backendImages.filter(
					(img: ImageData) => img.in_storyboard,
				);

				const describedCount = storyboardImages.filter((img: ImageData) => {
					const desc = img.long_desc;
					return desc && desc.trim() !== "" && desc !== DESCRIPTION_PLACEHOLDER;
				}).length;

				const totalStoryboard = storyboardImages.length;
				const rawPct =
					totalStoryboard > 0 ? Math.round((describedCount / totalStoryboard) * 100) : 0;
				setProgress(Math.max(10, rawPct));

				const stillGenerating = storyboardImages.some(
					(img: any) => img.long_desc_generating,
				);
				if (!stillGenerating || rawPct >= 100) {
					stopPolling();
					setProgress(100);

					logAction(
						{ actionType: "click", elementId: "annotate-visuals-ai-complete" },
						{ imagesProcessed: total },
					);

					setTimeout(async () => {
						setAiRunning(false);
						setProgress(0);
						if (onDescriptionsUpdated) {
							try {
								await onDescriptionsUpdated();
							} catch (err) {
								console.error(
									"Error refreshing images after AI descriptions:",
									err,
								);
							}
						}
					}, 500);
				}
			} catch (err) {
				console.error("Error polling for description progress:", err);
			}
		}, POLL_INTERVAL_MS);
	};

	const fetchFreshImages = async (): Promise<ImageData[]> => {
		try {
			const response = await getImageDataAll();
			return response.data?.images || [];
		} catch (err) {
			console.error("Error fetching image data:", err);
			return images || [];
		}
	};

	const handleAnnotateAll = async () => {
		logAction(
			{ actionType: "click", elementId: "annotate-visuals-ai-all" },
			{ annotate_mode: "ai_all" },
		);

		const freshImages = await fetchFreshImages();
		const activeImageSet = freshImages.filter(
			(img: ImageData) => img.in_storyboard && img.filepath,
		);
		if (activeImageSet.length === 0) {
			showAlert({ level: "info", message: "There are no images in the Workspace." });
			return;
		}

		await runAiGeneration(activeImageSet);
	};

	const handleAnnotateMissing = async () => {
		logAction(
			{ actionType: "click", elementId: "annotate-visuals-ai-missing" },
			{ annotate_mode: "ai_missing" },
		);

		const freshImages = await fetchFreshImages();
		const activeImageSet = freshImages.filter(
			(img: ImageData) => img.in_storyboard && img.filepath,
		);
		if (activeImageSet.length === 0) {
			showAlert({ level: "info", message: "There are no images in the Workspace." });
			return;
		}

		const missing = activeImageSet.filter(needsDescription);
		if (missing.length === 0) {
			showAlert({ level: "info", message: "All visuals already have descriptions." });
			return;
		}

		await runAiGeneration(missing);
	};

	const handleCreateManually = () => {
		logAction(
			{ actionType: "click", elementId: "annotate-visuals-manual-option" },
			{ annotate_mode: "manual" },
		);
		showAlert({
			level: "info",
			message:
				"Click the description boxes of a visual, or click Edit in the top-right corner to annotate.",
		});
	};

	const baseColor = "#005c84";
	const fillColor = "#005c84";
	const bgColor = aiRunning ? "#005c8466" : baseColor;

	return (
		<DropdownMenu.Root open={menuOpen} onOpenChange={setUserOpen}>
			<DropdownMenu.Trigger asChild disabled={isDisabled}>
				<button
					id="annotate-visuals-button"
					log-id="annotate-visuals-button"
					data-tour-target="annotate"
					className="relative overflow-hidden flex items-center text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					style={{ backgroundColor: bgColor }}
					disabled={isDisabled}
				>
					{aiRunning && (
						<div
							className="absolute top-0 left-0 h-full transition-[width] duration-500 ease-out"
							style={{
								width: `${progress}%`,
								backgroundColor: fillColor,
							}}
						/>
					)}
					<span className="invisible whitespace-nowrap flex items-center gap-2">
						<Pencil className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
						Annotate
						<ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
					</span>
					<span className="absolute inset-0 flex items-center justify-center z-10 gap-2">
						<Pencil className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
						Annotate
						{!aiRunning && (
							<ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
						)}
					</span>
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					className="mt-1 ml-1 shadow-lg z-400 bg-white rounded-lg py-1 min-w-50 overflow-visible"
					sideOffset={4}
					align="start"
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					{/* Create with AI — with submenu (hidden when feature is disabled) */}
					{annotateWithAI && (
						<>
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none items-center justify-between gap-2">
									Create with AI
									<ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden />
								</DropdownMenu.SubTrigger>
								<DropdownMenu.Portal>
									<DropdownMenu.SubContent
										className="ml-1 shadow-lg z-401 bg-white rounded-lg py-1 min-w-45 whitespace-nowrap"
										sideOffset={4}
									>
										<DropdownMenu.Item
											className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
											log-id="annotate-visuals-ai-all"
											onSelect={(e) => {
												e.preventDefault();
												handleAnnotateAll();
											}}
										>
											All visuals
										</DropdownMenu.Item>
										<div className="h-px mx-3 bg-grey" />
										<DropdownMenu.Item
											className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
											log-id="annotate-visuals-ai-missing"
											onSelect={(e) => {
												e.preventDefault();
												handleAnnotateMissing();
											}}
										>
											Visuals missing descriptions
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Portal>
							</DropdownMenu.Sub>
							<div className="h-px mx-3 bg-grey" />
						</>
					)}

					{/* Create Manually */}
					<DropdownMenu.Item
						className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
						log-id="annotate-visuals-manual-option"
						onSelect={(e) => {
							e.preventDefault();
							handleCreateManually();
						}}
					>
						Create Manually
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
};

export default AnnotateVisualsButton;
