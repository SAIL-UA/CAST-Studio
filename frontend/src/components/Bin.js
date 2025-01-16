import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import axios from 'axios';
import DraggableCard from './DraggableCard';

function Bin({ id, images, updateImageData, onDescriptionsUpdate, isSuggestedOrderBin = false }) {
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

      console.log(`Dropped ${item.id} into ${id} at (${x_bin}, ${y_bin})`);

      // Update the card's position and bin status based on target bin ID
      updateImageData(item.id, {
        in_storyboard: id === 'bottom-bin',
        x: x_bin,
        y: y_bin,
      });

      // Log the drag event
      axios.post(
        '/log_click',
        {
          objectClicked: item.id,
          time: new Date().toISOString(),
          mouseDownPosition: { x: item.oldX, y: item.oldY },
          mouseUpPosition: { x: x_bin + binPageLeft, y: y_bin + binPageTop },
          interaction: 'drag',
        },
        { withCredentials: true }
      )
        .then(() => console.log('Drag event logged'))
        .catch((err) => console.error('Error logging drag event:', err));
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
          draggable={!isSuggestedOrderBin} // Disable dragging in suggested order bin
        />
      ))}
    </div>
  );
}

export default Bin;
