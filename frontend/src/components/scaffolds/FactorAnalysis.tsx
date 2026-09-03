// Import dependencies
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import type { ImageData, DragItem, ScaffoldData, GroupData } from '../../types/types';
import { SCAFFOLD_GROUP_LABELS } from '../../types/scaffoldMappings';
import DraggableCard from '../DraggableCard';
import GroupDiv from '../GroupDiv';
import { logAction } from '../../utils/userActionLogger';

const SCAFFOLD_NUMBER = 4;
const MIN_SLOTS = 2;
const MAX_SLOTS = 5;
const BASE_WIDTH = 650;
const SLOT_WIDTH = 286;

// Define props interface
type FactorAnalysisProps = {
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
};

/** Derive max scaffold_group_number from scaffold's groups and images belonging to this scaffold */
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

const FactorAnalysis = ({
    images,
    storyBinRef,
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
    onGroupUpdate,
    readOnly = false
}: FactorAnalysisProps) => {
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

    const groupLabels = SCAFFOLD_GROUP_LABELS[SCAFFOLD_NUMBER] || { 1: 'Factor 1', 2: 'Factor 2', 3: 'Factor 3', 4: 'Factor 4', 5: 'Factor 5' };

    // Display slot count: derive from data (max scaffold_group_number in groups + images), default 2 when no data
    const maxSlotInData = useMemo(() => getMaxSlotInData(scaffold ?? null, images), [scaffold, images]);
    const visibleSlotCountFromData = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, maxSlotInData || MIN_SLOTS));

    const [displaySlotCount, setDisplaySlotCount] = useState(MIN_SLOTS);

    // When scaffold or images change, set display count from data so reload restores 2–5 columns
    useEffect(() => {
        setDisplaySlotCount((prev) => Math.max(prev, visibleSlotCountFromData));
    }, [visibleSlotCountFromData]);

    // Local state: which card ids are in which factor (1..5)
    const [factorCardIds, setFactorCardIds] = useState<Record<number, Set<string>>>({
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
            if (img.scaffoldId === scaffold.id && img.scaffold_group_number != null && img.scaffold_group_number >= 1 && img.scaffold_group_number <= MAX_SLOTS) {
                next[img.scaffold_group_number].add(img.id);
            }
        });
        setFactorCardIds(next);
    }, [scaffold, images]);

    const getFactorFromGroupId = (groupId: string): number | null => {
        const m = groupId.match(/^factor-analysis-factor-(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
    };

    const handleCardAdd = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        const factor = getFactorFromGroupId(groupId);
        if (factor == null || factor < 1 || factor > MAX_SLOTS) return;

        await updateImageData(cardId, {
            scaffoldId: scaffold.id,
            scaffold_group_number: factor
        } as Partial<ImageData>);

        setFactorCardIds((prev) => {
            const next = { ...prev };
            for (let p = 1; p <= MAX_SLOTS; p++) {
                const s = new Set(next[p]);
                if (p === factor) s.add(cardId);
                else s.delete(cardId);
                next[p] = s;
            }
            return next;
        });

        logAction({ actionType: 'click', elementId: 'scaffold-card-add' }, { scaffoldType: 'factor_analysis', groupNumber: factor });
    };

    const handleCardRemove = async (cardId: string) => {
        if (!scaffold) return;

        await updateImageData(cardId, {
            scaffoldId: null,
            scaffold_group_number: null
        } as any);

        setFactorCardIds((prev) => {
            const next = { ...prev };
            for (let p = 1; p <= MAX_SLOTS; p++) {
                const s = new Set(next[p]);
                s.delete(cardId);
                next[p] = s;
            }
            return next;
        });
    };

    const handleAddFactor = () => {
        setDisplaySlotCount((prev) => Math.min(MAX_SLOTS, prev + 1));
    };

    const handleRemoveFactor = async () => {
        if (!scaffold || displaySlotCount <= MIN_SLOTS) return;
        const removedFactor = displaySlotCount;

        const imagesInFactor = images.filter(
            (img) => img.scaffoldId === scaffold.id && img.scaffold_group_number === removedFactor
        );
        for (const img of imagesInFactor) {
            await updateImageData(img.id, { scaffoldId: null, scaffold_group_number: null } as any);
        }

        const groupsInFactor = (scaffold.groups || []).filter((g) => g.scaffold_group_number === removedFactor);
        for (const group of groupsInFactor) {
            if (onGroupRemove) onGroupRemove(group.id);
        }

        setFactorCardIds((prev) => {
            const next = { ...prev };
            next[removedFactor] = new Set();
            return next;
        });
        setDisplaySlotCount((prev) => Math.max(MIN_SLOTS, prev - 1));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if (!storyBinRef.current) return;
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
            if (!isDragging || !storyBinRef.current) return;
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
                }
                dragStartPosition.current = null;
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, storyBinRef, position, onPositionUpdate, displaySlotCount]);

    const containerPos = storyBinRef.current
        ? { left: position.x, top: position.y }
        : { left: 0, top: 0 };

    const combinedRef = (element: HTMLDivElement | null) => {
        wrapperRef.current = element;
    };

    const scaffoldWidth = BASE_WIDTH + (displaySlotCount - 2) * SLOT_WIDTH;

    return (
        <div
            ref={combinedRef}
            className="absolute bg-grey-lighter-2 select-none rounded-lg shadow-md border border-grey-lightest z-[100]"
            style={{
                left: containerPos.left,
                top: containerPos.top,
                width: `${scaffoldWidth}px`,
                minHeight: '500px',
                cursor: isDragging ? 'grabbing' : 'grab',
                opacity: 1,
                pointerEvents: 'auto'
            }}
            onMouseDown={readOnly ? undefined : handleMouseDown}
        >
            <div className="flex justify-between items-center p-2 bg-bama-crimson text-white rounded-t-lg">
                <h3 className="text-sm font-bold flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="10" height="5" rx="1"/><rect x="3" y="9" width="10" height="5" rx="1"/></svg>Narrative Structure: Factor Analysis</h3>
                <div className="flex items-center gap-1">
                    {!readOnly && displaySlotCount < MAX_SLOTS && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                logAction(e);
                                handleAddFactor();
                            }}
                            className="px-2 py-0.5 text-xs bg-white bg-opacity-20 hover:bg-opacity-40 rounded transition-all duration-200"
                            title="Add factor"
                            log-id="scaffold-slot-add"
                        >
                            + Factor
                        </button>
                    )}
                    {!readOnly && displaySlotCount > MIN_SLOTS && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                logAction(e);
                                handleRemoveFactor();
                            }}
                            className="px-2 py-0.5 text-xs bg-white bg-opacity-20 hover:bg-opacity-40 rounded transition-all duration-200"
                            title="Remove last factor"
                            log-id="scaffold-slot-remove"
                        >
                            − Factor
                        </button>
                    )}
                    {!readOnly && (
                    <button
                        onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('createScaffold', { detail: { pattern: 'factor_analysis' } })); }}
                        className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white transition-all duration-200"
                        style={{ cursor: 'pointer' }}
                        title="Duplicate scaffold"
                    >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="5" width="9" height="9" rx="1.5" />
                            <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H3.5A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
                        </svg>
                    </button>
                    )}
                    {!readOnly && (
                    <button
                        onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('generateScaffoldStory', { detail: { scaffoldId: scaffold?.id || '' } })); }}
                        className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white transition-all duration-200"
                        style={{ cursor: 'pointer' }}
                        title="Generate story for this scaffold"
                    >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 2.5v11l9-5.5z" />
                        </svg>
                    </button>
                    )}
                    {!readOnly && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            logAction(e);
                            onClose();
                        }}
                        className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
                        style={{ cursor: 'pointer' }}
                        title="Close Factor Analysis scaffold"
                        log-id="scaffold-close"
                    >
                        ×
                    </button>
                    )}
                </div>
            </div>

            <div className="flex flex-row gap-4 p-2">
                {Array.from({ length: displaySlotCount }, (_, i) => i + 1).map((factorNum) => (
                    <FactorAnalysisFactor
                        key={factorNum}
                        id={`factor-analysis-factor-${factorNum}`}
                        title={groupLabels[factorNum] || `Factor ${factorNum}`}
                        cards={images.filter((img) => factorCardIds[factorNum]?.has(img.id))}
                        onCardAdd={handleCardAdd}
                        onCardRemove={handleCardRemove}
                        scaffoldId={scaffold?.id}
                        scaffoldGroupNumber={factorNum}
                        groups={(scaffold?.groups || []).filter((g) => g.scaffold_group_number === factorNum)}
                        onGroupAdd={onGroupAdd}
                        onGroupRemove={onGroupRemove}
                        onCardAddToGroup={onCardAddToGroup}
                        onCardRemoveFromGroup={onCardRemoveFromGroup}
                        onGroupNameChange={onGroupNameChange}
                        onGroupDescriptionChange={onGroupDescriptionChange}
                        onGroupUpdate={onGroupUpdate}
                        storyBinRef={storyBinRef}
                        readOnly={readOnly}
                    />
                ))}
            </div>
        </div>
    );
};

// Factor column (mirrors TimeBasedPeriod / CauseEffectGroup)
type FactorAnalysisFactorProps = {
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
    readOnly?: boolean;
};

const FactorAnalysisFactor = ({
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
    storyBinRef,
    readOnly = false
}: FactorAnalysisFactorProps) => {
    const groupRef = useRef<HTMLDivElement>(null);

    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: ['image', 'group'],
            drop: (item: DragItem) => {
                if (item.id === 'factor-analysis-scaffold') return { droppedInGroup: false };
                if (item.type !== 'group' && item.groupId !== id && cards.length < 6) {
                    onCardAdd(item.id, id);
                    return { droppedInGroup: true, groupId: id };
                }
                if (item.type === 'group' && scaffoldId != null && scaffoldGroupNumber != null && onGroupAdd) {
                    if (item.scaffoldId !== scaffoldId) {
                        onGroupAdd(item.id, scaffoldId, scaffoldGroupNumber);
                        logAction({ actionType: 'drop', elementId: 'scaffold-group-add' }, { scaffoldType: 'factor_analysis' });
                        return { droppedInScaffoldGroup: true, scaffoldId, scaffoldGroupNumber };
                    }
                }
                return { droppedInGroup: false };
            },
            canDrop: (item: DragItem) => {
                if (item.id === 'factor-analysis-scaffold') return false;
                if (item.type !== 'group') return item.groupId !== id && cards.length < 6;
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
            className={`p-2 bg-[rgb(228,237,245)] rounded border transition-all duration-200 flex-1 relative min-w-0 ${
                isOver && canDrop
                    ? 'border-blue-400 border-2 bg-blue-50'
                    : isOver && !canDrop
                    ? 'border-red-400 border-2 bg-red-50'
                    : 'border-[rgb(218,230,236)]'
            }`}
            style={{ minHeight: '450px' }}
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

            {isOver && !canDrop && cards.length >= 6 && (
                <div className="flex items-center justify-center h-[80%] border-2 border-dashed border-red-400 rounded-lg bg-red-50">
                    <div className="text-red-600 text-sm font-medium">Group is full (Max: 6 visuals)</div>
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
                                                logAction(e);
                                                onGroupRemove(group.id);
                                            }}
                                            className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[105] shadow-md"
                                            style={{ top: '-2px', right: '8px' }}
                                            title="Remove group from scaffold"
                                            log-id="scaffold-group-remove"
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
                        <div key={card.id} className="relative group">
                            <div style={{ zoom: 0.7 }}>
                                <DraggableCard
                                    image={card}
                                    index={card.index}
                                    onDescriptionsUpdate={() => {}}
                                    onDelete={async () => {}}
                                    onTrash={() => onCardRemove(card.id, id)}
                                    onUnTrash={() => {}}
                                    draggable={false}
                                    readOnly={readOnly}
                                />
                            </div>
                            {/* Remove button overlay — hidden in readOnly */}
                            {!readOnly && <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    logAction(e);
                                    onCardRemove(card.id, id);
                                }}
                                className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[305] shadow-md"
                                style={{ top: '2px', right: '2px' }}
                                title="Remove from factor"
                                log-id="scaffold-card-remove"
                            >
                                ×
                            </button>}
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

export default FactorAnalysis;
