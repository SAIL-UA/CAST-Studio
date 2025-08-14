// DraggableCard component for drag and drop functionality -> cursor generated based off the previous draggable card

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useDrag } from 'react-dnd';
import { DraggableCardProps, DragItem } from '../types/types';

function DraggableCard({ image, onDescriptionsUpdate, onDelete, onTrash, onUnTrash, draggable = true }: DraggableCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [tempShortDesc, setTempShortDesc] = useState(image.short_desc || '');
  const [tempLongDesc, setTempLongDesc] = useState(image.long_desc || '');
  const [loadingGenDesc, setLoadingGenDesc] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // React DnD hook for drag functionality
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'image',
      canDrag: draggable,
      item: (): DragItem => {
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const event = window.event as MouseEvent;
          const initialMousePosition = {
            x: event.clientX,
            y: event.clientY,
          };
          const offsetX = initialMousePosition.x - rect.left;
          const offsetY = initialMousePosition.y - rect.top;
          const oldX = rect.left + window.pageXOffset;
          const oldY = rect.top + window.pageYOffset;
          return {
            id: image.id,
            oldX,
            oldY,
            offsetX,
            offsetY,
          };
        }
        return {
          id: image.id,
          oldX: image.x || 0,
          oldY: image.y || 0,
          offsetX: 0,
          offsetY: 0,
        };
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [draggable, image.id]
  );

  // Calculate card styling based on state
  const getCardStyle = (): React.CSSProperties => {

    // Base style
    const baseStyle: React.CSSProperties = draggable
        ? {
            left: `${image.x}px`,
            top: `${image.y}px`,
            opacity: isDragging ? 0.5 : 1,
            position: 'absolute',
            cursor: 'move',
          }
        : {
            opacity: isDragging ? 0.5 : 1,
            position: 'relative',
            margin: '5px',
            cursor: 'grab',
          }
    return baseStyle;
  };

  const handleShow = () => {
    setShowModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleClose = () => {
    axios
      .post(
        '/update_image_data',
        {
          id: image.id,
          short_desc: tempShortDesc,
          long_desc: tempLongDesc,
        },
        { withCredentials: true }
      )
      .then(() => {
        onDescriptionsUpdate(image.id, tempShortDesc, tempLongDesc);
        setShowModal(false);
        document.body.style.overflow = 'auto';
      })
      .catch((error) => {
        console.error('Error updating descriptions:', error);
        setShowModal(false);
        document.body.style.overflow = 'auto';
      });
  };
/**
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this figure?')) {
      return;
    }

    try {
      const res = await axios.post(
        '/delete_figure',
        { filename: image.filename },
        { withCredentials: true }
      );
      if (res.data.status === 'success') {
        if (onDelete) onDelete(image.id);
        setShowModal(false);
        document.body.style.overflow = 'auto';
      } else {
        alert(res.data.message || 'Error deleting figure');
      }
    } catch (err) {
      console.error('Error deleting figure:', err);
      alert('An error occurred while deleting the figure');
    }
  };
*/
  const handleGenerateDescription = () => {
    setLoadingGenDesc(true);
    axios
      .post(
        '/generate_long_description_for_image',
        { id: image.id },
        { withCredentials: true }
      )
      .then((res) => {
        if (res.data.status === 'success') {
          setTempLongDesc(res.data.long_desc);
        } else {
          console.log('Error generating single description:', res.data.message);
        }
      })
      .catch((err) => {
        console.error('Error generating single description:', err);
      })
      .finally(() => {
        setLoadingGenDesc(false);
      });
    handleClose();
  };

  const handleTrash = () => {
    if (onTrash) onTrash(image.id);
    handleClose();
  };

  const handleUnTrash = () => {
    if (onUnTrash) onUnTrash(image.id);
    handleClose();
  };

  // Combine refs for draggable functionality
  const dragRef = (element: HTMLDivElement | null) => {
    if (draggable && element) {
      drag(element);
    }
  };

  return (
    <>
      {/* Draggable Card */}
      <div
        ref={draggable ? dragRef : undefined}
        style={getCardStyle()}
      >
        <div id="card-container"
          ref={cardRef}
          className={`w-36 overflow-hidden rounded-sm shadow-md bg-grey-lighter-2 border-bama-crimson border-1 ${
            image.long_desc?.trim() ? 'border border-grey-lightest' : 'border-2 border-red-500'
          }`}
        >
          <div id="card-header" className="flex p-2 bg-bama-crimson">
            <div id="card-header-left" className="flex justify-start w-1/2">
              <p className="text-xs text-white font-roboto-medium">
                Visual {(image.id).charAt(image.id.length - 1)}
              </p>
            </div>
            <div id="card-header-right" className="flex justify-end w-1/2">
              <button className="border-b border-white border-1 text-xs text-white font-roboto-medium hover:font-roboto-bold"
              onClick={handleShow}>
                <p>
                  Edit
                </p>
              </button>
            </div>
          </div>
          <div id="card-body">
            <img
              src={`/images/${image.filename}`}
              alt={image.id}
              className="w-full h-24 object-cover"
            />
          </div>
          
          <div id="card-footer" 
          className="p-2">
            <p className="text-xs text-grey-darkest overflow-hidden text-ellipsis line-clamp-4">
              {image.short_desc}
            </p>
          </div>
        </div>
      </div>

      {/* Modal for editing */}
      {showModal && (
        <>
          <div id="modal-backdrop"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto"></div>

          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Editing: {image.id}</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    document.body.style.overflow = 'auto';
                  }}
                  className="text-grey-darkest hover:text-grey-darkest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Image Display */}
              <div className="text-center mb-4">
                <img
                  src={`/images/${image.filename}`}
                  alt={image.id}
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="shortDesc" className="block text-sm font-medium text-grey-darkest mb-2">
                    Short Description
                  </label>
                  <textarea
                    id="shortDesc"
                    rows={2}
                    value={tempShortDesc}
                    onChange={(e) => setTempShortDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-grey-lightest rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="longDesc" className="block text-sm font-medium text-grey-darkest mb-2">
                    Long Description
                  </label>
                  <textarea
                    id="longDesc"
                    rows={5}
                    value={tempLongDesc}
                    onChange={(e) => setTempLongDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-grey-lightest rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Generate Description Button */}
              <div className="mt-4 text-center">
                <button
                  onClick={handleGenerateDescription}
                  disabled={loadingGenDesc || true}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingGenDesc ? 'Generating...' : 'Generate Description'}
                </button>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={handleTrash}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trash Figure
                </button>
                <button
                  onClick={handleUnTrash}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  UnTrash Figure
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-grey-darkest text-white rounded-md hover:bg-grey-darkest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save &amp; Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default DraggableCard;
