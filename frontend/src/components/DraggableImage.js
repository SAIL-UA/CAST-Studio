import React from 'react';
import { useDrag } from 'react-dnd';

function DraggableImage({ image }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'image',
    item: {
      id: image.id,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const style = image.in_storyboard
    ? {
        left: `${image.x}px`,
        top: `${image.y}px`,
        opacity: isDragging ? 0.5 : 1,
        position: 'absolute',
        width: '100px',
        cursor: 'move',
      }
    : {
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        width: '100px',
        margin: '5px',
        cursor: 'grab',
      };

  return (
    <img
      ref={drag}
      src={`/images/${image.filename}`}
      alt={image.id}
      className="draggable-image"
      style={style}
    />
  );
}

export default DraggableImage;
