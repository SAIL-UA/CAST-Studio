// Import dependencies
import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ImageData, DragItem, ScaffoldData, GroupData } from '../../types/types';
import { SCAFFOLD_VALID_GROUP_NUMBERS } from '../../types/scaffoldMappings';
import DraggableCard from '../DraggableCard';
import GroupDiv from '../GroupDiv';

// Define props interface
type ProblemSolutionProps = {
    images: ImageData[];
    storyBinRef: React.RefObject<HTMLDivElement | null>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    scaffold?: ScaffoldData;
    updateImageData: (imageId: string, data: Partial<ImageData>) => void;
    onPositionUpdate?: (x: number, y: number) => void;
    onClose?: () => void;
    onGroupAdd?: (groupId: string, scaffoldId: string, scaffoldGroupNumber?: number) => void;
    onGroupRemove?: (groupId: string) => void;
    onCardAddToGroup?: (cardId: string, groupId: string) => void;
    onCardRemoveFromGroup?: (cardId: string, groupId: string) => void;
    onGroupNameChange?: (groupId: string, newName: string) => void;
    onGroupDescriptionChange?: (groupId: string, newDescription: string) => void;
    onGroupUpdate?: (groupId: string, updates: { name?: string; description?: string }) => void;
}

// Problem and Solution Scaffold component
const ProblemSolution = ({
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
}: ProblemSolutionProps) => {
    // Use scaffold position if provided, otherwise default
    const [position, setPosition] = useState({ 
        x: scaffold?.x || 50, 
        y: scaffold?.y || 50 
    });
    
    // Update position when scaffold changes
    useEffect(() => {
        if (scaffold) {
            setPosition({ x: scaffold.x, y: scaffold.y });
        }
    }, [scaffold]);
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const problemGroupId = 'problem-solution-problem';
    const solutionGroupId = 'problem-solution-solution';
    
    // Get scaffold group numbers from mappings using scaffold number
    const scaffoldNumber = scaffold?.number || 6;
    const validGroupNumbers = SCAFFOLD_VALID_GROUP_NUMBERS[scaffoldNumber] || [1, 2];
    const PROBLEM_GROUP_NUMBER = validGroupNumbers[0];  // scaffold_group_number for problem
    const SOLUTION_GROUP_NUMBER = validGroupNumbers[1];  // scaffold_group_number for solution

    // Local state to track which cards are in which group
    const [problemCardIds, setProblemCardIds] = useState<Set<string>>(new Set());
    const [solutionCardIds, setSolutionCardIds] = useState<Set<string>>(new Set());

    // Initialize local state from images that already have scaffold_group_number set
    useEffect(() => {
        if (!scaffold) return;
        
        const problemIds = new Set<string>();
        const solutionIds = new Set<string>();
        
        images.forEach(img => {
            if (img.scaffoldId === scaffold.id) {
                if (img.scaffold_group_number === PROBLEM_GROUP_NUMBER) {
                    problemIds.add(img.id);
                } else if (img.scaffold_group_number === SOLUTION_GROUP_NUMBER) {
                    solutionIds.add(img.id);
                }
            }
        });
        
        setProblemCardIds(problemIds);
        setSolutionCardIds(solutionIds);
    }, [scaffold, images]);

    // Get cards for each group from local state
    const problemCards = images.filter(img => problemCardIds.has(img.id));
    const solutionCards = images.filter(img => solutionCardIds.has(img.id));

    // Get groups that belong to this scaffold, separated by scaffold_group_number
    const scaffoldGroups = scaffold?.groups || [];
    const problemGroups = scaffoldGroups.filter(group => group.scaffold_group_number === PROBLEM_GROUP_NUMBER);
    const solutionGroups = scaffoldGroups.filter(group => group.scaffold_group_number === SOLUTION_GROUP_NUMBER);

    // Updated handler: now calls backend to persist scaffold_group_number
    const handleCardAdd = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        
        // Determine scaffold_group_number based on groupId
        const scaffoldGroupNumber = groupId === problemGroupId 
            ? PROBLEM_GROUP_NUMBER 
            : SOLUTION_GROUP_NUMBER;
        
        // Update backend with scaffoldId and scaffold_group_number
        // Note: Use camelCase (scaffoldId) to match types.ts - updateImageData will transform to snake_case for API
        await updateImageData(cardId, {
            scaffoldId: scaffold.id,
            scaffold_group_number: scaffoldGroupNumber
        } as any);
        
        // Update local state
        if (groupId === problemGroupId) {
            setProblemCardIds(prev => {
                const newSet = new Set(prev);
                newSet.add(cardId);
                return newSet;
            });
            // Remove from solution if it was there
            setSolutionCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        } else if (groupId === solutionGroupId) {
            setSolutionCardIds(prev => {
                const newSet = new Set(prev);
                newSet.add(cardId);
                return newSet;
            });
            // Remove from problem if it was there
            setProblemCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        }
    };

    // Updated handler: now calls backend to clear scaffold_group_number
    const handleCardRemove = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        
        // Update backend to clear scaffoldId and scaffold_group_number
        // Note: Use camelCase (scaffoldId) to match types.ts - updateImageData will transform to snake_case for API
        await updateImageData(cardId, {
            scaffoldId: undefined,
            scaffold_group_number: undefined
        } as any);
        
        // Update local state
        if (groupId === problemGroupId) {
            setProblemCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        } else if (groupId === solutionGroupId) {
            setSolutionCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        }
    };

    // React DnD hook for drag functionality (wrapper)
    const [{ isDraggingDnd }, drag] = useDrag(() => ({
        type: 'group',
        item: () => {
            if (wrapperRef.current && storyBinRef.current) {
                const wrapperRect = wrapperRef.current.getBoundingClientRect();
                const event = window.event as MouseEvent;
                const offsetX = event.clientX - wrapperRect.left;
                const offsetY = event.clientY - wrapperRect.top;
                
                return {
                    id: 'problem-solution-scaffold',
                    type: 'group',
                    oldX: position.x,
                    oldY: position.y,
                    offsetX,
                    offsetY,
                };
            }
        return {
            id: 'problem-solution-scaffold',
            type: 'group',
            oldX: position.x,
            oldY: position.y,
            offsetX: 0,
            offsetY: 0,
        };
    },
        end: (item, monitor) => {
        const dropResult = monitor.getDropResult();
        const clientOffset = monitor.getClientOffset();

        let finalX = item.oldX;
        let finalY = item.oldY;

        if (dropResult && typeof dropResult === 'object' && 'x' in dropResult && 'y' in dropResult) {
            const newPosition = dropResult as { x: number; y: number };
            finalX = newPosition.x;
            finalY = newPosition.y;
            setPosition({ x: finalX, y: finalY });
            // Call onPositionUpdate if provided
            if (onPositionUpdate) {
                onPositionUpdate(finalX, finalY);
            }
        } else if (clientOffset && storyBinRef.current) {
            // Find the actual bin element (scrollable container) within the wrapper
            const binElement = storyBinRef.current.querySelector('#story-bin') as HTMLElement;
            if (!binElement) return;
            
            const binRect = binElement.getBoundingClientRect();
            // Account for scroll position within the bin
            const scrollLeft = binElement.scrollLeft;
            const scrollTop = binElement.scrollTop;
            
            const wrapperWidth = 500; // Scaffold width
            const wrapperHeight = 300; // Approximate height
                
            let newX = clientOffset.x - binRect.left - item.offsetX + scrollLeft;
            let newY = clientOffset.y - binRect.top - item.offsetY + scrollTop;

            const contentWidth = binElement.scrollWidth;
            const contentHeight = binElement.scrollHeight;
            newX = Math.max(0, Math.min(newX, contentWidth - wrapperWidth));
            newY = Math.max(0, Math.min(newY, contentHeight - wrapperHeight));

                finalX = newX;
                finalY = newY;
                setPosition({ x: finalX, y: finalY });
                // Call onPositionUpdate if provided
                if (onPositionUpdate) {
                    onPositionUpdate(finalX, finalY);
                }
            }
        },
        collect: (monitor) => ({
            isDraggingDnd: !!monitor.isDragging(),
        }),
    }), [position, storyBinRef, onPositionUpdate]);

    // Handle mouse drag for wrapper
    const handleMouseDown = (e: React.MouseEvent) => {
        // Don't start drag if clicking on close button or header buttons
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        if (isDraggingDnd) return;
        if (!storyBinRef.current) return;

        // Find the actual bin element (scrollable container) within the wrapper
        const binElement = storyBinRef.current.querySelector('#story-bin') as HTMLElement;
        if (!binElement) return;

        const binRect = binElement.getBoundingClientRect();
        // Account for scroll position within the bin
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
                if (isDragging) {
                    setIsDragging(false);
                }
                return;
            }

            // Find the actual bin element (scrollable container) within the wrapper
            const binElement = storyBinRef.current.querySelector('#story-bin') as HTMLElement;
            if (!binElement) {
                setIsDragging(false);
                return;
            }

            const binRect = binElement.getBoundingClientRect();
            // Account for scroll position within the bin
            const scrollLeft = binElement.scrollLeft;
            const scrollTop = binElement.scrollTop;
            
            const wrapperWidth = 500; // Scaffold width
            const wrapperHeight = 300; // Approximate height

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
                // Call onPositionUpdate when drag ends if position changed
                if (dragStartPosition.current && onPositionUpdate) {
                    const positionChanged =
                        Math.abs(position.x - dragStartPosition.current.x) > 1 ||
                        Math.abs(position.y - dragStartPosition.current.y) > 1;
                    if (positionChanged) {
                        onPositionUpdate(position.x, position.y);
                    }
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

    // Stop custom dragging when React DnD starts
    useEffect(() => {
        if (isDraggingDnd && isDragging) {
            setIsDragging(false);
        }
    }, [isDraggingDnd, isDragging]);

    // Calculate container position relative to story bin
    const containerPos = storyBinRef.current
        ? {
            left: position.x,
            top: position.y,
          }
        : { left: 0, top: 0 };

    // Combine refs for drag functionality
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
                width: '500px', // Width for two groups side by side (320px each + gap)
                minHeight: '250px',
                cursor: isDragging || isDraggingDnd ? 'grabbing' : 'grab',
                opacity: isDraggingDnd ? 0.5 : 1,
                pointerEvents: 'auto'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="flex justify-between items-center p-2 bg-bama-crimson text-white rounded-t-sm">
                <h3 className="text-sm font-bold">Problem and Solution</h3>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClose) {
                            onClose();
                        } else {
                            setSelectedPattern('');
                        }
                    }}
                    className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    title="Close Problem and Solution scaffold"
                >
                    ×
                </button>
            </div>

            {/* Groups Container - Horizontal Layout */}
            <div className="flex flex-row gap-4 p-2">
            {/* Problem Group */}
            <ProblemSolutionGroup
                id={problemGroupId}
                title="Problem"
                cards={problemCards}
                onCardAdd={handleCardAdd}
                onCardRemove={handleCardRemove}
                scaffoldId={scaffold?.id}
                scaffoldGroupNumber={PROBLEM_GROUP_NUMBER}
                groups={problemGroups}
                onGroupAdd={onGroupAdd}
                onGroupRemove={onGroupRemove}
                onCardAddToGroup={onCardAddToGroup}
                onCardRemoveFromGroup={onCardRemoveFromGroup}
                onGroupNameChange={onGroupNameChange}
                onGroupDescriptionChange={onGroupDescriptionChange}
                onGroupUpdate={onGroupUpdate}
                storyBinRef={storyBinRef}
            />

            {/* Solution Group */}
            <ProblemSolutionGroup
                id={solutionGroupId}
                title="Solution"
                cards={solutionCards}
                onCardAdd={handleCardAdd}
                onCardRemove={handleCardRemove}
                scaffoldId={scaffold?.id}
                scaffoldGroupNumber={SOLUTION_GROUP_NUMBER}
                groups={solutionGroups}
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

// Custom group component for problem/solution groups
type ProblemSolutionGroupProps = {
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

const ProblemSolutionGroup = ({ 
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
}: ProblemSolutionGroupProps) => {
    const groupRef = useRef<HTMLDivElement>(null);

    // React DnD hook for drop functionality - accepts both images and groups
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ['image', 'group'],
        drop: (item: DragItem, monitor) => {
            // Don't process drops from the scaffold itself
            if (item.id === 'problem-solution-scaffold') {
                return { droppedInGroup: false };
            }
            // Handle image drops
            if (item.type !== 'group' && item.groupId !== id && cards.length < 3) {
                console.log(`Card ${item.id} dropped into ${id}`);
                onCardAdd(item.id, id);
                return {
                    droppedInGroup: true,
                    groupId: id,
                };
            }
            // Handle group drops
            if (item.type === 'group' && scaffoldId && scaffoldGroupNumber !== undefined && onGroupAdd) {
                // Check if group doesn't already belong to this scaffold
                if (item.scaffoldId !== scaffoldId) {
                    console.log(`Group ${item.id} dropped into ${id} (scaffold group ${scaffoldGroupNumber})`);
                    onGroupAdd(item.id, scaffoldId, scaffoldGroupNumber);
                    return {
                        droppedInScaffoldGroup: true,
                        scaffoldId: scaffoldId,
                        scaffoldGroupNumber: scaffoldGroupNumber,
                    };
                }
            }
            return { droppedInGroup: false };
        },
        canDrop: (item: DragItem) => {
            // Don't accept the scaffold itself (it has id 'problem-solution-scaffold')
            if (item.id === 'problem-solution-scaffold') {
                return false;
            }
            // For images: can drop if not already in this group and group has less than 3 cards
            if (item.type !== 'group') {
                return item.groupId !== id && cards.length < 3;
            }
            // For groups: can drop if it's a group and doesn't already belong to this scaffold
            return item.type === 'group' && item.scaffoldId !== scaffoldId;
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [id, onCardAdd, cards.length, scaffoldId, scaffoldGroupNumber, onGroupAdd]);

    // Combine refs
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
            {/* Group Header */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-grey-light">
                <h4 className="text-xs font-bold text-grey-darkest">{title}</h4>
            </div>

            {/* Drop zone indicator when dragging over */}
            {isOver && canDrop && (
                <div className="flex items-center justify-center h-[80%] border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 absolute inset-0 z-[105]">
                    <div className="text-blue-600 text-sm font-medium">
                        {cards.length === 0 ? 'Drop card or group here' : 'Drop here'}
                    </div>
                </div>
            )}

            {/* Full group indicator when trying to drop on full group */}
            {isOver && !canDrop && cards.length >= 3 && (
                <div className="flex items-center justify-center h-[80%] border-2 border-dashed border-red-400 rounded-lg bg-red-50">
                    <div className="text-red-600 text-sm font-medium">
                        Group is full (Max: 3 visuals)
                    </div>
                </div>
            )}

            {/* Display groups that belong to this scaffold group */}
            {groups.length > 0 && (
                <div className="mt-2 pt-2 border-t border-grey-light">
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto" style={{ position: 'relative' }}>
                        {groups.map((group, index) => {
                            const scaledWidth = 160; // 320px * 0.5
                            const scaledHeight = 128; // 256px * 0.5
                            const gap = 8; // gap-2 = 8px
                            
                            return (
                                <div 
                                    key={group.id}
                                    className="relative group"
                                    style={{
                                        width: `${scaledWidth}px`,
                                        height: `${scaledHeight}px`,
                                        marginRight: index < groups.length - 1 ? `${gap}px` : '0',
                                        marginBottom: `${gap}px`,
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
                                            left: 0,
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
                                            onPositionUpdate={() => {}}  // Disable position updates inside scaffold
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
                                    {/* Remove button overlay - similar to image remove button */}
                                    {onGroupRemove && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onGroupRemove(group.id);
                                            }}
                                            className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[105] shadow-md"
                                            style={{
                                                top: '-2px',
                                                right: '8px'
                                            }}
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

            {/* Cards Grid */}
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
                            {/* Remove button overlay */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCardRemove(card.id, id);
                                }}
                                className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[105] shadow-md"
                                style={{
                                    top: '-2px',
                                    right: '8px'
                                }}
                                title="Remove from group"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {cards.length === 0 && !isOver && (
                <div className="flex items-center justify-center h-32 text-grey-dark text-sm">
                    <span className="text-xs">Drag a visual in here to begin.</span>
                </div>
            )}
        </div>
    );
};

export default ProblemSolution;
