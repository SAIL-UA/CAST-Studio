// Import dependencies
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import {
	updateImageData as updateImageDataAPI,
	createGroup,
	getGroups,
	updateGroup,
	deleteGroup,
	createScaffold,
	getScaffolds,
	updateScaffold,
	deleteScaffold,
} from "../services/api";
import { logAction } from "../utils/userActionLogger";

// Import components
import UploadButton from "./UploadButton";
import GenerateStoryButton from "./GenerateStoryButton";
import CraftStoryButton from "./CraftStoryButton";
import GroupButton from "./GroupButton";
import FeedbackButton from "./FeedbackButton";
import CollaborateButton from "./CollaborateButton";
import AnnotateVisualsButton from "./AnnotateVisualsButton";
import GroupDiv from "./GroupDiv";
import Bin from "./Bin";
import DeleteAllButton from "./DeleteAllButton";
import ClearAllButton from "./ClearAllButton";
// import MobileMenuButton from './MobileMenuButton';
import RecycleBoard from "./Recycle";

// Import scaffolds
import CauseEffect from "./scaffolds/CauseEffect";
import QuestionAnswer from "./scaffolds/QuestionAnswer";
import ProblemSolution from "./scaffolds/ProblemSolution";
import TimeBased from "./scaffolds/TimeBased";
import FactorAnalysis from "./scaffolds/FactorAnalysis";
import OverviewToDetail from "./scaffolds/OverviewToDetail";
import Comparative from "./scaffolds/Comparative";
import ShockLead from "./scaffolds/ShockLead";
import WorkflowProcess from "./scaffolds/WorkflowProcess";
import Linear from "./scaffolds/Linear";
import InvertedPyramid from "./scaffolds/InvertedPyramid";

// Import types
import { ImageData, GroupData, ScaffoldData } from "../types/types";
import {
	SCAFFOLD_NUMBER_TO_PATTERN,
	SCAFFOLD_VALID_GROUP_NUMBERS,
} from "../types/scaffoldMappings";

// Define props interface
type StoryBoardProps = {
	setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
	selectedPattern: string;
	storyLoading: boolean;
	setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
	images: ImageData[];
	setImages: React.Dispatch<React.SetStateAction<ImageData[]>>;
	loading: boolean;
	fetchUserData: () => Promise<void>;
	refreshImageDataAfterStoryGeneration: () => Promise<void>;
	updateImageData: (imageId: string, data: Partial<ImageData>) => void;
	handleImageRecycle: (imageId: string) => void;
	handleImageRestore: (imageId: string) => void;
	readOnly?: boolean;
	targetUser?: string;
	readOnlyToolbar?: React.ReactNode;
	refreshTrigger?: number;
	onSessionChange?: (shareToken: string | null) => void;
	hideToolbar?: boolean;
};

// StoryBoard component
const StoryBoard = ({
	setRightNarrativePatternsOpen,
	setSelectedPattern,
	selectedPattern,
	storyLoading,
	setStoryLoading,
	images,
	setImages,
	loading,
	fetchUserData,
	refreshImageDataAfterStoryGeneration,
	updateImageData,
	handleImageRecycle,
	handleImageRestore,
	readOnly = false,
	targetUser,
	readOnlyToolbar,
	refreshTrigger,
	onSessionChange,
	hideToolbar = false,
}: StoryBoardProps) => {
	// States
	const [groupDivs, setGroupDivs] = useState<GroupData[]>([]);
	const [scaffolds, setScaffolds] = useState<ScaffoldData[]>([]);
	const [linearSlotOrders, setLinearSlotOrders] = useState<{ [scaffoldId: string]: number[] }>(
		{},
	);
	const [nextGroupNumber, setNextGroupNumber] = useState(1);
	const [zoomLevel, setZoomLevel] = useState(1.0);
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const [recycleBinOpen, setRecycleBinOpen] = useState(false);

	// References
	const storyBinRef = useRef<HTMLDivElement>(null);

	// Compute the center of the visible viewport in content coordinates
	const getVisibleCenter = () => {
		if (!storyBinRef.current) return { x: 100, y: 100 };
		const rect = storyBinRef.current.getBoundingClientRect();
		const centerX = (rect.width / 2 - panOffset.x) / zoomLevel;
		const centerY = (rect.height / 2 - panOffset.y) / zoomLevel;
		return { x: Math.max(0, centerX), y: Math.max(0, centerY) };
	};

	// Fetch groups from backend
	const fetchGroups = async (): Promise<GroupData[]> => {
		try {
			const fetchedGroups = await getGroups(undefined, targetUser);
			if (!fetchedGroups || fetchedGroups.length === 0) {
				setGroupDivs([]);
				return [];
			}

			// Derive cards from images array using group_id
			const groupsWithCards = fetchedGroups.map((group: any) => {
				// Filter images that belong to this group
				const fullCards = images
					.filter((img) => img.groupId === group.id)
					.map((card: ImageData) => ({
						...card,
						groupId: group.id, // Ensure groupId is set
					}));

				return {
					...group,
					cards: fullCards, // Derived from images state array
					scaffoldId: group.scaffold_id || undefined, // Transform snake_case to camelCase
					scaffold_group_number: group.scaffold_group_number || undefined, // Preserve scaffold_group_number from backend
				};
			});

			setGroupDivs(groupsWithCards);

			// Update nextGroupNumber to be max(group numbers) + 1
			const maxNumber = groupsWithCards.reduce(
				(max: number, group: GroupData) => Math.max(max, group.number),
				0,
			);
			setNextGroupNumber(maxNumber + 1);

			return groupsWithCards;
		} catch (error) {
			console.error("Error fetching groups:", error);
			return [];
		}
	};

	// Fetch scaffolds from backend
	const fetchScaffolds = async (groupsToUse?: GroupData[]) => {
		try {
			const fetchedScaffolds = await getScaffolds(undefined, targetUser);
			if (!fetchedScaffolds || fetchedScaffolds.length === 0) {
				setScaffolds([]);
				return;
			}

			// Use provided groups or fall back to state
			const groups = groupsToUse || groupDivs;

			// Build array of all scaffolds with their cards and groups
			const scaffoldsWithCards: ScaffoldData[] = fetchedScaffolds.map((scaffoldData: any) => {
				// Derive cards from images array using scaffold_id
				const scaffoldCards = images
					.filter((img) => img.scaffoldId === scaffoldData.id)
					.map((card: ImageData) => ({
						...card,
						scaffoldId: scaffoldData.id,
					}));

				// Derive groups that belong to this scaffold
				const scaffoldGroups = groups
					.filter((group) => group.scaffoldId === scaffoldData.id)
					.map((group: GroupData) => ({
						...group,
						cards: images
							.filter((img) => img.groupId === group.id)
							.map((card: ImageData) => ({
								...card,
								groupId: group.id,
							})),
					}));

				return {
					...scaffoldData,
					cards: scaffoldCards,
					groups: scaffoldGroups,
				};
			});

			setScaffolds(scaffoldsWithCards);
		} catch (error) {
			console.error("Error fetching scaffolds:", error);
		}
	};

	// Fetch groups and scaffolds after images are loaded
	useEffect(() => {
		const loadData = async () => {
			if (!loading) {
				// Fetch groups first, then scaffolds (scaffolds depend on groups)
				const groups = await fetchGroups();
				await fetchScaffolds(groups);
			}
		};
		loadData();
	}, [loading, images]);

	// Refetch groups and scaffolds when refreshTrigger changes (WebSocket workspace_update)
	useEffect(() => {
		if (refreshTrigger && refreshTrigger > 0) {
			const refresh = async () => {
				const groups = await fetchGroups();
				await fetchScaffolds(groups);
			};
			refresh();
		}
	}, [refreshTrigger]);

	// Listen for recycle bin open event from Header
	useEffect(() => {
		const handleOpenRecycleBin = () => setRecycleBinOpen(true);
		window.addEventListener("openRecycleBin", handleOpenRecycleBin);
		return () => window.removeEventListener("openRecycleBin", handleOpenRecycleBin);
	}, []);

	// Scaffold limit
	const MAX_SCAFFOLDS = 3;
	const [scaffoldLimitAlert, setScaffoldLimitAlert] = useState<string | null>(null);

	// Listen for scaffold creation events from SelectNarrativeButton
	useEffect(() => {
		const handleEvent = (e: Event) => {
			const pattern = (e as CustomEvent).detail?.pattern;
			if (pattern) handleCreateScaffold(pattern);
		};
		window.addEventListener("createScaffold", handleEvent);
		return () => window.removeEventListener("createScaffold", handleEvent);
	}, [scaffolds, readOnly]);

	// Create scaffold — called directly from SelectNarrativeButton via callback
	const handleCreateScaffold = async (pattern: string) => {
		if (readOnly) return;
		if (!pattern || pattern === "") return;

		// Enforce limit
		if (scaffolds.length >= MAX_SCAFFOLDS) {
			setScaffoldLimitAlert(
				"You are allowed a maximum of three narratives at one time. Remove an existing narrative to continue.",
			);
			return;
		}

		try {
			let initialX = 50;
			let initialY = 50;

			if (storyBinRef.current) {
				const rect = storyBinRef.current.getBoundingClientRect();
				initialX = rect.width / 2 - 250;
				initialY = 50 + scaffolds.length * 50; // Offset each scaffold so they don't stack
			}

			const response = await createScaffold(pattern, initialX, initialY);
			if (response.scaffold) {
				const newScaffold: ScaffoldData = {
					...response.scaffold,
					cards: [],
					groups: [],
				};
				setScaffolds((prev) => [...prev, newScaffold]);
			}
		} catch (error) {
			console.error("Error creating scaffold:", error);
		}
	};

	// Handle description updates
	const handleDescriptionsUpdate = (id: string, newShortDesc: string, newLongDesc: string) => {
		setImages((prevImages) =>
			prevImages.map((img) =>
				img.id === id ? { ...img, short_desc: newShortDesc, long_desc: newLongDesc } : img,
			),
		);
	};

	// Handle image deletion
	const handleDelete = async (imageId: string) => {
		// Immediately remove from local state for instant UI update
		setImages((prevImages) => prevImages.filter((img) => img.id !== imageId));

		// Then refresh from backend to ensure consistency
		await fetchUserData();
		const groups = await fetchGroups();
		await fetchScaffolds(groups);
	};

	// Handle creating new group div
	const handleCreateGroup = async (): Promise<GroupData | undefined> => {
		// Position new group at center of visible viewport (accounting for group size 320x256)
		const center = getVisibleCenter();
		const initialX = Math.max(0, center.x - 160);
		const initialY = Math.max(0, center.y - 128);

		try {
			// Create group in backend
			const response = await createGroup({
				number: nextGroupNumber,
				name: `Group ${nextGroupNumber}`,
				description: "",
				x: initialX,
				y: initialY,
			});

			if (response.status === 201 || response.status === 200) {
				const backendGroup = response.data.group;
				const newGroup: GroupData = {
					id: backendGroup.id,
					number: backendGroup.number,
					name: backendGroup.name,
					description: backendGroup.description,
					x: backendGroup.x,
					y: backendGroup.y,
					cards: [],
					created_at: backendGroup.created_at,
					last_modified: backendGroup.last_modified,
				};
				setGroupDivs((prev) => [...prev, newGroup]);
				// Groups update local state instead of refetching, so signal the research
				// questions panel directly — otherwise its link checklist misses the new group.
				window.dispatchEvent(new CustomEvent("workspaceCardsChanged"));
				setNextGroupNumber((prev) => prev + 1);
				return newGroup;
			}
		} catch (error) {
			console.error("Error creating group:", error);
		}
		return undefined;
	};

	// Handle closing a specific group div
	const handleCloseGroup = async (groupId: string) => {
		try {
			// Delete group from backend (automatically returns images to workspace)
			await deleteGroup(groupId);

			// Find all cards in this group and update their group_id to null
			const cardsInGroup = images.filter((img) => img.groupId === groupId);
			for (const card of cardsInGroup) {
				await updateImageDataAPI(card.id, { group_id: null, in_storyboard: true });
			}

			// Update local state: return all cards from this group to the workspace (preserve index)
			setImages((prev) =>
				prev.map((img) =>
					img.groupId === groupId
						? { ...img, groupId: undefined, in_storyboard: true, index: img.index }
						: img,
				),
			);

			// Remove group from local state
			setGroupDivs((prev) => {
				// Filter out the group to be removed
				const remainingGroups = prev.filter((group) => group.id !== groupId);

				// Renumber the remaining groups sequentially (1, 2, 3, ...)
				const renumberedGroups = remainingGroups.map((group, index) => ({
					...group,
					number: index + 1,
				}));

				return renumberedGroups;
			});

			// Update nextGroupNumber to be the count of remaining groups + 1
			setNextGroupNumber((prev) => {
				const remainingCount = groupDivs.filter((group) => group.id !== groupId).length;
				return remainingCount + 1;
			});

			// If group was in a scaffold, also update scaffold state
			const deletedGroup = groupDivs.find((g) => g.id === groupId);
			if (deletedGroup?.scaffoldId) {
				setScaffolds((prev) =>
					prev.map((s) =>
						s.id === deletedGroup.scaffoldId
							? { ...s, groups: s.groups.filter((g) => g.id !== groupId) }
							: s,
					),
				);
			}

			// Drop the group from the research questions link checklist too.
			window.dispatchEvent(new CustomEvent("workspaceCardsChanged"));
		} catch (error) {
			console.error("Error closing group:", error);
		}
	};

	// Handle adding card to group
	const handleCardAddToGroup = async (cardId: string, groupId: string) => {
		try {
			const cardToAdd = images.find((img) => img.id === cardId);
			if (!cardToAdd) return;

			// Check if card is already in the group (using local state)
			if (cardToAdd.groupId === groupId) {
				console.log(`Card ${cardId} already in group ${groupId}, skipping`);
				return;
			}

			// Only update image's group_id - no need to update group.cards
			await updateImageDataAPI(cardId, { group_id: groupId });

			// Update local state: update the card's groupId (preserve index)
			setImages((prev) =>
				prev.map((img) =>
					img.id === cardId ? { ...img, groupId: groupId, index: img.index } : img,
				),
			);

			// Update group's cards array by deriving from updated images
			// The cards will be automatically updated when fetchGroups runs or we can derive here
			setGroupDivs((prev) =>
				prev.map((group) => {
					if (group.id === groupId) {
						// Derive cards from images with this groupId
						const updatedCards = images
							.filter((img) => img.id === cardId || img.groupId === groupId)
							.map((img) => ({
								...img,
								groupId: groupId,
							}));

						return {
							...group,
							cards: updatedCards,
							last_modified: new Date().toISOString(),
						};
					}
					return group;
				}),
			);
		} catch (error) {
			console.error("Error adding image to group:", error);
		}
	};

	// Handle removing card from group
	const handleCardRemoveFromGroup = async (cardId: string, groupId: string) => {
		try {
			// Only update image's group_id to null - no need to update group.cards
			await updateImageDataAPI(cardId, { group_id: null, in_storyboard: true });

			// Update local state: update the card's groupId to null (preserve index)
			setImages((prev) =>
				prev.map((img) =>
					img.id === cardId
						? { ...img, groupId: undefined, in_storyboard: true, index: img.index }
						: img,
				),
			);

			// Update group's cards array by deriving from updated images
			setGroupDivs((prev) =>
				prev.map((group) => {
					if (group.id === groupId) {
						// Derive cards from images with this groupId (excluding the removed one)
						const updatedCards = images
							.filter((img) => img.id !== cardId && img.groupId === groupId)
							.map((img) => ({
								...img,
								groupId: groupId,
							}));

						return {
							...group,
							cards: updatedCards,
							last_modified: new Date().toISOString(),
						};
					}
					return group;
				}),
			);
		} catch (error) {
			console.error("Error removing card from group:", error);
		}
	};

	// Handle group name change
	const handleGroupNameChange = async (groupId: string, newName: string) => {
		try {
			// Update group name in backend
			await updateGroup(groupId, { name: newName });

			// Update local state
			setGroupDivs((prev) =>
				prev.map((group) =>
					group.id === groupId
						? { ...group, name: newName, last_modified: new Date().toISOString() }
						: group,
				),
			);
		} catch (error) {
			console.error("Error updating group name:", error);
		}
	};

	// Handle group description change
	const handleGroupDescriptionChange = async (groupId: string, newDescription: string) => {
		try {
			// Update group description in backend
			await updateGroup(groupId, { description: newDescription });

			// Update local state
			setGroupDivs((prev) =>
				prev.map((group) =>
					group.id === groupId
						? {
								...group,
								description: newDescription,
								last_modified: new Date().toISOString(),
							}
						: group,
				),
			);
		} catch (error) {
			console.error("Error updating group description:", error);
		}
	};

	// Handle batch group updates (for modal save)
	const handleGroupUpdate = async (
		groupId: string,
		updates: { name?: string; description?: string },
	) => {
		try {
			// Only include changed fields
			if (Object.keys(updates).length === 0) {
				return; // No changes
			}

			// Single API call with all changes
			await updateGroup(groupId, updates);

			// Update local state
			setGroupDivs((prev) =>
				prev.map((group) =>
					group.id === groupId
						? { ...group, ...updates, last_modified: new Date().toISOString() }
						: group,
				),
			);
		} catch (error) {
			console.error("Error updating group:", error);
		}
	};

	// Handle scaffold close
	const handleScaffoldClose = async (scaffoldId: string) => {
		try {
			// Delete scaffold from backend (backend will clear scaffold associations)
			await deleteScaffold(scaffoldId);

			// Update local state: remove scaffold associations from images
			setImages((prev) =>
				prev.map((img) =>
					img.scaffoldId === scaffoldId
						? { ...img, scaffoldId: undefined, scaffold_group_number: undefined }
						: img,
				),
			);

			// Update local state: remove scaffold associations from groups
			setGroupDivs((prev) =>
				prev.map((group) =>
					group.scaffoldId === scaffoldId
						? { ...group, scaffoldId: undefined, scaffold_group_number: undefined }
						: group,
				),
			);

			// Remove scaffold from array
			setScaffolds((prev) => prev.filter((s) => s.id !== scaffoldId));

			// Refresh data from backend to ensure consistency
			await fetchUserData();
			await fetchGroups();
		} catch (error) {
			console.error("Error closing scaffold:", error);
		}
	};

	// Handle group being dropped into scaffold
	const handleGroupAddToScaffold = async (
		groupId: string,
		scaffoldId: string,
		scaffoldGroupNumber?: number,
	) => {
		try {
			// Transform camelCase to snake_case for backend
			const updateData: any = {
				scaffold_id: scaffoldId,
				scaffold_group_number: scaffoldGroupNumber,
			};

			// Update group's scaffold_id in backend
			await updateGroup(groupId, updateData);

			// Update local state and scaffold immediately
			setGroupDivs((prev) => {
				const updatedGroups = prev.map((group) =>
					group.id === groupId
						? {
								...group,
								scaffoldId: scaffoldId,
								scaffold_group_number: scaffoldGroupNumber,
								last_modified: new Date().toISOString(),
							}
						: group,
				);

				// Update scaffold state immediately with the updated groups
				const updatedScaffoldGroups = updatedGroups
					.filter((group) => group.scaffoldId === scaffoldId)
					.map((group: GroupData) => ({
						...group,
						cards: images
							.filter((img) => img.groupId === group.id)
							.map((card: ImageData) => ({
								...card,
								groupId: group.id,
							})),
					}));

				setScaffolds((prev) =>
					prev.map((s) =>
						s.id === scaffoldId ? { ...s, groups: updatedScaffoldGroups } : s,
					),
				);

				return updatedGroups;
			});
		} catch (error) {
			console.error("Error adding group to scaffold:", error);
		}
	};

	// Handle group being removed from scaffold
	const handleGroupRemoveFromScaffold = async (groupId: string) => {
		try {
			// Store scaffold ID before removal for cleanup
			const groupToRemove = groupDivs.find((g) => g.id === groupId);
			const scaffoldIdToRemove = groupToRemove?.scaffoldId;

			// Transform camelCase to snake_case for backend
			const updateData: any = {
				scaffold_id: null,
				scaffold_group_number: null,
			};

			// Update group's scaffold_id to null in backend
			await updateGroup(groupId, updateData);

			// Update local state and scaffold immediately
			setGroupDivs((prev) => {
				const updatedGroups = prev.map((group) =>
					group.id === groupId
						? {
								...group,
								scaffoldId: undefined,
								scaffold_group_number: undefined,
								last_modified: new Date().toISOString(),
							}
						: group,
				);

				// Update scaffold state immediately with the updated groups
				if (scaffoldIdToRemove) {
					const updatedScaffoldGroups = updatedGroups
						.filter((group) => group.scaffoldId === scaffoldIdToRemove)
						.map((group: GroupData) => ({
							...group,
							cards: images
								.filter((img) => img.groupId === group.id)
								.map((card: ImageData) => ({
									...card,
									groupId: group.id,
								})),
						}));

					setScaffolds((prev) =>
						prev.map((s) =>
							s.id === scaffoldIdToRemove
								? { ...s, groups: updatedScaffoldGroups }
								: s,
						),
					);
				}

				return updatedGroups;
			});
		} catch (error) {
			console.error("Error removing group from scaffold:", error);
		}
	};

	// Loading state
	if (loading) {
		return (
			<div id="story-board-container" className="flex flex-col w-full h-full mt-4 bg-white">
				<div className="flex items-center justify-center h-full bg-white">
					<div className="text-lg text-grey-darkest">Loading Story Board...</div>
				</div>
			</div>
		);
	}

	const workspaceImages = images.filter(
		(img) => img.in_storyboard === true && !img.groupId && !img.scaffoldId,
	);

	// Filter groups: only show groups that don't belong to a scaffold in main storyboard
	const mainStoryboardGroups = groupDivs.filter((group) => !group.scaffoldId);

	// Visible component
	return (
		<div id="story-board-container" className="flex flex-col h-full w-full bg-white">
			<div
				id="story-bin-header"
				className={`flex w-full flex-0 items-center justify-start pt-5 pb-2 pl-[305px] flex-shrink-0 grid-background ${hideToolbar ? "min-h-[58px]" : ""}`}
			>
				{!hideToolbar && (
					<div
						className={
							readOnly
								? "opacity-50 pointer-events-none flex items-center"
								: "flex items-center"
						}
					>
						<UploadButton
							targetUser={targetUser}
							onUploaded={async () => {
								const oldIds = new Set(images.map((img) => img.id));
								await fetchUserData();
								const center = getVisibleCenter();
								setImages((prev) =>
									prev.map((img) => {
										if (
											!oldIds.has(img.id) &&
											img.x === 0 &&
											img.y === 0 &&
											img.in_storyboard &&
											!img.groupId
										) {
											const newX = Math.max(0, center.x - 65);
											const newY = Math.max(0, center.y - 50);
											updateImageData(img.id, { x: newX, y: newY });
											return { ...img, x: newX, y: newY };
										}
										return img;
									}),
								);
							}}
						/>
						<AnnotateVisualsButton
							images={images}
							storyLoading={storyLoading}
							onDescriptionsUpdated={async () => {
								await fetchUserData();
								const groups = await fetchGroups();
								await fetchScaffolds(groups);
							}}
						/>
						<GroupButton
							onClick={handleCreateGroup}
							onGroupComplete={async () => {
								await fetchUserData();
								await fetchGroups();
							}}
							onError={(msg) => setScaffoldLimitAlert(msg)}
							images={images}
						/>
						<GenerateStoryButton
							setRightNarrativePatternsOpen={setRightNarrativePatternsOpen}
							setSelectedPattern={setSelectedPattern}
							selectedPattern={selectedPattern}
							storyLoading={storyLoading}
						/>
						<CraftStoryButton
							images={images}
							storyLoading={storyLoading}
							setStoryLoading={setStoryLoading}
							hasGroups={groupDivs.length > 0}
							selectedPattern={selectedPattern}
							onStoryGenerated={refreshImageDataAfterStoryGeneration}
							targetUser={targetUser}
							scaffolds={scaffolds}
							slotOrder={(() => {
								const linearScaffold = scaffolds.find((s) => {
									const p = SCAFFOLD_NUMBER_TO_PATTERN[s.number];
									return p === "linear" || p === "inverted_pyramid";
								});
								return linearScaffold
									? linearSlotOrders[linearScaffold.id]
									: undefined;
							})()}
						/>
						<FeedbackButton />
						<CollaborateButton onSessionChange={onSessionChange} />
					</div>
				)}
			</div>
			<div
				id="story-bin-wrapper"
				className="flex-1 min-h-0 relative overflow-hidden"
				ref={storyBinRef}
			>
				<Bin
					id="story-bin"
					images={workspaceImages}
					updateImageData={updateImageData}
					onDescriptionsUpdate={handleDescriptionsUpdate}
					onDelete={handleDelete}
					onTrash={handleImageRecycle}
					onUnTrash={handleImageRestore}
					zoomLevel={zoomLevel}
					panOffset={panOffset}
					onPanOffsetChange={setPanOffset}
					onZoomLevelChange={setZoomLevel}
					readOnly={readOnly}
				>
					{/* Render all scaffolds based on their pattern type */}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "cause_and_effect")
						.map((scaffold) => (
							<CauseEffect
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "question_answer")
						.map((scaffold) => (
							<QuestionAnswer
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "problem_solution")
						.map((scaffold) => (
							<ProblemSolution
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "time_based")
						.map((scaffold) => (
							<TimeBased
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "factor_analysis")
						.map((scaffold) => (
							<FactorAnalysis
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter(
							(s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "overview_to_detail",
						)
						.map((scaffold) => (
							<OverviewToDetail
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "comparative")
						.map((scaffold) => (
							<Comparative
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "shock_lead")
						.map((scaffold) => (
							<ShockLead
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "workflow_process")
						.map((scaffold) => (
							<WorkflowProcess
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "linear")
						.map((scaffold) => (
							<Linear
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
								onSlotOrderChange={(order: number[]) =>
									setLinearSlotOrders((prev) => ({
										...prev,
										[scaffold.id]: order,
									}))
								}
							/>
						))}
					{scaffolds
						.filter((s) => SCAFFOLD_NUMBER_TO_PATTERN[s.number] === "inverted_pyramid")
						.map((scaffold) => (
							<InvertedPyramid
								key={scaffold.id}
								images={images}
								storyBinRef={storyBinRef}
								setSelectedPattern={setSelectedPattern}
								scaffold={scaffold}
								updateImageData={updateImageData}
								onPositionUpdate={
									readOnly
										? async () => {}
										: async (newX: number, newY: number) => {
												try {
													await updateScaffold(scaffold.id, {
														x: newX,
														y: newY,
													});
													setScaffolds((prev) =>
														prev.map((s) =>
															s.id === scaffold.id
																? { ...s, x: newX, y: newY }
																: s,
														),
													);
												} catch (error) {
													console.error(
														"Error updating scaffold position:",
														error,
													);
												}
											}
								}
								onClose={
									readOnly ? () => {} : () => handleScaffoldClose(scaffold.id)
								}
								onGroupAdd={readOnly ? () => {} : handleGroupAddToScaffold}
								onGroupRemove={readOnly ? () => {} : handleGroupRemoveFromScaffold}
								onCardAddToGroup={readOnly ? () => {} : handleCardAddToGroup}
								onCardRemoveFromGroup={
									readOnly ? () => {} : handleCardRemoveFromGroup
								}
								onGroupNameChange={readOnly ? () => {} : handleGroupNameChange}
								onGroupDescriptionChange={
									readOnly ? () => {} : handleGroupDescriptionChange
								}
								onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
								readOnly={readOnly}
								onSlotOrderChange={(order: number[]) =>
									setLinearSlotOrders((prev) => ({
										...prev,
										[scaffold.id]: order,
									}))
								}
							/>
						))}
					{/* Render groups directly in the scrollable container - only groups without scaffold */}
					{mainStoryboardGroups.map((group) => (
						<GroupDiv
							key={group.id}
							id={group.id}
							number={group.number}
							name={group.name}
							description={group.description}
							cards={group.cards}
							initialPosition={{ x: group.x, y: group.y }}
							onClose={readOnly ? () => {} : handleCloseGroup}
							onPositionUpdate={
								readOnly
									? async () => {}
									: async (newX, newY) => {
											try {
												await updateGroup(group.id, { x: newX, y: newY });
												setGroupDivs((prev) =>
													prev.map((g) =>
														g.id === group.id
															? {
																	...g,
																	x: newX,
																	y: newY,
																	last_modified:
																		new Date().toISOString(),
																}
															: g,
													),
												);
											} catch (error) {
												console.error(
													"Error updating group position:",
													error,
												);
											}
										}
							}
							onCardAdd={readOnly ? () => {} : handleCardAddToGroup}
							onCardRemove={readOnly ? () => {} : handleCardRemoveFromGroup}
							onNameChange={readOnly ? () => {} : handleGroupNameChange}
							onDescriptionChange={readOnly ? () => {} : handleGroupDescriptionChange}
							onGroupUpdate={readOnly ? async () => {} : handleGroupUpdate}
							storyBinRef={storyBinRef}
							scaffoldId={group.scaffoldId}
							zoomLevel={zoomLevel}
							panOffset={panOffset}
							disableDrag={readOnly}
						/>
					))}
				</Bin>
				{/* Zoom controls - positioned in bottom right */}
				<div className="absolute bottom-6 right-4 flex items-center gap-2 z-[350] bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-grey-light">
					<button
						className="text-sm font-medium px-1 hover:text-blue-600 disabled:opacity-30"
						onClick={() =>
							setZoomLevel((z) => Math.max(0.1, Math.round((z - 0.1) * 100) / 100))
						}
						disabled={zoomLevel <= 0.1}
					>
						−
					</button>
					<input
						type="range"
						min={0.1}
						max={1.2}
						step={0.01}
						value={zoomLevel}
						onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
						className="w-24 h-1 accent-blue-500 cursor-pointer"
					/>
					<button
						className="text-sm font-medium px-1 hover:text-blue-600 disabled:opacity-30"
						onClick={() =>
							setZoomLevel((z) => Math.min(1.2, Math.round((z + 0.1) * 100) / 100))
						}
						disabled={zoomLevel >= 1.2}
					>
						+
					</button>
					<span className="text-xs text-grey-dark w-8 text-right">
						{Math.round(zoomLevel * 100)}%
					</span>
				</div>
				{/* Recycle Bin, DeleteAll and ClearAll buttons - positioned in bottom left, hidden in readOnly */}
				{!readOnly && (
					<div className="absolute bottom-6 left-4 flex gap-2 z-[350]">
						<button
							log-id="view-recycle-bin-button"
							className="w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center gap-1 text-white font-bold text-sm transition-all duration-200"
							style={{
								cursor: "pointer",
								backgroundColor: "rgba(0, 92, 132, 0.5)",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = "rgba(0, 92, 132, 0.7)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "rgba(0, 92, 132, 0.5)";
							}}
							onClick={() => setRecycleBinOpen(true)}
							title="View Recycle Bin"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
						<ClearAllButton
							images={images}
							setImages={setImages}
							setGroupDivs={setGroupDivs}
							setScaffolds={setScaffolds}
							setSelectedPattern={setSelectedPattern}
							onClearComplete={async () => {
								await fetchUserData();
								const groups = await fetchGroups();
								await fetchScaffolds(groups);
							}}
						/>
						<DeleteAllButton
							images={images}
							setImages={setImages}
							setGroupDivs={setGroupDivs}
							setScaffolds={setScaffolds}
							setSelectedPattern={setSelectedPattern}
							onDeleteComplete={async () => {
								await fetchUserData();
								const groups = await fetchGroups();
								await fetchScaffolds(groups);
							}}
						/>
					</div>
				)}
			</div>

			{/* Recycle Bin Modal */}
			{scaffoldLimitAlert && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
					<div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
						<div className="text-sm text-grey-darkest">{scaffoldLimitAlert}</div>
						<div className="mt-6 text-right">
							<button
								onClick={() => setScaffoldLimitAlert(null)}
								className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-150"
							>
								OK
							</button>
						</div>
					</div>
				</div>
			)}

			{recycleBinOpen &&
				ReactDOM.createPortal(
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
						<div className="bg-white rounded-lg shadow-xl w-[80vw] h-[70vh] flex flex-col overflow-hidden">
							{/* Modal Header */}
							<div className="flex justify-between items-center px-4 py-3 border-b border-grey-lightest flex-shrink-0">
								<h3 className="text-lg font-semibold text-grey-darkest">
									Recycle Bin
								</h3>
								<button
									log-id="close-recycle-bin-modal-button"
									onClick={() => setRecycleBinOpen(false)}
									className="w-7 h-7 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200"
								>
									×
								</button>
							</div>
							{/* Modal Content */}
							<div className="flex-1 min-h-0 relative">
								<RecycleBoard
									images={images}
									setImages={setImages}
									loading={loading}
									fetchUserData={fetchUserData}
									updateImageData={updateImageData}
									handleImageRecycle={handleImageRecycle}
									handleImageRestore={handleImageRestore}
								/>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
};

export default StoryBoard;
