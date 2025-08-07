import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import DraggableCard from './DraggableCard';
import { logAction } from '../services/api';
import { getEasternISO } from '../utils/datetimeUtils';

function Bin({ id, images, updateImageData, onDescriptionsUpdate, onDelete, isSuggestedOrderBin = false }) {
  const binRef = useRef(null);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'image',
    drop: (item, monitor) => {
      if (isSuggestedOrderBin) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const dropTargetRect = binRef.current.getBoundingClientRect();
      const binPageLeft = dropTargetRect.left + window.pageXOffset;
      const binPageTop = dropTargetRect.top + window.pageYOffset;

      let x_bin = clientOffset.x + window.pageXOffset - binPageLeft - item.offsetX;
      let y_bin = clientOffset.y + window.pageYOffset - binPageTop - item.offsetY;

      x_bin = Math.max(0, Math.min(x_bin, dropTargetRect.width - 150)); // Card width
      y_bin = Math.max(0, Math.min(y_bin, dropTargetRect.height - 100)); // Card height


      // Update the card's position and bin status based on target bin ID
      updateImageData(item.id, {
        in_storyboard: id === 'bottom-bin',
        x: x_bin,
        y: y_bin,
      });



      // Log the drag event
      logAction({
          objectClicked: item.id,
          time: getEasternISO(),
          mouseDownPosition: { x: item.oldX, y: item.oldY },
          mouseUpPosition: { x: x_bin + binPageLeft, y: y_bin + binPageTop },
          interaction: 'drag',
        })
    },
    canDrop: () => !isSuggestedOrderBin,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [id, isSuggestedOrderBin, updateImageData]);

  drop(binRef);

  return (
    <div
      id={id}
      ref={binRef}
      className={`bin ${isSuggestedOrderBin ? 'suggested-order-bin' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%', border: '2px solid #ccc', padding: '10px', borderRadius: '5px' }}
    >
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
  );
}

export default Bin;
