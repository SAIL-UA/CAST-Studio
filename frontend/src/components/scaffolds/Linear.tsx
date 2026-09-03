import React, { useState, useEffect, useRef } from "react";
import { useDrop } from "react-dnd";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	horizontalListSortingStrategy,
	arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ImageData, DragItem, ScaffoldData, GroupData } from "../../types/types";
import DraggableCard from "../DraggableCard";
import GroupDiv from "../GroupDiv";
import { logAction } from "../../utils/userActionLogger";

const MIN_SLOTS = 1;
const MAX_SLOTS = 15;

type LinearProps = {
	images: ImageData[];
	storyBinRef: React.RefObject<HTMLDivElement | null>;
	setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
	scaffold?: ScaffoldData;
	updateImageData: (imageId: string, data: Partial<ImageData>) => void;
	onPositionUpdate?: (x: number, y: number) => void;
	onClose: () => void;
	onGroupAdd?: (groupId: string, scaffoldId: string, scaffoldGroupNumber?: number) => void;
	onGroupRemove?: (groupId: string) => void;
	onCardAddToGroup?: (cardId: string, groupId: string) => void;
	onCardRemoveFromGroup?: (cardId: string, groupId: string) => void;
	onGroupNameChange?: (groupId: string, newName: string) => void;
	onGroupDescriptionChange?: (groupId: string, newDescription: string) => void;
	onGroupUpdate?: (groupId: string, updates: { name?: string; description?: string }) => void;
	readOnly?: boolean;
	onSlotOrderChange?: (slotOrder: number[]) => void;
};

function getMaxSlotInData(scaffold: ScaffoldData | null, images: ImageData[]): number {
	if (!scaffold) return 0;
	let max = 0;
	scaffold.groups?.forEach((g) => {
		if (g.scaffold_group_number != null && g.scaffold_group_number > max)
			max = g.scaffold_group_number;
	});
	images.forEach((img) => {
		if (
			img.scaffoldId === scaffold.id &&
			img.scaffold_group_number != null &&
			img.scaffold_group_number > max
		)
			max = img.scaffold_group_number;
	});
	return max;
}

// ── Grip Icon ───────────────────────────────────────────────────────
const GripIcon = React.forwardRef<HTMLDivElement, { listeners?: any; attributes?: any }>(
	({ listeners, attributes }, ref) => (
		<div
			ref={ref}
			{...listeners}
			{...attributes}
			style={{
				position: "absolute",
				top: 4,
				right: 4,
				zIndex: 20,
				cursor: "grab",
				padding: 2,
				borderRadius: 4,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "#005c84",
				opacity: 0.6,
				fontSize: 12,
				background: "rgba(255,255,255,0.7)",
			}}
			title="Drag to reorder"
		>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
				<circle cx="5" cy="3" r="1.5" />
				<circle cx="11" cy="3" r="1.5" />
				<circle cx="5" cy="8" r="1.5" />
				<circle cx="11" cy="8" r="1.5" />
				<circle cx="5" cy="13" r="1.5" />
				<circle cx="11" cy="13" r="1.5" />
			</svg>
		</div>
	),
);

// ── Sortable Drop Slot ──────────────────────────────────────────────
type LinearSlotProps = {
	id: string;
	slotNumber: number;
	displayNumber: number;
	scaffoldId: string;
	images: ImageData[];
	groups?: GroupData[];
	onCardAdd: (cardId: string, groupNumber: number) => void;
	onCardRemove: (cardId: string, scaffoldId: string) => void;
	onGroupAdd?: (groupId: string, scaffoldId: string, scaffoldGroupNumber?: number) => void;
	onGroupRemove?: (groupId: string) => void;
	storyBinRef: React.RefObject<HTMLDivElement | null>;
	updateImageData: (imageId: string, data: Partial<ImageData>) => void;
	readOnly?: boolean;
};

const LinearSlot = ({
	id,
	slotNumber,
	displayNumber,
	scaffoldId,
	images,
	groups = [],
	onCardAdd,
	onCardRemove,
	onGroupAdd,
	onGroupRemove,
	storyBinRef,
	readOnly,
}: LinearSlotProps) => {
	const slotCards = images.filter(
		(img) =>
			img.scaffoldId === scaffoldId &&
			img.scaffold_group_number === slotNumber &&
			!img.groupId,
	);
	const slotGroups = (groups || []).filter((g) => g.scaffold_group_number === slotNumber);
	const hasContent = slotCards.length > 0 || slotGroups.length > 0;

	const {
		attributes,
		listeners,
		setNodeRef: setSortableRef,
		transform,
		transition,
		isDragging: isSorting,
	} = useSortable({ id });
	const sortableStyle: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isSorting ? 0.5 : 1,
	};

	const [{ isOver, canDrop }, dropRef] = useDrop<
		DragItem,
		void,
		{ isOver: boolean; canDrop: boolean }
	>({
		accept: ["image", "group"],
		canDrop: () => !readOnly && !hasContent,
		drop: (item) => {
			if (hasContent) return;
			if (item.type === "group" && item.id) {
				if (onGroupAdd) {
					onGroupAdd(item.id, scaffoldId, slotNumber);
					logAction(
						{ actionType: "drop", elementId: "scaffold-group-add" },
						{ scaffoldType: "linear" },
					);
				}
			} else if (item.id) {
				onCardAdd(item.id, slotNumber);
				logAction(
					{ actionType: "click", elementId: "scaffold-card-add" },
					{ scaffoldType: "linear", groupNumber: slotNumber },
				);
			}
		},
		collect: (monitor) => ({
			isOver: monitor.isOver(),
			canDrop: monitor.canDrop(),
		}),
	});

	// Combine refs: sortable wrapper + drop target on inner div
	return (
		<div
			ref={setSortableRef}
			style={{
				...sortableStyle,
				display: "flex",
				flexDirection: "column",
				alignItems: "flex-start",
			}}
		>
			{/* Number label above */}
			<span
				style={{
					fontSize: 10,
					fontWeight: 600,
					color: "#005c84",
					marginBottom: 4,
					marginLeft: 2,
				}}
			>
				{displayNumber}
			</span>

			<div
				ref={dropRef as any}
				style={{
					width: 170,
					minHeight: 120,
					borderRadius: 12,
					background: isOver && canDrop ? "#cce5ed" : "#e0f0f5",
					border: isOver && canDrop ? "2px dashed #005c84" : "1.5px dashed #9ec5d0",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transition: "background .15s, border .15s",
					position: "relative",
					overflow: "visible",
				}}
			>
				{/* Grip handle — top right inside corner */}
				{!readOnly && <GripIcon listeners={listeners} attributes={attributes} />}

				{!hasContent && (
					<span style={{ fontSize: 11, color: "#7baab8", fontWeight: 500 }}>
						Drop here
					</span>
				)}

				{/* Render card */}
				{slotCards.length > 0 && (
					<div style={{ zoom: 0.75, position: "relative" }}>
						<DraggableCard
							image={slotCards[0]}
							index={slotCards[0].index}
							onDescriptionsUpdate={() => {}}
							onDelete={async () => {}}
							onTrash={() => {}}
							onUnTrash={() => {}}
							draggable={false}
							readOnly={true}
						/>
						{!readOnly && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									logAction(e);
									onCardRemove(slotCards[0].id, scaffoldId);
								}}
								log-id="scaffold-card-remove"
								className="absolute flex items-center justify-center text-white text-xs font-bold shadow-md"
								style={{
									top: -4,
									right: -4,
									width: 24,
									height: 24,
									borderRadius: "50%",
									background: "#ef4444",
									zIndex: 999,
									cursor: "pointer",
									border: "2px solid #fff",
									transform: "scale(1.33)",
								}}
								title="Remove from slot"
							>
								×
							</button>
						)}
					</div>
				)}

				{/* Render group */}
				{slotGroups.length > 0 && (
					<div
						style={{
							zoom: 0.3,
							position: "relative",
							width: 432,
							height: 260,
							pointerEvents: "none",
							flexShrink: 0,
						}}
					>
						<GroupDiv
							id={slotGroups[0].id}
							number={slotGroups[0].number}
							name={slotGroups[0].name}
							description={slotGroups[0].description || ""}
							cards={images.filter((img) => img.groupId === slotGroups[0].id)}
							initialPosition={{ x: 0, y: 0 }}
							onClose={() => {}}
							onPositionUpdate={() => {}}
							onCardAdd={() => {}}
							onCardRemove={() => {}}
							onNameChange={() => {}}
							onDescriptionChange={() => {}}
							onGroupUpdate={() => {}}
							storyBinRef={storyBinRef}
							scaffoldId={slotGroups[0].scaffoldId}
							disableDrag={true}
						/>
						{!readOnly && onGroupRemove && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									logAction(e);
									onGroupRemove(slotGroups[0].id);
								}}
								log-id="scaffold-group-remove"
								className="absolute flex items-center justify-center text-white font-bold shadow-md"
								style={{
									top: -8,
									right: -8,
									width: 60,
									height: 60,
									borderRadius: "50%",
									background: "#ef4444",
									zIndex: 999,
									cursor: "pointer",
									border: "6px solid #fff",
									pointerEvents: "auto",
									fontSize: 30,
								}}
								title="Remove group from slot"
							>
								×
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

// ── Arrow Connectors ────────────────────────────────────────────────
const Arrow = () => (
	<div style={{ display: "flex", alignItems: "center" }}>
		<div style={{ width: 24, height: 2, background: "#005c84" }} />
		<div
			style={{
				width: 0,
				height: 0,
				borderTop: "5px solid transparent",
				borderBottom: "5px solid transparent",
				borderLeft: "8px solid #005c84",
			}}
		/>
	</div>
);

const ArrowLine = () => (
	<div style={{ display: "flex", alignItems: "center" }}>
		<div style={{ width: 20, height: 2, background: "#005c84" }} />
	</div>
);

// ── Main Component ──────────────────────────────────────────────────
const Linear = ({
	images,
	storyBinRef,
	scaffold,
	updateImageData,
	onPositionUpdate,
	onClose,
	onGroupAdd,
	onGroupRemove,
	readOnly,
	onSlotOrderChange,
}: LinearProps) => {
	const scaffoldId = scaffold?.id || "";
	const maxInData = getMaxSlotInData(scaffold || null, images);
	const [slotOrder, setSlotOrder] = useState<number[]>(() => {
		const count = Math.max(MIN_SLOTS, maxInData);
		return Array.from({ length: count }, (_, i) => i + 1);
	});
	const [position, setPosition] = useState({ x: scaffold?.x || 0, y: scaffold?.y || 0 });
	const titleRef = useRef<HTMLDivElement>(null);
	const outerRef = useRef<HTMLDivElement>(null);

	// Sync slot count when data changes
	useEffect(() => {
		if (scaffold) {
			const maxNeeded = getMaxSlotInData(scaffold, images);
			if (maxNeeded > slotOrder.length) {
				setSlotOrder((prev) => {
					const newSlots = [...prev];
					for (let i = prev.length + 1; i <= maxNeeded; i++) {
						newSlots.push(i);
					}
					return newSlots;
				});
			}
		}
	}, [scaffold, images]);

	useEffect(() => {
		if (scaffold && (scaffold.x !== position.x || scaffold.y !== position.y)) {
			setPosition({ x: scaffold.x, y: scaffold.y });
		}
	}, [scaffold?.x, scaffold?.y]);

	const handleCardAdd = (cardId: string, groupNumber: number) => {
		updateImageData(cardId, { scaffoldId, scaffold_group_number: groupNumber });
	};

	const handleCardRemove = (cardId: string) => {
		updateImageData(cardId, { scaffoldId: undefined, scaffold_group_number: undefined } as any);
	};

	const handleAddSlot = () => {
		if (slotOrder.length < MAX_SLOTS) {
			const nextNum = Math.max(...slotOrder) + 1;
			setSlotOrder((prev) => [...prev, nextNum]);
		}
	};

	const handleRemoveSlot = () => {
		if (slotOrder.length > MIN_SLOTS) {
			const slotToRemove = slotOrder[slotOrder.length - 1];
			images.forEach((img) => {
				if (img.scaffoldId === scaffoldId && img.scaffold_group_number === slotToRemove) {
					updateImageData(img.id, {
						scaffoldId: undefined,
						scaffold_group_number: undefined,
					} as any);
				}
			});
			setSlotOrder((prev) => prev.slice(0, -1));
		}
	};

	// dnd-kit sortable — reorder slots
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	const handleSortEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = slotOrder.findIndex((s) => `slot-${s}` === active.id);
		const newIndex = slotOrder.findIndex((s) => `slot-${s}` === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		// Just reorder visually. Content stays with its original scaffold_group_number.
		// slotOrder maps visual position to internal slot number.
		// displayNumber (1,2,3...) comes from array index, not scaffold_group_number.
		const newOrder = arrayMove(slotOrder, oldIndex, newIndex);
		setSlotOrder(newOrder);
		if (onSlotOrderChange) onSlotOrderChange(newOrder);
	};

	// Live dragging via mousedown/mousemove on title box
	const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
	const isDraggingManual = dragOffset !== null;

	useEffect(() => {
		if (!titleRef.current || readOnly) return;

		const titleEl = titleRef.current;
		let startX = 0,
			startY = 0;

		const onMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			startX = e.clientX;
			startY = e.clientY;

			const onMouseMove = (e: MouseEvent) => {
				setDragOffset({ x: e.clientX - startX, y: e.clientY - startY });
			};

			const onMouseUp = (e: MouseEvent) => {
				const dx = e.clientX - startX;
				const dy = e.clientY - startY;
				setDragOffset(null);
				if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
					const newX = position.x + dx;
					const newY = position.y + dy;
					setPosition({ x: newX, y: newY });
					if (onPositionUpdate) onPositionUpdate(newX, newY);
				}
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
			};

			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
		};

		titleEl.addEventListener("mousedown", onMouseDown);
		return () => titleEl.removeEventListener("mousedown", onMouseDown);
	}, [readOnly, position, onPositionUpdate]);

	const slotIds = slotOrder.map((s) => `slot-${s}`);

	return (
		<div
			ref={outerRef}
			data-tour-target="scaffold-linear"
			style={{
				position: "absolute",
				left: position.x + (dragOffset ? dragOffset.x : 0),
				top: position.y + (dragOffset ? dragOffset.y : 0),
				zIndex: isDraggingManual ? 500 : 100,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 0,
					background: "transparent",
					padding: "24px 20px 16px",
					position: "relative",
				}}
			>
				{/* Title box — drag handle for moving scaffold */}
				<div
					ref={titleRef}
					style={{
						background: "#005c84",
						color: "#fff",
						borderRadius: 14,
						padding: "34px 32px 24px 26px",
						fontSize: 15,
						fontWeight: 600,
						textAlign: "center",
						lineHeight: 1.3,
						whiteSpace: "nowrap",
						flexShrink: 0,
						position: "relative",
						cursor: readOnly ? "default" : "grab",
					}}
				>
					Linear
					<br />
					Narrative
					{!readOnly && (
						<div
							style={{
								position: "absolute",
								top: 5,
								right: 5,
								display: "flex",
								gap: 3,
							}}
						>
							{/* Duplicate */}
							<button
								onClick={(e) => {
									e.stopPropagation();
									window.dispatchEvent(
										new CustomEvent("createScaffold", {
											detail: { pattern: "linear" },
										}),
									);
								}}
								className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white transition-all duration-200"
								style={{ cursor: "pointer" }}
								title="Duplicate scaffold"
							>
								<svg
									width="10"
									height="10"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<rect x="5" y="5" width="9" height="9" rx="1.5" />
									<path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H3.5A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
								</svg>
							</button>
							{/* Generate story */}
							<button
								onClick={(e) => {
									e.stopPropagation();
									window.dispatchEvent(
										new CustomEvent("generateScaffoldStory", {
											detail: { scaffoldId },
										}),
									);
								}}
								className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white transition-all duration-200"
								style={{ cursor: "pointer" }}
								title="Generate story for this scaffold"
							>
								<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
									<path d="M4 2.5v11l9-5.5z" />
								</svg>
							</button>
							{/* Close */}
							<button
								onClick={(e) => {
									e.stopPropagation();
									logAction(e);
									onClose();
								}}
								log-id="scaffold-close"
								className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
								style={{ cursor: "pointer" }}
								title="Close scaffold"
							>
								×
							</button>
						</div>
					)}
				</div>

				{/* Arrow from title */}
				<ArrowLine />

				{/* Sortable slots */}
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleSortEnd}
				>
					<SortableContext items={slotIds} strategy={horizontalListSortingStrategy}>
						<div style={{ display: "flex", alignItems: "center", gap: 0 }}>
							{slotOrder.map((slotNum, idx) => (
								<React.Fragment key={`slot-${slotNum}`}>
									<LinearSlot
										id={`slot-${slotNum}`}
										slotNumber={slotNum}
										displayNumber={idx + 1}
										scaffoldId={scaffoldId}
										images={images}
										groups={scaffold?.groups?.filter(
											(g) => g.scaffold_group_number === slotNum,
										)}
										onCardAdd={handleCardAdd}
										onCardRemove={handleCardRemove}
										onGroupAdd={onGroupAdd}
										onGroupRemove={onGroupRemove}
										storyBinRef={storyBinRef}
										updateImageData={updateImageData}
										readOnly={readOnly}
									/>
									{idx < slotOrder.length - 1 && <ArrowLine />}
								</React.Fragment>
							))}
						</div>
					</SortableContext>
				</DndContext>

				{/* Arrow + buttons */}
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
					{!readOnly && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								logAction(e);
								handleAddSlot();
							}}
							log-id="scaffold-slot-add"
							disabled={slotOrder.length >= MAX_SLOTS}
							style={{
								width: 24,
								height: 24,
								borderRadius: 6,
								border: "1.5px solid #005c84",
								background: slotOrder.length >= MAX_SLOTS ? "#f0f0f0" : "#fff",
								color: slotOrder.length >= MAX_SLOTS ? "#bbb" : "#005c84",
								fontSize: 16,
								fontWeight: 600,
								cursor: slotOrder.length >= MAX_SLOTS ? "not-allowed" : "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								opacity: slotOrder.length >= MAX_SLOTS ? 0.4 : 1,
								marginBottom: 4,
							}}
							title="Add step"
						>
							+
						</button>
					)}
					<Arrow />
					{!readOnly && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								logAction(e);
								handleRemoveSlot();
							}}
							log-id="scaffold-slot-remove"
							disabled={slotOrder.length <= MIN_SLOTS}
							style={{
								width: 24,
								height: 24,
								borderRadius: 6,
								border: "1.5px solid #005c84",
								background: slotOrder.length <= MIN_SLOTS ? "#f0f0f0" : "#fff",
								color: slotOrder.length <= MIN_SLOTS ? "#bbb" : "#005c84",
								fontSize: 16,
								fontWeight: 600,
								cursor: slotOrder.length <= MIN_SLOTS ? "not-allowed" : "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								opacity: slotOrder.length <= MIN_SLOTS ? 0.4 : 1,
								marginTop: 4,
							}}
							title="Remove step"
						>
							−
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default Linear;
