// frontend/src/components/Bin.js

import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import axios from 'axios';
import DraggableCard from './DraggableCard';

function Bin({ id, images, updateImageData, onDescriptionsUpdate }) {
  const isBottomBin = id === 'bottom-bin';
  const binRef = useRef(null);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'image',

    // Called when an item is dropped
    drop: (item, monitor) => {
      // Get the current mouse position relative to the viewport
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }

      // Convert clientOffset to page-relative coordinates
      const dropX_page = clientOffset.x + window.pageXOffset;
      const dropY_page = clientOffset.y + window.pageYOffset;

      // Get the bounding rectangle of the drop target (bin)
      const dropTargetRect = binRef.current.getBoundingClientRect();

      // Calculate bin's position relative to the page
      const binPageLeft = dropTargetRect.left + window.pageXOffset;
      const binPageTop = dropTargetRect.top + window.pageYOffset;

      // Calculate the position within the bin by subtracting bin's page position and applying the drag offset
      let x_bin = dropX_page - binPageLeft - item.offsetX;
      let y_bin = dropY_page - binPageTop - item.offsetY;

      // Constrain the item to stay within the bin's boundaries
      x_bin = Math.max(0, Math.min(x_bin, dropTargetRect.width - 150)); // Assume card width is 150px
      y_bin = Math.max(0, Math.min(y_bin, dropTargetRect.height - 100)); // Assume card height is 100px

      // Compute newX and newY as page-relative positions
      const newX_page = x_bin + binPageLeft;
      const newY_page = y_bin + binPageTop;

      // oldX and oldY are already page-relative
      const oldX = item.oldX;
      const oldY = item.oldY;

      console.log(`Dropped ${item.id} from (${oldX}, ${oldY}) to (${newX_page}, ${newY_page})`);

      // Log the drag event with correct old and new positions
      axios.post(
        '/log_click',
        {
          objectClicked: item.id,
          time: new Date().toISOString(),
          mouseDownPosition: { x: oldX, y: oldY },
          mouseUpPosition: { x: newX_page, y: newY_page },
          interaction: 'drag', // Specify the interaction type
        },
        { withCredentials: true }
      )
        .then(() => console.log('Drag event logged'))
        .catch(err => console.error('Error logging drag event:', err));

      // Update the server with the new position (relative to the bin)
      updateImageData(item.id, { in_storyboard: isBottomBin, x: x_bin, y: y_bin });
    },

    // Collect properties to track hover and drop state
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  // Attach the drop target to the binRef
  drop(binRef);

  return (
    <div
      id={id}
      ref={binRef}
      className="bin"
      style={{ position: 'relative', width: '100%', height: '100%' }} // Ensure bin is positioned relative
    >
      {images.map((image) => (
        <DraggableCard
          key={image.id}
          image={image}
          onDescriptionsUpdate={onDescriptionsUpdate}
        />
      ))}
    </div>
  );
}

export default Bin;
