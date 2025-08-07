// Bin component for drag and drop containers

import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { BinProps, DragItem } from '../types/types';
import DraggableCard from './DraggableCard';

function Bin({ id, images, updateImageData, onDescriptionsUpdate, onDelete, isSuggestedOrderBin = false }: BinProps) {
  const binRef = useRef<HTMLDivElement>(null);

  // React DnD hook for drop functionality
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'image',
    drop: (item: DragItem, monitor) => {
      if (isSuggestedOrderBin) return;

      const clientOffset = monitor.getClientOffset();
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
    let baseClasses = "relative w-full h-full border-2 p-3 rounded-lg transition-colors duration-200";
    
    if (isSuggestedOrderBin) {
      baseClasses += " bg-gray-50 border-gray-300";
    } else if (isOver && canDrop) {
      baseClasses += " bg-blue-50 border-blue-400 border-dashed";
    } else if (canDrop) {
      baseClasses += " bg-gray-100 border-gray-400 border-dashed";
    } else {
      baseClasses += " bg-white border-gray-300";
    }
    
    return baseClasses;
  };

  return (
    <div
      id={id}
      ref={dropRef}
      className={getBinClasses()}
      style={{ 
        minHeight: '200px',
        maxHeight: '500px',
        overflowY: 'auto'
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
          ? "flex flex-wrap gap-2" 
          : id === 'story-bin' 
            ? "flex flex-wrap gap-2 p-2" 
            : "relative w-full h-full"
      }>
        {images.map((image) => (
          <DraggableCard
            key={image.id}
            image={image}
            onDescriptionsUpdate={onDescriptionsUpdate}
            onDelete={onDelete}
            draggable={!isSuggestedOrderBin} 
          />
        ))}
      </div>

      {/* Empty state */}
      {images.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            {isSuggestedOrderBin ? (
              <p>No suggested order available</p>
            ) : (
              <p>Drag images here</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Bin;
