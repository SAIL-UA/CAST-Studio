// Import dependencies
import { useState, useRef, useEffect, useCallback } from "react";
import { generateDescription, getImageDataAll } from "../services/api";
import { logAction } from "../utils/userActionLogger";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { useGuestTourOpen } from "../utils/useGuestTourOpen";
import type { ImageData } from "../types/types";

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
	const [manualModalOpen, setManualModalOpen] = useState(false);
	const [alertModal, setAlertModal] = useState<string | null>(null);
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
			setAlertModal("There are no images in the Workspace.");
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
			setAlertModal("There are no images in the Workspace.");
			return;
		}

		const missing = activeImageSet.filter(needsDescription);
		if (missing.length === 0) {
			setAlertModal("All visuals already have descriptions.");
			return;
		}

		await runAiGeneration(missing);
	};

	const handleCreateManually = () => {
		logAction(
			{ actionType: "click", elementId: "annotate-visuals-manual-option" },
			{ annotate_mode: "manual" },
		);
		setManualModalOpen(true);
	};

	const closeManualModal = (e?: React.MouseEvent) => {
		if (e) {
			logAction(e);
		}
		setManualModalOpen(false);
	};

	const baseColor = "#005c84";
	const fillColor = "#005c84";
	const bgColor = aiRunning ? "#005c8466" : baseColor;

	return (
		<>
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
							<svg
								width="14"
								height="14"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
								<path d="M9.5 3.5l3 3" />
							</svg>
							Annotate
							<svg
								className="fill-current h-4 w-4"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
							>
								<path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
							</svg>
						</span>
						<span className="absolute inset-0 flex items-center justify-center z-10 gap-2">
							<svg
								width="14"
								height="14"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
								<path d="M9.5 3.5l3 3" />
							</svg>
							Annotate
							{!aiRunning && (
								<svg
									className="fill-current h-4 w-4"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
								>
									<path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
								</svg>
							)}
						</span>
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						className="mt-1 ml-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[200px] overflow-visible"
						sideOffset={4}
						align="start"
						onCloseAutoFocus={(e) => e.preventDefault()}
					>
						{/* Create with AI — with submenu (hidden when feature is disabled) */}
						{annotateWithAI && (
							<>
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none flex items-center justify-between gap-2">
										Create with AI
										<svg
											className="fill-current h-3 w-3"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
										>
											<path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"></path>
										</svg>
									</DropdownMenu.SubTrigger>
									<DropdownMenu.Portal>
										<DropdownMenu.SubContent
											className="ml-1 shadow-lg z-[401] bg-white rounded-lg py-1 min-w-[180px] whitespace-nowrap"
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

			{/* Alert Modal */}
			{alertModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[500]">
					<div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
						<div className="space-y-4 text-sm text-grey-darkest">
							<p>{alertModal}</p>
						</div>
						<div className="mt-6 text-right">
							<button
								log-id="annotate-alert-ok-button"
								onClick={() => setAlertModal(null)}
								className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
							>
								OK
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Manual Modal */}
			{manualModalOpen && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[500]">
					<div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-bold">Annotate Visuals Manually</h2>
							<button
								log-id="close-annotate-visuals-modal-button"
								onClick={closeManualModal}
								className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-all duration-150"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<div className="space-y-4 text-sm text-grey-darkest">
							<p>
								Click the description boxes of a visual, or click{" "}
								<span className="font-semibold">Edit</span> in the top-right corner
								to annotate.
							</p>
						</div>

						<div className="mt-6 text-right">
							<button
								log-id="annotate-visuals-modal-close-button"
								onClick={closeManualModal}
								className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
							>
								Got it
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default AnnotateVisualsButton;
