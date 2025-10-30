// DraggableCard component for drag and drop functionality -> cursor generated based off the previous draggable card

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useDrag } from 'react-dnd';
import { DraggableCardProps, DragItem, ImageData, ImageMetadata } from '../types/types';
import { updateImageData, generateDescription, deleteFigure, getImageData } from '../services/api';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';
import { logAction, captureActionContext } from '../utils/userActionLogger';
import { formatImageMetadata, getImageUrl } from '../utils/imageUtils';

function DraggableCard({ image, index, onDescriptionsUpdate, onDelete, onTrash, onUnTrash, draggable = true }: DraggableCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [tempShortDesc, setTempShortDesc] = useState(image.short_desc || '');
  const [tempLongDesc, setTempLongDesc] = useState(image.long_desc || '');
  const [loadingGenDesc, setLoadingGenDesc] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  // Track initial and current image metadata for change detection
  const imageMetadataRef = useRef<ImageMetadata>(null);
  // Track drop result from react-dnd for logging
  const dropResultRef = useRef<any>(null);
  

  async function loadMetadata(currentImage: ImageData = image, metadata? : ImageMetadata) {
    if (!metadata) {
      metadata = await formatImageMetadata(currentImage);
    }
    imageMetadataRef.current = metadata;
  }

  useEffect(() => {
    // Use direct static URL for nginx serving
    const imageUrl = getImageUrl(image.filepath);
    setImageUrl(imageUrl);
    loadMetadata();

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
            groupId: image.groupId,
          };
        }
        return {
          id: image.id,
          oldX: image.x || 0,
          oldY: image.y || 0,
          offsetX: 0,
          offsetY: 0,
          groupId: image.groupId,
        };
      },
      end: (item, monitor) => {
        // Capture drop result for use in onDragEnd handler
        const dropResult = monitor.getDropResult();
        dropResultRef.current = dropResult;
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [draggable, image.id]
  );

  const handleDragEnd = async (e: React.DragEvent) => {
    const ctx = captureActionContext(e);
    const updatedImageMetadata = await formatImageMetadata(image);

    // Check if dropped into a group (from react-dnd drop result)
    const dropResult = dropResultRef.current;
    const stateInfo: any = {
      image_metadata: imageMetadataRef.current,
      updated_image_metadata: updatedImageMetadata
    };

    // If dropped into a group, include group info
    if (dropResult?.droppedInGroup) {
      stateInfo.group_metadata = dropResult.groupMetadata;
      stateInfo.previous_group_id = image.groupId || null;
    }

    logAction(ctx, stateInfo);
    imageMetadataRef.current = updatedImageMetadata;
    dropResultRef.current = null; // Clear for next drag
  };

  // Calculate card styling based on state
  const getCardStyle = (): React.CSSProperties => {
    // Check if we're in a group (CSS grid layout) - only groups should use relative positioning
    // Cards in the regular story bin should use absolute positioning for drag-and-drop
    const isInGroup = !!image.groupId;
    
    // Base style
    const baseStyle: React.CSSProperties = draggable
        ? isInGroup
          ? {
              opacity: isDragging ? 0.5 : 1,
              position: 'relative',
              cursor: 'move',
            }
          : {
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

  const handleShow = async (e: React.MouseEvent) => {
    logAction(e, { image_metadata: imageMetadataRef.current });
    setShowModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleClose = async (e: React.MouseEvent) => {
    const ctx = captureActionContext(e);
    if (image.short_desc === tempShortDesc && image.long_desc === tempLongDesc) {
      logAction(ctx, { image_metadata: imageMetadataRef.current });
      setShowModal(false);
      document.body.style.overflow = 'auto';
      return;
    }
    
    updateImageData(image.id, {
      ...image,
      short_desc: tempShortDesc,
      long_desc: tempLongDesc,
    }).then(() => {
      onDescriptionsUpdate(image.id, tempShortDesc, tempLongDesc);
      setShowModal(false);
      document.body.style.overflow = 'auto';
    }).catch((error) => {
      console.error('Error updating descriptions:', error);
      setShowModal(false);
      document.body.style.overflow = 'auto';
    });
  
    const updatedImageMetadata = await formatImageMetadata(image);
    logAction(ctx, {
      image_metadata: imageMetadataRef.current,
      updated_image_metadata: updatedImageMetadata
    });

    imageMetadataRef.current = updatedImageMetadata;
    
    
  };

  const handleDelete = async (e: React.MouseEvent) => {
    const ctx = captureActionContext(e);
    if (!window.confirm('Are you sure you want to delete this figure?')) {
      return;
    }
    logAction(ctx, { image_metadata: imageMetadataRef.current });
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

  const handleGenerateDescription = async (e: React.MouseEvent) => {
    setLoadingGenDesc(true);
    const ctx = captureActionContext(e);
    
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
            
            try {
              // Get updated image data from backend
              const imageResponse = await getImageData(image.id);
              const updatedImage = imageResponse;
              
              // Check if generation is complete
              if (!updatedImage.long_desc_generating && updatedImage.long_desc) {
                // Description generation complete
                setTempLongDesc(updatedImage.long_desc);
                setLoadingGenDesc(false);
                // Log the action with updated metadata, and update the ref
                const updatedImageMetadata = await formatImageMetadata(updatedImage);
                logAction(ctx, { 
                  image_metadata: imageMetadataRef.current,
                  updated_image_metadata: updatedImageMetadata
                });
                imageMetadataRef.current = updatedImageMetadata;
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

  const handleTrash = (e: React.MouseEvent) => {
    if (onTrash) onTrash(image.id);
    logAction(e, { image_metadata: imageMetadataRef.current });
    updateImageData(image.id, {
      ...image,
      in_storyboard: false
    });
    setShowModal(false);
    document.body.style.overflow = 'auto';
  };

  const handleUnTrash = (e: React.MouseEvent) => {
    if (onUnTrash) onUnTrash(image.id);
    logAction(e, { image_metadata: imageMetadataRef.current });
    updateImageData(image.id, {
      ...image,
      in_storyboard: true
    });
    setShowModal(false);
    document.body.style.overflow = 'auto';
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
          log-id={"draggable-card"}
          ref={cardRef}
          onDragEnd={handleDragEnd}
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
              <button
                log-id="edit-figure-button"
                onClick={handleShow}
                className="text-white font-roboto-medium hover:font-roboto-bold hover:underline transition-all duration-150"
              >
                Edit
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

      {/* Modal for editing - rendered as portal to escape container constraints */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Editing: {image.id}</h2>
                <button
                  log-id="close-figure-edit-modal-button"
                  onClick={(e) => {
                    logAction(e, { image_metadata: imageMetadataRef.current });
                    setShowModal(false);
                    document.body.style.overflow = 'auto';
                  }}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-all duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <button log-id="generate-description-button"
                  onClick={handleGenerateDescription}
                  disabled={loadingGenDesc}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                >
                  {loadingGenDesc ? 'Generating...' : 'Generate Description'}
                </button>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col min-lg:flex-row items-center justify-center min-lg:justify-between mt-6 gap-4">
                {/* Storyboard action button */}
                {image.in_storyboard ? (
                  <button log-id="move-figure-to-recycle-bin-button"
                    onClick={handleTrash}
                    className="w-full min-lg:w-1/3 px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-150"
                  >
                    Move to Recycle Bin
                  </button>
                ) : (
                  <button log-id="restore-figure-to-storyboard-button"
                    onClick={handleUnTrash}
                    className="w-full min-lg:w-1/3 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-150"
                  >
                    Restore to Storyboard
                  </button>
                )}
                
                {/* Delete button */}
                <button log-id="delete-figure-button"
                  onClick={handleDelete}
                  className="w-full min-lg:w-1/3 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-150"
                >
                  Permanently Delete
                </button>

                {/* Save & Close button */}
                <button log-id="save-and-close-figure-button"
                  onClick={(e) => handleClose(e)}
                  className="w-full min-lg:w-1/3 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>,
        document.body
      )}
    </>
  );
}

export default DraggableCard;
