// Bin component for drag and drop containers

import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { BinProps, DragItem } from '../types/types';
import DraggableCard from './DraggableCard';

function Bin({ id, images, updateImageData, onDescriptionsUpdate, onDelete, onTrash, onUnTrash, isSuggestedOrderBin = false }: BinProps) {
  const binRef = useRef<HTMLDivElement>(null);

  // React DnD hook for drop functionality
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['image', 'group'],
    drop: (item: DragItem, monitor) => {
      if (isSuggestedOrderBin) return;

      const clientOffset = monitor.getClientOffset();

      // Handle group drops - calculate and return new position for the group
      if (item.type === 'group') {
        if (!binRef.current || !clientOffset) return;
        
        const dropTargetRect = binRef.current.getBoundingClientRect();

        let x_bin = clientOffset.x - dropTargetRect.left - item.offsetX;
        let y_bin = clientOffset.y - dropTargetRect.top - item.offsetY;

        // Constrain position within bin boundaries for groups
        const groupWidth = 320; // GroupDiv width
        const groupHeight = 256; // GroupDiv height
        x_bin = Math.max(0, Math.min(x_bin, dropTargetRect.width - groupWidth));
        y_bin = Math.max(0, Math.min(y_bin, dropTargetRect.height - groupHeight));

        console.log(`Group ${item.id} dropped on ${id} at (${x_bin}, ${y_bin})`);
        
        // Return the calculated position so the drag end handler can use it
        return { x: x_bin, y: y_bin };
      }
      if (!clientOffset || !binRef.current) return;

      const dropTargetRect = binRef.current.getBoundingClientRect();
      const binPageLeft = dropTargetRect.left + window.pageXOffset;
      const binPageTop = dropTargetRect.top + window.pageYOffset;

      let x_bin = clientOffset.x + window.pageXOffset - binPageLeft - item.offsetX;
      let y_bin = clientOffset.y + window.pageYOffset - binPageTop - item.offsetY;

      // Constrain position within bin boundaries
      x_bin = Math.max(0, Math.min(x_bin, dropTargetRect.width - 150)); // Card width
      y_bin = Math.max(0, Math.min(y_bin, dropTargetRect.height - 100)); // Card height

      console.log(`Dropped ${item.id} into ${id} at (${x_bin}, ${y_bin})`);

      // Update the card's position - keep in_storyboard=true for story-bin
      updateImageData(item.id, {
        in_storyboard: id === 'story-bin' ? true : id === 'storyboard-bin',
        x: x_bin,
        y: y_bin,
      });

      // Note: Removed logging functionality as requested
    },
    canDrop: () => !isSuggestedOrderBin,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [id, isSuggestedOrderBin, updateImageData]);

  // Combine refs for drop functionality
  const dropRef = (element: HTMLDivElement | null) => {
    if (element) {
      drop(element);
      binRef.current = element;
    }
  };

  // Dynamic styling based on drop state
  const getBinClasses = () => {
    let baseClasses = "relative w-full h-full rounded-sm transition-colors duration-200 grid-background";
    
    if (isSuggestedOrderBin) {
      baseClasses += " bg-grey-lightest border-grey-lightest grid-background";
    } else if (isOver && canDrop) {
      baseClasses += " bg-blue-50 border-blue-400 border-dashed grid-background";
    } else if (canDrop) {
      baseClasses += " bg-grey-lightest border-grey-lightest border-dashed grid-background";
    } else {
      baseClasses += " bg-white border-grey-lightest grid-background";
    }
    
    return baseClasses;
  };

  return (
    <div
      id={id}
      ref={dropRef}
      className={getBinClasses()}
      style={{
        overflow: 'auto'
      }}
    >
      {/* Drop zone indicator */}
      {isOver && canDrop && !isSuggestedOrderBin && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-100 bg-opacity-75 rounded-lg border-2 border-dashed border-blue-400 z-10">
          <div className="text-blue-600 text-lg font-semibold">
            Drop image here
          </div>
        </div>
      )}

      {/* Bin content */}
      <div className={
        isSuggestedOrderBin 
          ? "flex flex-wrap gap-2 grid-background" 
          : id === 'story-bin' 
            ? "flex flex-wrap gap-2 p-2  grid-background" 
            : "relative w-full h-full  grid-background"
      }>
        {images.map((image, index) => (
          <DraggableCard
            key={image.id}
            image={image}
            index={index}
            onDescriptionsUpdate={onDescriptionsUpdate}
            onDelete={onDelete}
            onTrash={onTrash}
            onUnTrash={onUnTrash}
            draggable={!isSuggestedOrderBin} 
          />
        ))}
      </div>

      {/* Empty state */}
      {images.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center text-grey-dark">
          <div className="text-center">
            {isSuggestedOrderBin ? (
              <p>No suggested order available</p>
            ) : (
              <p>No Data Stories</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Bin;
