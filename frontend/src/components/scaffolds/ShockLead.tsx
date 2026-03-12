// Import dependencies
import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ImageData, DragItem, ScaffoldData, GroupData } from '../../types/types';
import { SCAFFOLD_GROUP_LABELS, SCAFFOLD_VALID_GROUP_NUMBERS } from '../../types/scaffoldMappings';
import DraggableCard from '../DraggableCard';
import GroupDiv from '../GroupDiv';

type ShockLeadProps = {
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

const ShockLead = ({
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
}: ShockLeadProps) => {
    const scaffoldNumber = scaffold?.number || 9;
    const validGroupNumbers = SCAFFOLD_VALID_GROUP_NUMBERS[scaffoldNumber] || [1, 2];
    const LEFT_GROUP_NUMBER = validGroupNumbers[0];
    const RIGHT_GROUP_NUMBER = validGroupNumbers[1];
    const labels = SCAFFOLD_GROUP_LABELS[scaffoldNumber] || { 1: 'Shock Fact', 2: 'Explanatory Factors' };

    const shockGroupId = 'shock-lead-shock';
    const factorsGroupId = 'shock-lead-factors';

    const [position, setPosition] = useState({
        x: scaffold?.x || 50,
        y: scaffold?.y || 50
    });

    useEffect(() => {
        if (scaffold) setPosition({ x: scaffold.x, y: scaffold.y });
    }, [scaffold]);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [shockCardIds, setShockCardIds] = useState<Set<string>>(new Set());
    const [factorsCardIds, setFactorsCardIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!scaffold) return;
        const shockIds = new Set<string>();
        const factorIds = new Set<string>();

        images.forEach((img) => {
            if (img.scaffoldId === scaffold.id) {
                if (img.scaffold_group_number === LEFT_GROUP_NUMBER) shockIds.add(img.id);
                else if (img.scaffold_group_number === RIGHT_GROUP_NUMBER) factorIds.add(img.id);
            }
        });

        setShockCardIds(shockIds);
        setFactorsCardIds(factorIds);
    }, [scaffold, images, LEFT_GROUP_NUMBER, RIGHT_GROUP_NUMBER]);

    const shockCards = images.filter((img) => shockCardIds.has(img.id));
    const factorCards = images.filter((img) => factorsCardIds.has(img.id));

    const scaffoldGroups = scaffold?.groups || [];
    const shockGroups = scaffoldGroups.filter((g) => g.scaffold_group_number === LEFT_GROUP_NUMBER);
    const factorGroups = scaffoldGroups.filter((g) => g.scaffold_group_number === RIGHT_GROUP_NUMBER);

    const handleCardAdd = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        const scaffoldGroupNumber = groupId === shockGroupId ? LEFT_GROUP_NUMBER : RIGHT_GROUP_NUMBER;

        await updateImageData(cardId, {
            scaffoldId: scaffold.id,
            scaffold_group_number: scaffoldGroupNumber
        } as any);

        if (groupId === shockGroupId) {
            setShockCardIds((prev) => new Set(prev).add(cardId));
            setFactorsCardIds((prev) => {
                const next = new Set(prev);
                next.delete(cardId);
                return next;
            });
        } else {
            setFactorsCardIds((prev) => new Set(prev).add(cardId));
            setShockCardIds((prev) => {
                const next = new Set(prev);
                next.delete(cardId);
                return next;
            });
        }
    };

    const handleCardRemove = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        await updateImageData(cardId, { scaffoldId: undefined, scaffold_group_number: undefined } as any);

        if (groupId === shockGroupId) {
            setShockCardIds((prev) => {
                const next = new Set(prev);
                next.delete(cardId);
                return next;
            });
        } else {
            setFactorsCardIds((prev) => {
                const next = new Set(prev);
                next.delete(cardId);
                return next;
            });
        }
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
                        id: 'shock-lead-scaffold',
                        type: 'group',
                        oldX: position.x,
                        oldY: position.y,
                        offsetX,
                        offsetY
                    };
                }
                return {
                    id: 'shock-lead-scaffold',
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

                let finalX = (item as any).oldX;
                let finalY = (item as any).oldY;

                if (dropResult && typeof dropResult === 'object' && 'x' in dropResult && 'y' in dropResult) {
                    const newPosition = dropResult as { x: number; y: number };
                    finalX = newPosition.x;
                    finalY = newPosition.y;
                    setPosition({ x: finalX, y: finalY });
                    if (onPositionUpdate) onPositionUpdate(finalX, finalY);
                } else if (clientOffset && storyBinRef.current) {
                    const binElement = storyBinRef.current.querySelector('#story-bin') as HTMLElement;
                    if (!binElement) return;

                    const binRect = binElement.getBoundingClientRect();
                    const scrollLeft = binElement.scrollLeft;
                    const scrollTop = binElement.scrollTop;

                    const wrapperWidth = 500;
                    const wrapperHeight = 300;

                    let newX = clientOffset.x - binRect.left - (item as any).offsetX + scrollLeft;
                    let newY = clientOffset.y - binRect.top - (item as any).offsetY + scrollTop;

                    const contentWidth = binElement.scrollWidth;
                    const contentHeight = binElement.scrollHeight;
                    newX = Math.max(0, Math.min(newX, contentWidth - wrapperWidth));
                    newY = Math.max(0, Math.min(newY, contentHeight - wrapperHeight));

                    finalX = newX;
                    finalY = newY;
                    setPosition({ x: finalX, y: finalY });
                    if (onPositionUpdate) onPositionUpdate(finalX, finalY);
                }
            },
            collect: (monitor) => ({ isDraggingDnd: !!monitor.isDragging() })
        }),
        [position, storyBinRef, onPositionUpdate]
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

            const wrapperWidth = 500;
            const wrapperHeight = 300;

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
    }, [isDragging, dragOffset, isDraggingDnd, storyBinRef, position, onPositionUpdate]);

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

    return (
        <div
            ref={combinedRef}
            className="absolute bg-grey-lighter-2 select-none rounded-sm shadow-md border border-grey-lightest z-[100]"
            style={{
                left: containerPos.left,
                top: containerPos.top,
                width: '500px',
                minHeight: '250px',
                cursor: isDragging || isDraggingDnd ? 'grabbing' : 'grab',
                opacity: isDraggingDnd ? 0.5 : 1,
                pointerEvents: 'auto'
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="flex justify-between items-center p-2 bg-bama-crimson text-white rounded-t-sm">
                <h3 className="text-sm font-bold">Shock and Lead</h3>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    title="Close Shock and Lead scaffold"
                >
                    ×
                </button>
            </div>

            <div className="flex flex-row gap-4 p-2">
                <ShockLeadGroup
                    id={shockGroupId}
                    title={labels[LEFT_GROUP_NUMBER] || 'Shock Fact'}
                    cards={shockCards}
                    onCardAdd={handleCardAdd}
                    onCardRemove={handleCardRemove}
                    scaffoldId={scaffold?.id}
                    scaffoldGroupNumber={LEFT_GROUP_NUMBER}
                    groups={shockGroups}
                    onGroupAdd={onGroupAdd}
                    onGroupRemove={onGroupRemove}
                    onCardAddToGroup={onCardAddToGroup}
                    onCardRemoveFromGroup={onCardRemoveFromGroup}
                    onGroupNameChange={onGroupNameChange}
                    onGroupDescriptionChange={onGroupDescriptionChange}
                    onGroupUpdate={onGroupUpdate}
                    storyBinRef={storyBinRef}
                />
                <ShockLeadGroup
                    id={factorsGroupId}
                    title={labels[RIGHT_GROUP_NUMBER] || 'Explanatory Factors'}
                    cards={factorCards}
                    onCardAdd={handleCardAdd}
                    onCardRemove={handleCardRemove}
                    scaffoldId={scaffold?.id}
                    scaffoldGroupNumber={RIGHT_GROUP_NUMBER}
                    groups={factorGroups}
                    onGroupAdd={onGroupAdd}
                    onGroupRemove={onGroupRemove}
                    onCardAddToGroup={onCardAddToGroup}
                    onCardRemoveFromGroup={onCardRemoveFromGroup}
                    onGroupNameChange={onGroupNameChange}
                    onGroupDescriptionChange={onGroupDescriptionChange}
                    onGroupUpdate={onGroupUpdate}
                    storyBinRef={storyBinRef}
                />
            </div>
        </div>
    );
};

type ShockLeadGroupProps = {
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

const ShockLeadGroup = ({
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
}: ShockLeadGroupProps) => {
    const groupRef = useRef<HTMLDivElement>(null);

    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: ['image', 'group'],
            drop: (item: DragItem) => {
                if (item.id === 'shock-lead-scaffold') return { droppedInGroup: false };
                if (item.type !== 'group' && item.groupId !== id && cards.length < 3) {
                    onCardAdd(item.id, id);
                    return { droppedInGroup: true, groupId: id };
                }
                if (item.type === 'group' && scaffoldId && scaffoldGroupNumber !== undefined && onGroupAdd) {
                    if (item.scaffoldId !== scaffoldId) {
                        onGroupAdd(item.id, scaffoldId, scaffoldGroupNumber);
                        return { droppedInScaffoldGroup: true, scaffoldId, scaffoldGroupNumber };
                    }
                }
                return { droppedInGroup: false };
            },
            canDrop: (item: DragItem) => {
                if (item.id === 'shock-lead-scaffold') return false;
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
            className={`p-2 bg-white rounded border transition-all duration-200 flex-1 relative ${
                isOver && canDrop
                    ? 'border-blue-400 border-2 bg-blue-50'
                    : isOver && !canDrop
                    ? 'border-red-400 border-2 bg-red-50'
                    : cards.length >= 3
                    ? 'border-grey-dark border-2'
                    : 'border-grey-lightest'
            }`}
            style={{ minHeight: '200px', width: '500px' }}
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
                                            style={{ top: '-2px', right: '8px' }}
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
                <div className="grid grid-cols-3 gap-2 h-full">
                    {cards.map((card) => (
                        <div key={card.id} className="relative group h-fit">
                            <div className="transform scale-75 origin-top-left">
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
                                style={{ top: '-2px', right: '8px' }}
                                title="Remove from group"
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

export default ShockLead;

