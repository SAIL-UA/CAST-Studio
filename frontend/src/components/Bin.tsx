// Bin component for drag and drop containers

import React, { useRef, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { BinProps, DragItem } from '../types/types';
import DraggableCard from './DraggableCard';

function Bin({ id, images, updateImageData, onDescriptionsUpdate, onDelete, onTrash, onUnTrash, zoomLevel = 1, panOffset = { x: 0, y: 0 }, onPanOffsetChange, onZoomLevelChange, scrollable = false, children}: BinProps) {
  const binRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Pan refs (not state — state is lifted to parent)
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });

  // Stable ref for panOffset so drop handler always sees latest value
  const panOffsetRef = useRef(panOffset);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  // React DnD hook for drop functionality
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['image', 'group'],
    drop: (item: DragItem, monitor) => {
      // If a nested drop target (e.g. GroupDiv) already handled this drop, don't process it again
      if (monitor.didDrop()) return;

      const clientOffset = monitor.getClientOffset();
      const pan = panOffsetRef.current;

      // Handle group drops - calculate and return new position for the group
      if (item.type === 'group') {
        if (!binRef.current || !clientOffset) return;

        const dropTargetRect = binRef.current.getBoundingClientRect();

        let x_bin = (clientOffset.x - dropTargetRect.left - pan.x) / zoomLevel - item.offsetX;
        let y_bin = (clientOffset.y - dropTargetRect.top - pan.y) / zoomLevel - item.offsetY;

        x_bin = Math.max(0, x_bin);
        y_bin = Math.max(0, y_bin);

        console.log(`Group ${item.id} dropped on ${id} at (${x_bin}, ${y_bin})`);
        return { x: x_bin, y: y_bin };
      }
      if (!clientOffset || !binRef.current) return;

      const dropTargetRect = binRef.current.getBoundingClientRect();

      let x_bin = (clientOffset.x - dropTargetRect.left - pan.x) / zoomLevel - item.offsetX;
      let y_bin = (clientOffset.y - dropTargetRect.top - pan.y) / zoomLevel - item.offsetY;

      x_bin = Math.max(0, x_bin);
      y_bin = Math.max(0, y_bin);

      console.log(`Dropped ${item.id} into ${id} at (${x_bin}, ${y_bin})`);

      updateImageData(item.id, {
        in_storyboard: id === 'story-bin' ? true : id === 'storyboard-bin',
        x: x_bin,
        y: y_bin,
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [id, updateImageData, zoomLevel]);

  // Clamp pan offset so content can't be dragged off-screen
  const clampPan = useCallback((pan: { x: number; y: number }) => {
    if (!binRef.current) return pan;
    const vw = binRef.current.clientWidth;
    const vh = binRef.current.clientHeight;
    return {
      x: Math.min(vw * 0.5, Math.max(-vw * 3, pan.x)),
      y: Math.min(vh * 0.5, Math.max(-vh * 3, pan.y)),
    };
  }, []);

  // Pan handlers - right-click drag to pan
  const handleContentMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== contentRef.current) return;
    if (e.button !== 2) return; // Only right mouse button

    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOffsetStart.current = { ...panOffset };
    e.preventDefault();
  }, [panOffset]);

  // Prevent context menu on right-click within the bin
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Zoom with mouse wheel — attached as non-passive listener to allow preventDefault
  const zoomLevelRef = useRef(zoomLevel);
  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);

  useEffect(() => {
    const el = binRef.current;
    if (!el || !onZoomLevelChange) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentZoom = zoomLevelRef.current;
      const currentPan = panOffsetRef.current;
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(1.2, Math.max(0.1, currentZoom + delta));

      // Zoom toward the cursor position
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // Adjust pan so the point under the cursor stays fixed
      const scale = newZoom / currentZoom;
      const newPanX = cursorX - scale * (cursorX - currentPan.x);
      const newPanY = cursorY - scale * (cursorY - currentPan.y);

      onZoomLevelChange(newZoom);
      onPanOffsetChange?.(clampPan({ x: newPanX, y: newPanY }));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onZoomLevelChange, onPanOffsetChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const raw = {
        x: panOffsetStart.current.x + dx,
        y: panOffsetStart.current.y + dy,
      };
      onPanOffsetChange?.(clampPan(raw));
    };

    const handleMouseUp = () => {
      isPanning.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onPanOffsetChange]);

  // Combine refs for drop functionality
  const dropRef = (element: HTMLDivElement | null) => {
    if (element) {
      drop(element);
      binRef.current = element;
    }
  };

  // Dynamic styling based on drop state
  const getBinClasses = () => {
    const overflowClass = scrollable ? "overflow-auto" : "overflow-hidden";
    const baseClasses = `absolute inset-0 w-full h-full ${overflowClass} rounded-sm transition-colors duration-200 grid-background border border-dashed`;

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
      onContextMenu={handleContextMenu}
    >
      {/* Drop zone indicator */}
      {isOver && canDrop && (
        <div className="absolute flex items-center justify-center bg-blue-100 bg-opacity-75 rounded-lg border-2 border-dashed border-blue-400 z-[50] w-full h-full pointer-events-none">
          <div className="text-blue-600 text-lg font-semibold">
            Drop image here
          </div>
        </div>
      )}

      {/* Bin content - pannable and zoomable (no background — grid stays on outer div) */}
      <div
        ref={contentRef}
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
          width: 20000,
          height: 20000,
          cursor: isPanning.current ? 'grabbing' : 'default',
        }}
        onMouseDown={handleContentMouseDown}
      >
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
        {children}
      </div>

    </div>
  );
}

export default Bin;
