// DraggableCard component for drag and drop functionality -> cursor generated based off the previous draggable card

import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { DraggableCardProps, DragItem } from '../types/types';
import { updateImageData, generateDescription, deleteFigure, serveImage, getImageData } from '../services/api';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';

function DraggableCard({ image, index, onDescriptionsUpdate, onDelete, onTrash, onUnTrash, draggable = true }: DraggableCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [tempShortDesc, setTempShortDesc] = useState(image.short_desc || '');
  const [tempLongDesc, setTempLongDesc] = useState(image.long_desc || '');
  const [loadingGenDesc, setLoadingGenDesc] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);


  useEffect(() => {
    const fetchImageBlob = async () => {
      try {
        const blobUrl = await serveImage(image.filepath);
        if (isMountedRef.current) setImageUrl(blobUrl);
      } catch (err) {
        console.error('Failed to fetch image blob:', err);
      }
    };
    fetchImageBlob();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [image.filepath]);


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
    updateImageData(image.id, {
      short_desc: tempShortDesc,
      long_desc: tempLongDesc,
    })
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

const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this figure?')) {
      return;
    }

    try {
      const res = await deleteFigure(image.filepath);
      if (res.status === 'success') {
        if (onDelete) onDelete(image.id);
        setShowModal(false);
        document.body.style.overflow = 'auto';
      } else {
        alert(res.message || 'Error deleting figure');
      }
    } catch (err) {
      console.error('Error deleting figure:', err);
      alert('An error occurred while deleting the figure');
    }
  };
  const handleGenerateDescription = async () => {
    setLoadingGenDesc(true);
    
    try {
      // Start the description generation task
      const res = await generateDescription(image.id);
      
      if (res.message === 'Began generating description for image.') {
        // Poll for completion by checking long_desc_generating status
        const pollForCompletion = async () => {
          const maxAttempts = 60; // 5 minutes with 5-second intervals
          let attempts = 0;
          
          while (attempts < maxAttempts) {
            attempts++;
            console.log(`Polling description generation ${attempts}/${maxAttempts}`);
            
            try {
              // Get updated image data from backend
              const imageResponse = await getImageData(image.id);
              const updatedImage = imageResponse;
              
              // Check if generation is complete
              if (!updatedImage.long_desc_generating && updatedImage.long_desc) {
                // Description generation complete
                setTempLongDesc(updatedImage.long_desc);
                console.log('Description generated successfully');
                setLoadingGenDesc(false);
                return;
              }
            } catch (error) {
              console.error('Error polling for description completion:', error);
            }
            
            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          // Timeout reached
          console.error('Description generation timed out');
          alert('Description generation is taking longer than expected. Please try again.');
        };
        
        // Start polling (don't await to allow UI updates)
        pollForCompletion();
        
      } else {
        console.log('Error generating single description:', res.message);
        alert('Failed to start description generation. Please try again.');
      }
    } catch (err) {
      console.error('Error generating single description:', err);
      alert('An error occurred while generating the description. Please try again.');
    }
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
          className={`card-width overflow-hidden rounded-sm shadow-md bg-grey-lighter-2 border-bama-crimson border-1 ${
            image.long_desc?.trim() ? 'border border-grey-lightest' : 'border-2 border-red-500'
          }`}
        >
          <div id="card-header" className="flex p-1 bg-bama-crimson text-tiny-bold">
            <div id="card-header-left" className="flex justify-start w-1/2">
              <p className="text-white font-sans">
                Visual {index + 1}
              </p>
            </div>
            <div id="card-header-right" className="flex justify-end w-1/2">
              <button className="border-b border-white border-1 text-white font-roboto-medium hover:font-roboto-bold"
              onClick={handleShow}>
                <p>
                  Edit
                </p>
              </button>
            </div>
          </div>
          <div id="card-body">
            <img
              src={imageUrl}
              alt={image.id}
              className="w-full image-height object-cover"
            />
          </div>
          
          <div id="card-footer" 
          className="p-2">
            <p className="text-somewhat-tiny text-grey-darkest overflow-hidden text-ellipsis line-clamp-4">
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
                  src={imageUrl}
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
                  {loadingGenDesc ? <GeneratingPlaceholder contentName="description" lines={5} /> : (
                  <textarea
                    id="longDesc"
                    rows={5}
                    value={tempLongDesc}
                    onChange={(e) => setTempLongDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-grey-lightest rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  )}
                </div>
              </div>

              {/* Generate Description Button */}
              <div className="mt-4 text-center">
                <button
                  onClick={handleGenerateDescription}
                  disabled={loadingGenDesc}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingGenDesc ? 'Generating...' : 'Generate Description'}
                </button>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between mt-6">
                {image.in_storyboard ? (
                <button
                  onClick={handleTrash}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Move to Recycle Bin
                </button>) : (<button
                  onClick={handleUnTrash}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restore to Workspace
                </button>)}
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Permanently Delete
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
