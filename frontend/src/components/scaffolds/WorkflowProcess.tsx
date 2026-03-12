// Import dependencies
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ImageData, DragItem, ScaffoldData, GroupData } from '../../types/types';
import { SCAFFOLD_VALID_GROUP_NUMBERS, SCAFFOLD_GROUP_LABELS } from '../../types/scaffoldMappings';
import DraggableCard from '../DraggableCard';
import GroupDiv from '../GroupDiv';
import { logAction } from '../../utils/userActionLogger';

const SCAFFOLD_NUMBER = 8;
const MIN_SLOTS = 2;
const MAX_SLOTS = 5;
const BASE_WIDTH = 650;
const SLOT_WIDTH = 286;

type WorkflowProcessProps = {
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
};

function getMaxSlotInData(scaffold: ScaffoldData | null, images: ImageData[]): number {
    if (!scaffold) return 0;
    let max = 0;
    scaffold.groups?.forEach((g) => {
        if (g.scaffold_group_number != null && g.scaffold_group_number > max) {
            max = g.scaffold_group_number;
        }
    });
    images.forEach((img) => {
        if (img.scaffoldId === scaffold.id && img.scaffold_group_number != null && img.scaffold_group_number > max) {
            max = img.scaffold_group_number;
        }
    });
    return max;
}

const WorkflowProcess = ({
    images,
    storyBinRef,
    setSelectedPattern,
    scaffold,
    updateImageData,
    onPositionUpdate,
    onClose,
    onGroupAdd,
    onGroupRemove,
    onCardAddToGroup,
    onCardRemoveFromGroup,
    onGroupNameChange,
    onGroupDescriptionChange,
    onGroupUpdate
}: WorkflowProcessProps) => {
    const [position, setPosition] = useState({
        x: scaffold?.x || 50,
        y: scaffold?.y || 50
    });

    useEffect(() => {
        if (scaffold) {
            setPosition({ x: scaffold.x, y: scaffold.y });
        }
    }, [scaffold]);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const validGroupNumbers = SCAFFOLD_VALID_GROUP_NUMBERS[SCAFFOLD_NUMBER] || [1, 2, 3, 4, 5];
    const groupLabels =
        SCAFFOLD_GROUP_LABELS[SCAFFOLD_NUMBER] || { 1: 'Stage 1', 2: 'Stage 2', 3: 'Stage 3', 4: 'Stage 4', 5: 'Stage 5' };

    const maxSlotInData = useMemo(() => getMaxSlotInData(scaffold ?? null, images), [scaffold, images]);
    const visibleSlotCountFromData = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, maxSlotInData || MIN_SLOTS));

    const [displaySlotCount, setDisplaySlotCount] = useState(MIN_SLOTS);

    useEffect(() => {
        setDisplaySlotCount((prev) => Math.max(prev, visibleSlotCountFromData));
    }, [visibleSlotCountFromData]);

    const [stageCardIds, setStageCardIds] = useState<Record<number, Set<string>>>({
        1: new Set(),
        2: new Set(),
        3: new Set(),
        4: new Set(),
        5: new Set()
    });

    useEffect(() => {
        if (!scaffold) return;
        const next: Record<number, Set<string>> = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
        images.forEach((img) => {
            if (
                img.scaffoldId === scaffold.id &&
                img.scaffold_group_number != null &&
                img.scaffold_group_number >= 1 &&
                img.scaffold_group_number <= MAX_SLOTS
            ) {
                next[img.scaffold_group_number].add(img.id);
            }
        });
        setStageCardIds(next);
    }, [scaffold, images]);

    const getStageFromGroupId = (groupId: string): number | null => {
        const m = groupId.match(/^workflow-process-stage-(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
    };

    const handleCardAdd = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        const stage = getStageFromGroupId(groupId);
        if (stage == null || stage < 1 || stage > MAX_SLOTS) return;

        await updateImageData(cardId, { scaffoldId: scaffold.id, scaffold_group_number: stage } as Partial<ImageData>);

        setStageCardIds((prev) => {
            const next = { ...prev };
            for (let p = 1; p <= MAX_SLOTS; p++) {
                const s = new Set(next[p]);
                if (p === stage) s.add(cardId);
                else s.delete(cardId);
                next[p] = s;
            }
            return next;
        });
        logAction(
            { actionType: 'drop', elementId: 'scaffold-card-add' },
            { card_id: cardId, group_id: groupId, scaffold_id: scaffold.id, scaffold_group_number: stage }
        );
    };

    const handleCardRemove = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        await updateImageData(cardId, { scaffoldId: undefined, scaffold_group_number: undefined } as Partial<ImageData>);
        setStageCardIds((prev) => {
            const next = { ...prev };
            for (let p = 1; p <= MAX_SLOTS; p++) {
                const s = new Set(next[p]);
                s.delete(cardId);
                next[p] = s;
            }
            return next;
        });
        logAction(
            { actionType: 'click', elementId: 'scaffold-card-remove' },
            { card_id: cardId, group_id: groupId, scaffold_id: scaffold.id }
        );
    };

    const handleAddStage = () => {
        setDisplaySlotCount((prev) => Math.min(MAX_SLOTS, prev + 1));
        logAction(
            { actionType: 'click', elementId: 'scaffold-add-column' },
            { scaffold_id: scaffold?.id, scaffold_type: 'workflow-process', new_count: Math.min(MAX_SLOTS, displaySlotCount + 1) }
        );
    };

    const handleRemoveStage = async () => {
        if (!scaffold || displaySlotCount <= MIN_SLOTS) return;
        const removedStage = displaySlotCount;

        const imagesInStage = images.filter((img) => img.scaffoldId === scaffold.id && img.scaffold_group_number === removedStage);
        for (const img of imagesInStage) {
            await updateImageData(img.id, { scaffoldId: undefined, scaffold_group_number: undefined } as Partial<ImageData>);
        }

        const groupsInStage = (scaffold.groups || []).filter((g) => g.scaffold_group_number === removedStage);
        for (const group of groupsInStage) {
            if (onGroupRemove) onGroupRemove(group.id);
        }

        setStageCardIds((prev) => {
            const next = { ...prev };
            next[removedStage] = new Set();
            return next;
        });

        setDisplaySlotCount((prev) => Math.max(MIN_SLOTS, prev - 1));
        logAction(
            { actionType: 'click', elementId: 'scaffold-remove-column' },
            { scaffold_id: scaffold?.id, scaffold_type: 'workflow-process', removed_stage: removedStage }
        );
    };

    const [{ isDraggingDnd }, drag] = useDrag(
        () => ({
            type: 'group',
            item: () => {
                if (wrapperRef.current && storyBinRef.current) {
                    const wrapperRect = wrapperRef.current.getBoundingClientRect();
                    const event = window.event as MouseEvent;
                    const offsetX = event.clientX - wrapperRect.left;
                    const offsetY = event.clientY - wrapperRect.top;
                    return {
                        id: 'workflow-process-scaffold',
                        type: 'group',
                        oldX: position.x,
                        oldY: position.y,
                        offsetX,
                        offsetY
                    };
                }
                return {
                    id: 'workflow-process-scaffold',
                    type: 'group',
                    oldX: position.x,
                    oldY: position.y,
                    offsetX: 0,
                    offsetY: 0
                };
            },
            end: (item, monitor) => {
                const dropResult = monitor.getDropResult();
                const clientOffset = monitor.getClientOffset();
                let finalX = (item as { oldX: number }).oldX;
                let finalY = (item as { oldY: number }).oldY;

                if (dropResult && typeof dropResult === 'object' && 'x' in dropResult && 'y' in dropResult) {
                    const newPosition = dropResult as { x: number; y: number };
                    finalX = newPosition.x;
                    finalY = newPosition.y;
                    setPosition({ x: finalX, y: finalY });
                    if (onPositionUpdate) onPositionUpdate(finalX, finalY);
                } else if (clientOffset && storyBinRef.current) {
                    const binElement = storyBinRef.current.querySelector('#story-bin') as HTMLElement;
                    if (binElement) {
                        const binRect = binElement.getBoundingClientRect();
                        const scrollLeft = binElement.scrollLeft;
                        const scrollTop = binElement.scrollTop;
                        const wrapperWidth = BASE_WIDTH + (displaySlotCount - 2) * SLOT_WIDTH;
                        const wrapperHeight = 390;
                        let newX = clientOffset.x - binRect.left - (item as { offsetX: number }).offsetX + scrollLeft;
                        let newY = clientOffset.y - binRect.top - (item as { offsetY: number }).offsetY + scrollTop;
                        const contentWidth = binElement.scrollWidth;
                        const contentHeight = binElement.scrollHeight;
                        newX = Math.max(0, Math.min(newX, contentWidth - wrapperWidth));
                        newY = Math.max(0, Math.min(newY, contentHeight - wrapperHeight));
                        finalX = newX;
                        finalY = newY;
                        setPosition({ x: finalX, y: finalY });
                        if (onPositionUpdate) onPositionUpdate(finalX, finalY);
                    }
                }
                logAction(
                    { actionType: 'drag', elementId: 'scaffold-drag' },
                    { scaffold_id: scaffold?.id, scaffold_type: 'workflow-process', old_position: { x: (item as { oldX: number }).oldX, y: (item as { oldY: number }).oldY }, new_position: { x: finalX, y: finalY } }
                );
            },
            collect: (monitor) => ({ isDraggingDnd: !!monitor.isDragging() })
        }),
        [position, storyBinRef, onPositionUpdate, displaySlotCount]
    );

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if (isDraggingDnd || !storyBinRef.current) return;

        const binElement = storyBinRef.current.querySelector('#story-bin') as HTMLElement;
        if (!binElement) return;
        const binRect = binElement.getBoundingClientRect();
        const scrollLeft = binElement.scrollLeft;
        const scrollTop = binElement.scrollTop;

        setIsDragging(true);
        dragStartPosition.current = { x: position.x, y: position.y };
        setDragOffset({
            x: e.clientX - binRect.left - position.x + scrollLeft,
            y: e.clientY - binRect.top - position.y + scrollTop
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !storyBinRef.current || isDraggingDnd) {
                if (isDragging) setIsDragging(false);
                return;
            }
            const binElement = storyBinRef.current.querySelector('#story-bin') as HTMLElement;
            if (!binElement) {
                setIsDragging(false);
                return;
            }
            const binRect = binElement.getBoundingClientRect();
            const scrollLeft = binElement.scrollLeft;
            const scrollTop = binElement.scrollTop;

            const wrapperWidth = BASE_WIDTH + (displaySlotCount - 2) * SLOT_WIDTH;
            const wrapperHeight = 390;
            let newX = e.clientX - binRect.left - dragOffset.x + scrollLeft;
            let newY = e.clientY - binRect.top - dragOffset.y + scrollTop;
            const contentWidth = binElement.scrollWidth;
            const contentHeight = binElement.scrollHeight;
            newX = Math.max(0, Math.min(newX, contentWidth - wrapperWidth));
            newY = Math.max(0, Math.min(newY, contentHeight - wrapperHeight));
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                if (dragStartPosition.current && onPositionUpdate) {
                    const positionChanged =
                        Math.abs(position.x - dragStartPosition.current.x) > 1 ||
                        Math.abs(position.y - dragStartPosition.current.y) > 1;
                    if (positionChanged) onPositionUpdate(position.x, position.y);
                    logAction(
                        { actionType: 'drag', elementId: 'scaffold-drag' },
                        { scaffold_id: scaffold?.id, scaffold_type: 'workflow-process', old_position: dragStartPosition.current, new_position: { x: position.x, y: position.y } }
                    );
                }
                dragStartPosition.current = null;
            }
        };

        if (isDragging && !isDraggingDnd) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, isDraggingDnd, storyBinRef, position, onPositionUpdate, displaySlotCount]);

    useEffect(() => {
        if (isDraggingDnd && isDragging) setIsDragging(false);
    }, [isDraggingDnd, isDragging]);

    const containerPos = storyBinRef.current ? { left: position.x, top: position.y } : { left: 0, top: 0 };
    const combinedRef = (element: HTMLDivElement | null) => {
        if (element) {
            drag(element);
            wrapperRef.current = element;
        }
    };

    const scaffoldWidth = BASE_WIDTH + (displaySlotCount - 2) * SLOT_WIDTH;

    return (
        <div
            ref={combinedRef}
            className="absolute bg-grey-lighter-2 select-none rounded-sm shadow-md border border-grey-lightest z-[100]"
            style={{
                left: containerPos.left,
                top: containerPos.top,
                width: `${scaffoldWidth}px`,
                minHeight: '325px',
                cursor: isDragging || isDraggingDnd ? 'grabbing' : 'grab',
                opacity: isDraggingDnd ? 0.5 : 1,
                pointerEvents: 'auto'
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="flex justify-between items-center p-2 bg-bama-crimson text-white rounded-t-sm">
                <h3 className="text-sm font-bold">Workflow / Process</h3>
                <div className="flex items-center gap-1">
                    {displaySlotCount < MAX_SLOTS && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAddStage();
                            }}
                            className="px-2 py-0.5 text-xs bg-white bg-opacity-20 hover:bg-opacity-40 rounded transition-all duration-200"
                            title="Add stage"
                        >
                            + Stage
                        </button>
                    )}
                    {displaySlotCount > MIN_SLOTS && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStage();
                            }}
                            className="px-2 py-0.5 text-xs bg-white bg-opacity-20 hover:bg-opacity-40 rounded transition-all duration-200"
                            title="Remove last stage"
                        >
                            − Stage
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            logAction(e, { scaffold_id: scaffold?.id, scaffold_type: 'workflow-process' });
                            onClose();
                        }}
                        className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
                        style={{ cursor: 'pointer' }}
                        title="Close Workflow / Process scaffold"
                    >
                        ×
                    </button>
                </div>
            </div>

            <div className="flex flex-row gap-4 p-2">
                {Array.from({ length: displaySlotCount }, (_, i) => i + 1).map((stageNum) => (
                    <WorkflowStage
                        key={stageNum}
                        id={`workflow-process-stage-${stageNum}`}
                        title={groupLabels[stageNum] || `Stage ${stageNum}`}
                        cards={images.filter((img) => stageCardIds[stageNum]?.has(img.id))}
                        onCardAdd={handleCardAdd}
                        onCardRemove={handleCardRemove}
                        scaffoldId={scaffold?.id}
                        scaffoldGroupNumber={stageNum}
                        groups={(scaffold?.groups || []).filter((g) => g.scaffold_group_number === stageNum)}
                        onGroupAdd={onGroupAdd}
                        onGroupRemove={onGroupRemove}
                        onCardAddToGroup={onCardAddToGroup}
                        onCardRemoveFromGroup={onCardRemoveFromGroup}
                        onGroupNameChange={onGroupNameChange}
                        onGroupDescriptionChange={onGroupDescriptionChange}
                        onGroupUpdate={onGroupUpdate}
                        storyBinRef={storyBinRef}
                    />
                ))}
            </div>
        </div>
    );
};

type WorkflowStageProps = {
    id: string;
    title: string;
    cards: ImageData[];
    onCardAdd: (cardId: string, groupId: string) => void;
    onCardRemove: (cardId: string, groupId: string) => void;
    scaffoldId?: string;
    scaffoldGroupNumber?: number;
    groups?: GroupData[];
    onGroupAdd?: (groupId: string, scaffoldId: string, scaffoldGroupNumber?: number) => void;
    onGroupRemove?: (groupId: string) => void;
    onCardAddToGroup?: (cardId: string, groupId: string) => void;
    onCardRemoveFromGroup?: (cardId: string, groupId: string) => void;
    onGroupNameChange?: (groupId: string, newName: string) => void;
    onGroupDescriptionChange?: (groupId: string, newDescription: string) => void;
    onGroupUpdate?: (groupId: string, updates: { name?: string; description?: string }) => void;
    storyBinRef: React.RefObject<HTMLDivElement | null>;
};

const WorkflowStage = ({
    id,
    title,
    cards,
    onCardAdd,
    onCardRemove,
    scaffoldId,
    scaffoldGroupNumber,
    groups = [],
    onGroupAdd,
    onGroupRemove,
    onCardAddToGroup,
    onCardRemoveFromGroup,
    onGroupNameChange,
    onGroupDescriptionChange,
    onGroupUpdate,
    storyBinRef
}: WorkflowStageProps) => {
    const groupRef = useRef<HTMLDivElement>(null);

    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: ['image', 'group'],
            drop: (item: DragItem) => {
                if (item.id === 'workflow-process-scaffold') return { droppedInGroup: false };
                if (item.type !== 'group' && item.groupId !== id && cards.length < 3) {
                    onCardAdd(item.id, id);
                    return { droppedInGroup: true, groupId: id };
                }
                if (item.type === 'group' && scaffoldId != null && scaffoldGroupNumber != null && onGroupAdd) {
                    if (item.scaffoldId !== scaffoldId) {
                        onGroupAdd(item.id, scaffoldId, scaffoldGroupNumber);
                        return { droppedInScaffoldGroup: true, scaffoldId, scaffoldGroupNumber };
                    }
                }
                return { droppedInGroup: false };
            },
            canDrop: (item: DragItem) => {
                if (item.id === 'workflow-process-scaffold') return false;
                if (item.type !== 'group') return item.groupId !== id && cards.length < 3;
                return item.type === 'group' && item.scaffoldId !== scaffoldId;
            },
            collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() })
        }),
        [id, onCardAdd, cards.length, scaffoldId, scaffoldGroupNumber, onGroupAdd]
    );

    const combinedRef = (element: HTMLDivElement | null) => {
        if (element) {
            drop(element);
            groupRef.current = element;
        }
    };

    return (
        <div
            ref={combinedRef}
            className={`p-2 bg-white rounded border transition-all duration-200 flex-1 relative min-w-0 ${
                isOver && canDrop
                    ? 'border-blue-400 border-2 bg-blue-50'
                    : isOver && !canDrop
                    ? 'border-red-400 border-2 bg-red-50'
                    : 'border-grey-lightest'
            }`}
            style={{ minHeight: '260px' }}
        >
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-grey-light">
                <h4 className="text-xs font-bold text-grey-darkest">{title}</h4>
            </div>

            {isOver && canDrop && (
                <div className="flex items-center justify-center h-[80%] border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 absolute inset-0 z-[105]">
                    <div className="text-blue-600 text-sm font-medium">
                        {cards.length === 0 ? 'Drop card or group here' : 'Drop here'}
                    </div>
                </div>
            )}

            {isOver && !canDrop && cards.length >= 3 && (
                <div className="flex items-center justify-center h-[80%] border-2 border-dashed border-red-400 rounded-lg bg-red-50">
                    <div className="text-red-600 text-sm font-medium">Group is full (Max: 3 visuals)</div>
                </div>
            )}

            {groups.length > 0 && (
                <div className="mt-2 pt-2 border-t border-grey-light">
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto" style={{ position: 'relative' }}>
                        {groups.map((group, index) => {
                            const scaledWidth = 160;
                            const scaledHeight = 128;
                            const gap = 8;
                            return (
                                <div
                                    key={group.id}
                                    className="relative group"
                                    style={{
                                        width: `${scaledWidth}px`,
                                        height: `${scaledHeight}px`,
                                        marginRight: index < groups.length - 1 ? `${gap}px` : '0',
                                        marginBottom: `${gap}px`
                                    }}
                                >
                                    <div 
                                        style={{
                                            transform: 'scale(0.5)',
                                            transformOrigin: 'top left',
                                            width: '320px',
                                            height: '256px',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0
                                        }}
                                    >
                                        <GroupDiv
                                            id={group.id}
                                            number={group.number}
                                            name={group.name}
                                            description={group.description}
                                            cards={group.cards}
                                            initialPosition={{ x: 0, y: 0 }}
                                            onClose={onGroupRemove ? () => onGroupRemove(group.id) : () => {}}
                                            onPositionUpdate={() => {}}
                                            onCardAdd={onCardAddToGroup || (() => {})}
                                            onCardRemove={onCardRemoveFromGroup || (() => {})}
                                            onNameChange={onGroupNameChange || (() => {})}
                                            onDescriptionChange={onGroupDescriptionChange || (() => {})}
                                            onGroupUpdate={onGroupUpdate || (() => {})}
                                            storyBinRef={storyBinRef}
                                            scaffoldId={group.scaffoldId}
                                            disableDrag={true}
                                        />
                                    </div>
                                    {onGroupRemove && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onGroupRemove(group.id);
                                            }}
                                            className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[105] shadow-md"
                                            style={{ top: '-3px', right: '-9px' }}
                                            title="Remove group from scaffold"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {cards.length > 0 && (
                <div className="flex flex-wrap gap-1 w-full">
                    {cards.map((card) => (
                        <div key={card.id} className="relative group" style={{ width: 91, height: 130 }}>
                            <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: 130 }}>
                                <DraggableCard
                                    image={card}
                                    index={card.index}
                                    onDescriptionsUpdate={() => {}}
                                    onDelete={async () => {}}
                                    onTrash={() => onCardRemove(card.id, id)}
                                    onUnTrash={() => {}}
                                    draggable={false}
                                />
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCardRemove(card.id, id);
                                }}
                                className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[105] shadow-md"
                                style={{ top: '-2px', right: '-8px' }}
                                title="Remove from stage"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {cards.length === 0 && !isOver && (
                <div className="flex items-center justify-center h-32 text-grey-dark text-sm">
                    <span className="text-xs">Drag a visual in here to begin.</span>
                </div>
            )}
        </div>
    );
};

export default WorkflowProcess;

