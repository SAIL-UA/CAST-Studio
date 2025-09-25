import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GroupDivProps, DragItem } from '../types/types';
import DraggableCard from './DraggableCard';

const GroupDiv: React.FC<GroupDivProps> = ({ 
  id, 
  number, 
  name, 
  description, 
  cards, 
  initialPosition, 
  onClose, 
  onPositionUpdate, 
  onCardAdd, 
  onCardRemove, 
  onNameChange, 
  onDescriptionChange, 
  storyBinRef 
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const groupRef = useRef<HTMLDivElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [tempDescription, setTempDescription] = useState(description);
  const [showEditModal, setShowEditModal] = useState(false);

  // React DnD hook for drop functionality (accept cards)
  const [{ isOver: isOverCard, canDrop: canDropCard }, dropCard] = useDrop(() => ({
    accept: 'image',
    drop: (item: DragItem, monitor) => {
      // Only handle if not already in this group and group isn't full
      if (item.groupId !== id && cards.length < 3) {
        console.log(`Card ${item.id} dropped into group ${id}`);
        onCardAdd(item.id, id);
      }
      return { droppedInGroup: true };
    },
    canDrop: (item: DragItem) => {
      // Can drop if: not already in this group AND group has less than 3 cards
      return item.groupId !== id && cards.length < 3;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [id, onCardAdd, cards.length]);

  // React DnD hook for drag functionality
  const [{ isDraggingDnd }, drag] = useDrag(() => ({
    type: 'group',
    item: () => {
      if (groupRef.current && storyBinRef.current) {
        const groupRect = groupRef.current.getBoundingClientRect();
        const binRect = storyBinRef.current.getBoundingClientRect();
        
        const event = window.event as MouseEvent;
        const offsetX = event.clientX - groupRect.left;
        const offsetY = event.clientY - groupRect.top;
        
        return {
          id: id,
          type: 'group',
          oldX: position.x,
          oldY: position.y,
          offsetX,
          offsetY,
        };
      }
      return {
        id: id,
        type: 'group',
        oldX: position.x,
        oldY: position.y,
        offsetX: 0,
        offsetY: 0,
      };
    },
    end: (item, monitor) => {
      // Update position when drag ends
      const dropResult = monitor.getDropResult();
      const clientOffset = monitor.getClientOffset();
      
      // If dropped on a target that returned position data, use that
      if (dropResult && typeof dropResult === 'object' && 'x' in dropResult && 'y' in dropResult) {
        const newPosition = dropResult as { x: number; y: number };
        setPosition({ x: newPosition.x, y: newPosition.y });
        onPositionUpdate(newPosition.x, newPosition.y);
        return;
      }
      
      // Otherwise calculate position (for drops outside valid targets)
      if (clientOffset && storyBinRef.current) {
        const binRect = storyBinRef.current.getBoundingClientRect();
        
        // Calculate new position relative to container
        let newX = clientOffset.x - binRect.left - item.offsetX;
        let newY = clientOffset.y - binRect.top - item.offsetY;
        
        // Constrain within container boundaries
        const groupWidth = 320; // 20rem = 320px
        const groupHeight = 256; // 16rem = 256px
        newX = Math.max(0, Math.min(newX, binRect.width - groupWidth));
        newY = Math.max(0, Math.min(newY, binRect.height - groupHeight));
        
        setPosition({ x: newX, y: newY });
        onPositionUpdate(newX, newY);
      }
    },
    collect: (monitor) => ({
      isDraggingDnd: !!monitor.isDragging(),
    }),
  }), [id, position, storyBinRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start custom drag if React DnD is already handling it
    if (isDraggingDnd) return;
    
    if (!storyBinRef.current) return;
    
    const binRect = storyBinRef.current.getBoundingClientRect();
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - binRect.left - position.x,
      y: e.clientY - binRect.top - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Stop custom drag if React DnD takes over
      if (!isDragging || !storyBinRef.current || isDraggingDnd) {
        setIsDragging(false);
        return;
      }

      const binRect = storyBinRef.current.getBoundingClientRect();
      
      // Calculate new position relative to container
      let newX = e.clientX - binRect.left - dragOffset.x;
      let newY = e.clientY - binRect.top - dragOffset.y;
      
      // Constrain within container boundaries (similar to card constraints)
      const groupWidth = 320; // GroupDiv width
      const groupHeight = 256; // GroupDiv height
      newX = Math.max(0, Math.min(newX, binRect.width - groupWidth));
      newY = Math.max(0, Math.min(newY, binRect.height - groupHeight));

      const newPosition = { x: newX, y: newY };
      setPosition(newPosition);
      onPositionUpdate(newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging && !isDraggingDnd) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isDraggingDnd]);

  // Stop custom dragging when React DnD starts
  useEffect(() => {
    if (isDraggingDnd && isDragging) {
      setIsDragging(false);
    }
  }, [isDraggingDnd, isDragging]);


  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag
    onClose(id);
  };

  // Position relative to the container (like draggable cards)
  const getContainerPosition = () => {
    return {
      left: position.x,
      top: position.y
    };
  };

  const containerPos = getContainerPosition();

  // Handle name editing
  const handleNameSave = () => {
    onNameChange(id, tempName);
    setEditingName(false);
  };

  const handleDescriptionSave = () => {
    onDescriptionChange(id, tempDescription);
    setEditingDescription(false);
  };

  // Handle card removal from group
  const handleCardRemove = (cardId: string) => {
    onCardRemove(cardId, id);
  };

  // Handle edit modal
  const handleShowEditModal = () => {
    setTempName(name);
    setTempDescription(description);
    setShowEditModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    document.body.style.overflow = 'auto';
  };

  const handleSaveEditModal = () => {
    onNameChange(id, tempName);
    onDescriptionChange(id, tempDescription);
    handleCloseEditModal();
  };

  // Combine refs for drag and drop functionality
  const combinedRef = (element: HTMLDivElement | null) => {
    if (element) {
      drag(element);
      dropCard(element);
      groupRef.current = element;
    }
  };

  return (
    <div 
      ref={combinedRef}
      className={`absolute w-80 h-64 bg-grey-lighter-2 select-none rounded-sm shadow-md border transition-all duration-200 ${
        isOverCard && canDropCard 
          ? 'border-blue-400 border-2 bg-blue-50' 
          : isOverCard && !canDropCard
          ? 'border-red-400 border-2 bg-red-50'
          : cards.length >= 3
          ? 'border-grey-dark border-2'
          : 'border-grey-lightest'
      }`}
      style={{
        left: containerPos.left,
        top: containerPos.top,
        cursor: isDragging || isDraggingDnd ? 'grabbing' : 'grab',
        opacity: isDraggingDnd ? 0.5 : 1,
        zIndex: 50,
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-2 bg-bama-crimson text-white">
        {editingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSave}
            onKeyPress={(e) => e.key === 'Enter' && handleNameSave()}
            className="text-sm font-bold bg-transparent border-b border-white text-white placeholder-white placeholder-opacity-70 outline-none"
            placeholder="Group name"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4 
            className="text-sm font-bold cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
            }}
          >
            {name || `Group ${number}`}
          </h4>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center space-x-1">
          {/* Edit button */}
          <button
            className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleShowEditModal();
            }}
            style={{ cursor: 'pointer' }}
            title="Edit group"
          >
            ✎
          </button>
          
          {/* Close button */}
          <button
            className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
            onClick={handleClose}
            style={{ cursor: 'pointer' }}
            title="Close group"
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Group content area */}
      <div className="p-2 h-52 overflow-hidden">
        {/* Drop zone indicator when empty and card is being dragged over */}
        {isOverCard && canDropCard && cards.length === 0 && (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-blue-400 rounded-lg bg-blue-50">
            <div className="text-blue-600 text-sm font-medium">
              Drop card here
            </div>
          </div>
        )}
        
        {/* Full group indicator when trying to drop on full group */}
        {isOverCard && !canDropCard && cards.length >= 3 && (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-red-400 rounded-lg bg-red-50">
            <div className="text-red-600 text-sm font-medium">
              Group is full (max 3 cards)
            </div>
          </div>
        )}
        
        {/* Card components - arranged in grid */}
        {cards.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 h-full">
            {cards.map((card, index) => (
              <div key={card.id} className="relative group h-fit">
                <div className="transform scale-75 origin-top-left">
                  <DraggableCard
                    image={card}
                    index={index}
                    onDescriptionsUpdate={() => {}} // Groups handle their own descriptions
                    onDelete={() => {}} // Groups handle their own deletion
                    onTrash={() => handleCardRemove(card.id)}
                    onUnTrash={() => {}}
                    draggable={true}
                  />
                </div>
                {/* Remove button overlay - positioned on the top-right of the scaled image */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardRemove(card.id);
                  }}
                  className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-md"
                  style={{
                    // Card is scaled to 75%, so 100px becomes 75px
                    // Position button more left and up from the top-right corner
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
        ) : !isOverCard && (
          <div className="flex items-center justify-center h-full text-grey-dark text-sm text-center">
            <div>
              Drag cards here<br/>
              <span className="text-xs">(max 3 cards)</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={handleCloseEditModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-grey-lightest">
              <h3 className="text-lg font-semibold text-grey-darkest">
                Edit Group
              </h3>
              <button
                onClick={handleCloseEditModal}
                className="w-6 h-6 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-grey-darkest mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3 py-2 border border-grey-lighter rounded-md focus:outline-none focus:ring-2 focus:ring-bama-crimson focus:border-transparent"
                  placeholder="Enter group name..."
                />
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-sm font-medium text-grey-darkest mb-2">
                  Description
                </label>
                <textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-grey-lighter rounded-md focus:outline-none focus:ring-2 focus:ring-bama-crimson focus:border-transparent resize-none"
                  placeholder="Enter group description..."
                />
              </div>

              {/* Group Info */}
              <div className="bg-grey-lightest p-3 rounded-md">
                <div className="text-sm text-grey-dark">
                  <div className="flex justify-between mb-1">
                    <span>Group Number:</span>
                    <span className="font-medium">{number}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Cards in Group:</span>
                    <span className="font-medium">{cards.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Group ID:</span>
                    <span className="font-mono text-xs">{id.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-4 border-t border-grey-lightest">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 text-grey-darker bg-grey-lighter hover:bg-grey-light rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditModal}
                className="px-4 py-2 bg-bama-crimson hover:bg-bama-crimson-dark text-white rounded-md transition-colors duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDiv;
