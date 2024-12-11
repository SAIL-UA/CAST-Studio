import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import DraggableImage from './DraggableImage';

function Bin({ id, images, updateImageData }) {
  const isBottomBin = id === 'bottom-bin';
  const binRef = useRef(null);

  const [, drop] = useDrop({
    accept: 'image',
    drop: (item, monitor) => {
      const inStoryboard = isBottomBin;
      let x = 0;
      let y = 0;

      if (isBottomBin) {
        const clientOffset = monitor.getClientOffset();
        const dropTargetRect = binRef.current.getBoundingClientRect();

        x = clientOffset.x - dropTargetRect.left - 50; // Adjust for image width
        y = clientOffset.y - dropTargetRect.top - 50;  // Adjust for image height

        x = Math.max(0, Math.min(x, dropTargetRect.width - 100));
        y = Math.max(0, Math.min(y, dropTargetRect.height - 100));
      }

      updateImageData(item.id, { in_storyboard: inStoryboard, x, y });
    },
  });

  drop(binRef);

  return (
    <div id={id} ref={binRef} className="bin">
      {images.map((image) => (
        <DraggableImage key={image.id} image={image} />
      ))}
    </div>
  );
}

export default Bin;
