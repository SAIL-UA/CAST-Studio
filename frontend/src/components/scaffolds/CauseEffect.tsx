// Import dependencies
import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ImageData, DragItem } from '../../types/types';
import DraggableCard from '../DraggableCard';

// Define props interface
type CauseEffectProps = {
    images: ImageData[];
    storyBinRef: React.RefObject<HTMLDivElement | null>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
}

// Cause and Effect Scaffold component
const CauseEffect = ({
    images,
    storyBinRef,
    setSelectedPattern
}: CauseEffectProps) => {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const causesGroupId = 'cause-effect-causes';
    const effectsGroupId = 'cause-effect-effects';

    // Local state to track which cards are in which group (for demo/UI purposes)
    const [causesCardIds, setCausesCardIds] = useState<Set<string>>(new Set());
    const [effectsCardIds, setEffectsCardIds] = useState<Set<string>>(new Set());

    // Get cards for each group from local state
    const causesCards = images.filter(img => causesCardIds.has(img.id));
    const effectsCards = images.filter(img => effectsCardIds.has(img.id));

    // Local handlers for adding/removing cards (no backend calls)
    const handleCardAdd = (cardId: string, groupId: string) => {
        if (groupId === causesGroupId) {
            setCausesCardIds(prev => {
                const newSet = new Set(prev);
                newSet.add(cardId);
                return newSet;
            });
            // Remove from effects if it was there
            setEffectsCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        } else if (groupId === effectsGroupId) {
            setEffectsCardIds(prev => {
                const newSet = new Set(prev);
                newSet.add(cardId);
                return newSet;
            });
            // Remove from causes if it was there
            setCausesCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        }
    };

    const handleCardRemove = (cardId: string, groupId: string) => {
        if (groupId === causesGroupId) {
            setCausesCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        } else if (groupId === effectsGroupId) {
            setEffectsCardIds(prev => {
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
                    id: 'cause-effect-scaffold',
                    type: 'group',
                    oldX: position.x,
                    oldY: position.y,
                    offsetX,
                    offsetY,
                };
            }
        return {
            id: 'cause-effect-scaffold',
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
        } else if (clientOffset && storyBinRef.current) {
            const binRect = storyBinRef.current.getBoundingClientRect();
            const wrapperWidth = 680; // Width for two groups side by side
            const wrapperHeight = 300; // Approximate height
                
                let newX = clientOffset.x - binRect.left - item.offsetX;
                let newY = clientOffset.y - binRect.top - item.offsetY;

                newX = Math.max(0, Math.min(newX, binRect.width - wrapperWidth));
                newY = Math.max(0, Math.min(newY, binRect.height - wrapperHeight));

                finalX = newX;
                finalY = newY;
                setPosition({ x: finalX, y: finalY });
            }
        },
        collect: (monitor) => ({
            isDraggingDnd: !!monitor.isDragging(),
        }),
    }), [position, storyBinRef]);

    // Handle mouse drag for wrapper
    const handleMouseDown = (e: React.MouseEvent) => {
        // Don't start drag if clicking on close button or header buttons
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        if (isDraggingDnd) return;
        if (!storyBinRef.current) return;

        const binRect = storyBinRef.current.getBoundingClientRect();
        setIsDragging(true);
        dragStartPosition.current = { x: position.x, y: position.y };
        setDragOffset({
            x: e.clientX - binRect.left - position.x,
            y: e.clientY - binRect.top - position.y
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

            const binRect = storyBinRef.current.getBoundingClientRect();
            const wrapperWidth = 680; // Width for two groups side by side
            const wrapperHeight = 300; // Approximate height

            let newX = e.clientX - binRect.left - dragOffset.x;
            let newY = e.clientY - binRect.top - dragOffset.y;

            newX = Math.max(0, Math.min(newX, binRect.width - wrapperWidth));
            newY = Math.max(0, Math.min(newY, binRect.height - wrapperHeight));

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
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
    }, [isDragging, dragOffset, isDraggingDnd, storyBinRef]);

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
            className="absolute bg-grey-lighter-2 select-none rounded-sm shadow-md border border-grey-lightest"
            style={{
                left: containerPos.left,
                top: containerPos.top,
                width: '500px', // Width for two groups side by side (320px each + gap)
                minHeight: '250px',
                cursor: isDragging || isDraggingDnd ? 'grabbing' : 'grab',
                opacity: isDraggingDnd ? 0.5 : 1,
                zIndex: 40,
                pointerEvents: 'auto'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="flex justify-between items-center p-2 bg-bama-crimson text-white rounded-t-sm">
                <h3 className="text-sm font-bold">Cause and Effects</h3>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPattern('');
                    }}
                    className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    title="Close Cause and Effects scaffold"
                >
                    ×
                </button>
            </div>

            {/* Groups Container - Horizontal Layout */}
            <div className="flex flex-row gap-4 p-2">
            {/* Causes Group */}
            <CauseEffectGroup
                id={causesGroupId}
                title="Causes"
                cards={causesCards}
                onCardAdd={handleCardAdd}
                onCardRemove={handleCardRemove}
            />

            {/* Effects Group */}
            <CauseEffectGroup
                id={effectsGroupId}
                title="Effects"
                cards={effectsCards}
                onCardAdd={handleCardAdd}
                onCardRemove={handleCardRemove}
            />
            </div>
        </div>
    );
};

// Custom group component for cause/effect groups
type CauseEffectGroupProps = {
    id: string;
    title: string;
    cards: ImageData[];
    onCardAdd: (cardId: string, groupId: string) => void;
    onCardRemove: (cardId: string, groupId: string) => void;
};

const CauseEffectGroup = ({ id, title, cards, onCardAdd, onCardRemove }: CauseEffectGroupProps) => {
    const groupRef = useRef<HTMLDivElement>(null);

    // React DnD hook for drop functionality
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: 'image',
        drop: (item: DragItem, monitor) => {
            if (item.groupId !== id && cards.length < 3) {
                console.log(`Card ${item.id} dropped into ${id}`);
                onCardAdd(item.id, id);
                return {
                    droppedInGroup: true,
                    groupId: id,
                };
            }
            return { droppedInGroup: false };
        },
        canDrop: (item: DragItem) => {
            return item.groupId !== id && cards.length < 3;
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [id, onCardAdd, cards.length]);

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
            className={`p-2 bg-white rounded border transition-all duration-200 flex-1 ${
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

            {/* Drop zone indicator when empty */}
            {isOver && canDrop && cards.length === 0 && (
                <div className="flex items-center justify-center h-[80%] border-2 border-dashed border-blue-400 rounded-lg bg-blue-50">
                    <div className="text-blue-600 text-sm font-medium">
                        Drop card here
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
                                className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-md"
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

export default CauseEffect;
