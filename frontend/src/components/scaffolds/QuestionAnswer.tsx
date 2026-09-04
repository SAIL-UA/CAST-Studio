// Import dependencies
import React, { useState, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import type { ImageData, DragItem, ScaffoldData, GroupData } from '../../types/types';
import { SCAFFOLD_VALID_GROUP_NUMBERS } from '../../types/scaffoldMappings';
import DraggableCard from '../DraggableCard';
import GroupDiv from '../GroupDiv';
import { logAction } from '../../utils/userActionLogger';

// Define props interface
type QuestionAnswerProps = {
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
    readOnly?: boolean;
}

// Question and Answer Scaffold component
const QuestionAnswer = ({
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
    onGroupUpdate,
    readOnly = false
}: QuestionAnswerProps) => {
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

    const questionGroupId = 'question-answer-question';
    const answerGroupId = 'question-answer-answer';
    
    // Get scaffold group numbers from mappings using scaffold number
    const scaffoldNumber = scaffold?.number || 2;
    const validGroupNumbers = SCAFFOLD_VALID_GROUP_NUMBERS[scaffoldNumber] || [1, 2];
    const QUESTION_GROUP_NUMBER = validGroupNumbers[0];  // scaffold_group_number for question
    const ANSWER_GROUP_NUMBER = validGroupNumbers[1];  // scaffold_group_number for answer

    // Local state to track which cards are in which group
    const [questionCardIds, setQuestionCardIds] = useState<Set<string>>(new Set());
    const [answerCardIds, setAnswerCardIds] = useState<Set<string>>(new Set());

    // Initialize local state from images that already have scaffold_group_number set
    useEffect(() => {
        if (!scaffold) return;
        
        const questionIds = new Set<string>();
        const answerIds = new Set<string>();
        
        images.forEach(img => {
            if (img.scaffoldId === scaffold.id) {
                if (img.scaffold_group_number === QUESTION_GROUP_NUMBER) {
                    questionIds.add(img.id);
                } else if (img.scaffold_group_number === ANSWER_GROUP_NUMBER) {
                    answerIds.add(img.id);
                }
            }
        });
        
        setQuestionCardIds(questionIds);
        setAnswerCardIds(answerIds);
    }, [scaffold, images]);

    // Get cards for each group from local state
    const questionCards = images.filter(img => questionCardIds.has(img.id));
    const answerCards = images.filter(img => answerCardIds.has(img.id));

    // Get groups that belong to this scaffold, separated by scaffold_group_number
    const scaffoldGroups = scaffold?.groups || [];
    const questionGroups = scaffoldGroups.filter(group => group.scaffold_group_number === QUESTION_GROUP_NUMBER);
    const answerGroups = scaffoldGroups.filter(group => group.scaffold_group_number === ANSWER_GROUP_NUMBER);

    // Updated handler: now calls backend to persist scaffold_group_number
    const handleCardAdd = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        
        // Determine scaffold_group_number based on groupId
        const scaffoldGroupNumber = groupId === questionGroupId 
            ? QUESTION_GROUP_NUMBER 
            : ANSWER_GROUP_NUMBER;
        
        // Update backend with scaffoldId and scaffold_group_number
        // Note: Use camelCase (scaffoldId) to match types.ts - updateImageData will transform to snake_case for API
        await updateImageData(cardId, {
            scaffoldId: scaffold.id,
            scaffold_group_number: scaffoldGroupNumber
        } as any);
        
        // Update local state
        if (groupId === questionGroupId) {
            setQuestionCardIds(prev => {
                const newSet = new Set(prev);
                newSet.add(cardId);
                return newSet;
            });
            // Remove from answer if it was there
            setAnswerCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        } else if (groupId === answerGroupId) {
            setAnswerCardIds(prev => {
                const newSet = new Set(prev);
                newSet.add(cardId);
                return newSet;
            });
            // Remove from question if it was there
            setQuestionCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        }

        logAction({ actionType: 'click', elementId: 'scaffold-card-add' }, { scaffoldType: 'question_answer', groupNumber: scaffoldGroupNumber });
    };

    // Updated handler: now calls backend to clear scaffold_group_number
    const handleCardRemove = async (cardId: string, groupId: string) => {
        if (!scaffold) return;
        
        // Update backend to clear scaffoldId and scaffold_group_number
        // Note: Use camelCase (scaffoldId) to match types.ts - updateImageData will transform to snake_case for API
        await updateImageData(cardId, {
            scaffoldId: null,
            scaffold_group_number: null
        } as any);
        
        // Update local state
        if (groupId === questionGroupId) {
            setQuestionCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        } else if (groupId === answerGroupId) {
            setAnswerCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        }
    };

    // Handle mouse drag for wrapper
    const handleMouseDown = (e: React.MouseEvent) => {
        // Don't start drag if clicking on close button or header buttons
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
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
            if (!isDragging || !storyBinRef.current) return;

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
            
            const wrapperWidth = 650;
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

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, storyBinRef, position, onPositionUpdate]);

    // Calculate container position relative to story bin
    const containerPos = storyBinRef.current
        ? {
            left: position.x,
            top: position.y,
          }
        : { left: 0, top: 0 };

    // Combine refs for drag functionality
    const combinedRef = (element: HTMLDivElement | null) => {
        wrapperRef.current = element;
    };

    return (
        <div
            ref={combinedRef}
            className="absolute bg-grey-lighter-2 select-none rounded-lg shadow-md border border-grey-lightest z-[100]"
            style={{
                left: containerPos.left,
                top: containerPos.top,
                width: '650px',
                minHeight: '500px',
                cursor: isDragging ? 'grabbing' : 'grab',
                opacity: 1,
                pointerEvents: 'auto'
            }}
            onMouseDown={readOnly ? undefined : handleMouseDown}
        >
            {/* Header */}
            <div className="flex justify-between items-center p-2 bg-bama-crimson text-white rounded-t-lg">
                <h3 className="text-sm font-bold flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="10" height="5" rx="1"/><rect x="3" y="9" width="10" height="5" rx="1"/></svg>Narrative Structure: Question and Answer</h3>
                {!readOnly && (
                <div className="flex items-center gap-1">
                <button
                    onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('createScaffold', { detail: { pattern: 'question_answer' } })); }}
                    className="w-5 h-5 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    title="Duplicate scaffold"
                >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="5" width="9" height="9" rx="1.5" />
                        <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H3.5A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('generateScaffoldStory', { detail: { scaffoldId: scaffold?.id || '' } })); }}
                    className="w-5 h-5 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    title="Generate story for this scaffold"
                >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 2.5v11l9-5.5z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        logAction(e);
                        if (onClose) {
                            onClose();
                        } else {
                            setSelectedPattern('');
                        }
                    }}
                    className="w-5 h-5 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    title="Close Question and Answer scaffold"
                    log-id="scaffold-close"
                >
                    ×
                </button>
                </div>
                )}
            </div>

            {/* Groups Container - Horizontal Layout */}
            <div className="flex flex-row gap-4 p-2">
            {/* Question Group */}
            <QuestionAnswerGroup
                id={questionGroupId}
                title="Question"
                cards={questionCards}
                onCardAdd={handleCardAdd}
                onCardRemove={handleCardRemove}
                scaffoldId={scaffold?.id}
                scaffoldGroupNumber={QUESTION_GROUP_NUMBER}
                groups={questionGroups}
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

            {/* Answer Group */}
            <QuestionAnswerGroup
                id={answerGroupId}
                title="Answer"
                cards={answerCards}
                onCardAdd={handleCardAdd}
                onCardRemove={handleCardRemove}
                scaffoldId={scaffold?.id}
                scaffoldGroupNumber={ANSWER_GROUP_NUMBER}
                groups={answerGroups}
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
            </div>

        </div>
    );
};

// Custom group component for question/answer groups
type QuestionAnswerGroupProps = {
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

const QuestionAnswerGroup = ({
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
}: QuestionAnswerGroupProps) => {
    const groupRef = useRef<HTMLDivElement>(null);

    // React DnD hook for drop functionality - accepts both images and groups
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ['image', 'group'],
        drop: (item: DragItem) => {
            // Don't process drops from the scaffold itself
            if (item.id === 'question-answer-scaffold') {
                return { droppedInGroup: false };
            }
            // Handle image drops
            if (item.type !== 'group' && item.groupId !== id && cards.length < 6) {
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
                    logAction({ actionType: 'drop', elementId: 'scaffold-group-add' }, { scaffoldType: 'question_answer' });
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
            // Don't accept the scaffold itself (it has id 'question-answer-scaffold')
            if (item.id === 'question-answer-scaffold') {
                return false;
            }
            // For images: can drop if not already in this group and group has less than 3 cards
            if (item.type !== 'group') {
                return item.groupId !== id && cards.length < 6;
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
            className={`p-2 bg-[rgb(228,237,245)] rounded border transition-all duration-200 flex-1 relative ${
                isOver && canDrop
                    ? 'border-blue-400 border-2 bg-blue-50'
                    : isOver && !canDrop
                    ? 'border-red-400 border-2 bg-red-50'
                    : 'border-[rgb(218,230,236)]'
            }`}
            style={{ minHeight: '450px' }}
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
            {isOver && !canDrop && cards.length >= 6 && (
                <div className="flex items-center justify-center h-[80%] border-2 border-dashed border-red-400 rounded-lg bg-red-50">
                    <div className="text-red-600 text-sm font-medium">
                        Group is full (Max: 6 visuals)
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
                                                logAction(e);
                                                onGroupRemove(group.id);
                                            }}
                                            className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[105] shadow-md"
                                            style={{
                                                top: '-2px',
                                                right: '8px'
                                            }}
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

            {/* Cards Grid */}
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
                                style={{
                                    top: '2px',
                                    right: '2px'
                                }}
                                title="Remove from group"
                                log-id="scaffold-card-remove"
                            >
                                ×
                            </button>}
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

export default QuestionAnswer;
