// Bin component for drag and drop containers

import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { BinProps, DragItem } from '../types/types';
import DraggableCard from './DraggableCard';

function Bin({ id, images, updateImageData, onDescriptionsUpdate, onDelete, onTrash, onUnTrash, children }: BinProps) {
  const binRef = useRef<HTMLDivElement>(null);

  // React DnD hook for drop functionality
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['image', 'group'],
    drop: (item: DragItem, monitor) => {
      const clientOffset = monitor.getClientOffset();

      // Handle group drops - calculate and return new position for the group
      if (item.type === 'group') {
        if (!binRef.current || !clientOffset) return;
        
        const dropTargetRect = binRef.current.getBoundingClientRect();
        // Account for scroll position within the bin
        const scrollLeft = binRef.current.scrollLeft;
        const scrollTop = binRef.current.scrollTop;

        let x_bin = clientOffset.x - dropTargetRect.left - item.offsetX + scrollLeft;
        let y_bin = clientOffset.y - dropTargetRect.top - item.offsetY + scrollTop;

        // Constrain position within bin content boundaries for groups
        // The content area is 200dvw x 200dvh, but we'll use a reasonable max
        const groupWidth = 320; // GroupDiv width
        const groupHeight = 256; // GroupDiv height
        const contentWidth = binRef.current.scrollWidth;
        const contentHeight = binRef.current.scrollHeight;
        x_bin = Math.max(0, Math.min(x_bin, contentWidth - groupWidth));
        y_bin = Math.max(0, Math.min(y_bin, contentHeight - groupHeight));

        console.log(`Group ${item.id} dropped on ${id} at (${x_bin}, ${y_bin})`);
        
        // Return the calculated position so the drag end handler can use it
        return { x: x_bin, y: y_bin };
      }
      if (!clientOffset || !binRef.current) return;

      const dropTargetRect = binRef.current.getBoundingClientRect();
      // Account for scroll position within the bin
      const scrollLeft = binRef.current.scrollLeft;
      const scrollTop = binRef.current.scrollTop;

      let x_bin = clientOffset.x - dropTargetRect.left - item.offsetX + scrollLeft;
      let y_bin = clientOffset.y - dropTargetRect.top - item.offsetY + scrollTop;

      // Constrain position within bin content boundaries
      const contentWidth = binRef.current.scrollWidth;
      const contentHeight = binRef.current.scrollHeight;
      x_bin = Math.max(0, Math.min(x_bin, contentWidth - 150)); // Card width
      y_bin = Math.max(0, Math.min(y_bin, contentHeight - 100)); // Card height

      console.log(`Dropped ${item.id} into ${id} at (${x_bin}, ${y_bin})`);

      // Update the card's position - keep in_storyboard=true for story-bin
      updateImageData(item.id, {
        in_storyboard: id === 'story-bin' ? true : id === 'storyboard-bin',
        x: x_bin,
        y: y_bin,
      });

      // Note: Removed logging functionality as requested
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [id, updateImageData]);

  // Combine refs for drop functionality
  const dropRef = (element: HTMLDivElement | null) => {
    if (element) {
      drop(element);
      binRef.current = element;
    }
  };

  // Dynamic styling based on drop state
  const getBinClasses = () => {
    const baseClasses = "absolute inset-0 w-full h-full overflow-auto rounded-sm transition-colors duration-200 grid-background border border-dashed";
    
    if (isOver && canDrop) {
      return `${baseClasses} bg-blue-50 border-blue-400`;
    } else if (canDrop) {
      return `${baseClasses} bg-grey-lightest border-grey-lightest`;
    } else {
      return `${baseClasses} bg-white border-grey-lightest`;
    }
  };

  return (
    <div
      id={id}
      ref={dropRef}
      className={getBinClasses()}
    >
      {/* Drop zone indicator */}
      {isOver && canDrop && (
        <div className="absolute flex items-center justify-center bg-blue-100 bg-opacity-75 rounded-lg border-2 border-dashed border-blue-400 z-[50] w-[200dvw] h-[200dvh]">
          <div className="text-blue-600 text-lg font-semibold">
            Drop image here
          </div>
        </div>
      )}

      {/* Bin content */}
      <div className={
          "flex flex-wrap gap-2 p-2 w-[200dvw] h-[200dvh] grid-background relative"
      }>
        {images.map((image) => (
          <DraggableCard
            key={image.id}
            image={image}
            index={image.index}
            onDescriptionsUpdate={onDescriptionsUpdate}
            onDelete={onDelete}
            onTrash={onTrash}
            onUnTrash={onUnTrash}
            draggable={true} 
          />
        ))}
        {/* Render children (groups and scaffolds) inside the scrollable container */}
        {children}
      </div>

      {/* Empty state */}
      {images.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center text-grey-dark">
          <div className="text-center">
            <p>Drag and drop images here</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bin;
