// DraggableCard component for drag and drop functionality -> cursor generated based off the previous draggable card

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useDrag } from 'react-dnd';
import { DraggableCardProps, DragItem, ImageData, ImageMetadata } from '../types/types';
import { updateImageData, generateDescription, deleteFigure, getImageData } from '../services/api';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';
import { logAction, captureActionContext } from '../utils/userActionLogger';
import { formatImageMetadata, getImageUrl } from '../utils/imageUtils';
import { useAuth } from '../contexts/Auth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

const OLD_SHORT_DESC_PLACEHOLDER = 'Add a description for this visual.';
const OLD_LONG_DESC_PLACEHOLDER = 'Ask AI to create a description for this visual.';

function getTitle(shortDesc: string | undefined, index: number): string {
  if (!shortDesc || shortDesc === OLD_SHORT_DESC_PLACEHOLDER) return `Visual ${index + 1}`;
  return shortDesc;
}

function getDesc(longDesc: string | undefined): string {
  if (!longDesc || longDesc === OLD_LONG_DESC_PLACEHOLDER) return '';
  return longDesc;
}

function DraggableCard({ image, index, onDescriptionsUpdate, onDelete, onTrash, onUnTrash, draggable = true, readOnly: readOnlyProp = false }: DraggableCardProps) {
  const { isInstructor } = useAuth();
  const { annotateWithAI } = useFeatureFlags();
  // Instructor notes are read-only for non-admin users
  const isInstructorNote = image.source === 'instructor';
  const readOnly = readOnlyProp || (isInstructorNote && !isInstructor);

  const [showModal, setShowModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(getTitle(image.short_desc, index));
  const [editingDesc, setEditingDesc] = useState(false);
  const [tempLongDesc, setTempLongDesc] = useState(getDesc(image.long_desc));
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
    const imageUrl = image.url || getImageUrl(image.filepath);
    setImageUrl(imageUrl);
    loadMetadata();

    return () => {
      isMountedRef.current = false;
    };
  }, [image.filepath]);

  // Sync tempTitle when image prop changes (but not while editing)
  useEffect(() => {
    if (!editingTitle) {
      setTempTitle(getTitle(image.short_desc, index));
    }
  }, [image.short_desc, editingTitle, index]);


  // Sync tempLongDesc when image prop changes (e.g. after AI generates description and parent refetches)
  useEffect(() => {
    setTempLongDesc(getDesc(image.long_desc));
  }, [image.long_desc]);

  // React DnD hook for drag functionality
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: isInstructorNote ? 'instructor_note' : 'image',
      canDrag: draggable && !(isInstructorNote && !isInstructor),
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
    const isInGroup = !!image.groupId;

    const baseStyle: React.CSSProperties = draggable
        ? isInGroup
          ? {
              opacity: isDragging ? 0.5 : 1,
              position: 'relative',
              cursor: 'move',
              zIndex: 300,
            }
          : {
              left: `${image.x}px`,
              top: `${image.y}px`,
              opacity: isDragging ? 0.5 : 1,
              position: 'absolute',
              cursor: 'move',
              zIndex: 300,
            }
        : {
            opacity: isDragging ? 0.5 : 1,
            position: 'relative',
            margin: '5px',
            cursor: 'default',
            zIndex: 300,
          }
    return baseStyle;
  };

  const handleShow = async (e: React.MouseEvent) => {
    logAction(e, { image_metadata: imageMetadataRef.current });

    try {
      // Fetch the latest data for this image from the backend
      const imagesFromApi = await getImageData(image.id);
      const latest = Array.isArray(imagesFromApi) && imagesFromApi.length > 0
        ? imagesFromApi[0]
        : imagesFromApi;

      if (latest) {
        setTempTitle(getTitle(latest.short_desc, index));
        setTempLongDesc(getDesc(latest.long_desc));

        onDescriptionsUpdate(
          latest.id,
          latest.short_desc || '',
          latest.long_desc || ''
        );
      } else {
        setTempTitle(getTitle(image.short_desc, index));
        setTempLongDesc(getDesc(image.long_desc));
      }
    } catch (err) {
      console.error('Error fetching latest image data for modal:', err);
      setTempTitle(getTitle(image.short_desc, index));
      setTempLongDesc(getDesc(image.long_desc));
    }

    setShowModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleClose = async (e: React.MouseEvent) => {
    const ctx = captureActionContext(e);
    if (image.short_desc === tempTitle && image.long_desc === tempLongDesc) {
      logAction(ctx, { image_metadata: imageMetadataRef.current });
      setShowModal(false);
      document.body.style.overflow = 'auto';
      return;
    }

    // Optimistic UI update first
    onDescriptionsUpdate(image.id, tempTitle, tempLongDesc);

    updateImageData(image.id, {
      short_desc: tempTitle,
      long_desc: tempLongDesc,
    }).then(() => {
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
      const res = await deleteFigure(image.filepath || image.id);
      if (res.status === 'success') {
        if (onDelete) {
          await onDelete(image.id);
        }
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
                // Log the completion with updated metadata, and update the ref
                const updatedImageMetadata = await formatImageMetadata(updatedImage);
                logAction({ actionType: 'click', elementId: 'description-generated' }, {
                  imageId: image.id,
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

  const handleTitleSave = async (e: React.FocusEvent | React.KeyboardEvent) => {
    setEditingTitle(false);

    if (tempTitle === image.short_desc) {
      return;
    }

    logAction({ actionType: 'click', elementId: 'visual-inline-title-save' }, { imageId: image.id });

    // Optimistic UI update first, then persist to backend
    onDescriptionsUpdate(image.id, tempTitle, image.long_desc || '');
    await updateImageData(image.id, { short_desc: tempTitle });
  };

  const handleDescSave = async (e: React.FocusEvent | React.KeyboardEvent) => {
    setEditingDesc(false);

    if (tempLongDesc === image.long_desc) {
      return;
    }

    logAction({ actionType: 'click', elementId: 'visual-inline-desc-save' }, { imageId: image.id });

    // Optimistic UI update first, then persist to backend
    onDescriptionsUpdate(image.id, image.short_desc || '', tempLongDesc);
    await updateImageData(image.id, { long_desc: tempLongDesc });
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
          className={`card-width overflow-hidden rounded-lg shadow-md border border-grey-lightest ${
            image.source === 'instructor' ? 'bg-rose-50' : image.filepath ? 'bg-grey-lighter-2' : 'bg-amber-50'
          }`}
        >
          <div id="card-header" className={`flex p-1 text-tiny-bold ${
            image.source === 'instructor' ? 'bg-red-400' : image.filepath ? 'bg-bama-crimson' : 'bg-amber-400'
          }`}>
            <div id="card-header-left" className="flex items-center overflow-hidden" style={{ width: 'calc(100% - 1.5rem)' }}>
              {editingTitle ? (
                <input
                  log-id="visual-inline-title-input"
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTitleSave(e);
                    }
                  }}
                  className="text-white font-sans bg-transparent border-b border-white outline-none w-full"
                  style={{ fontSize: 'inherit' }}
                  placeholder="Add a title for this visual"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p
                  className={`text-white font-sans truncate ${readOnly ? '' : 'cursor-pointer hover:underline'}`}
                  onClick={(e) => {
                    if (readOnly) return;
                    e.stopPropagation();
                    setEditingTitle(true);
                  }}
                  title={tempTitle}
                >
                  {tempTitle}
                </p>
              )}
            </div>
            {!readOnly && (
              <div id="card-header-right" className="flex justify-end w-1/2">
                <button
                  log-id="edit-figure-button"
                  onClick={handleShow}
                  className="w-3.5 h-3.5 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white transition-all duration-200"
                  style={{ fontSize: '0.5rem' }}
                  title="Edit figure"
                >
                  ✎
                </button>
              </div>
            )}
          </div>
          {image.filepath && (
            <div id="card-body">
              <img
                src={imageUrl}
                alt={image.id}
                className="w-full image-height object-cover"
              />
            </div>
          )}
          
          <div id="card-footer"
          className="p-2">
            {editingDesc ? (
              <textarea
                log-id="card-inline-desc-input"
                value={tempLongDesc}
                onChange={(e) => setTempLongDesc(e.target.value)}
                onBlur={handleDescSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDescSave(e);
                  }
                }}
                className="text-somewhat-tiny text-grey-darkest w-full bg-transparent border-b border-grey-darkest outline-none resize-none"
                placeholder={image.filepath ? 'Click to add description' : 'Click to add text'}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                rows={4}
              />
            ) : (
              <p
                className={`text-somewhat-tiny text-grey-darkest overflow-hidden text-ellipsis ${isInstructorNote ? 'line-clamp-[10]' : 'line-clamp-4'} ${readOnly ? '' : 'cursor-pointer hover:underline'}`}
                onClick={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  setEditingDesc(true);
                }}
              >
                {getDesc(image.long_desc) || (image.filepath ? 'Click to add description' : 'Click to add text')}
              </p>
            )}
            {image.source === 'instructor' && (
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                <span className="inline-block text-somewhat-tiny font-medium text-white bg-red-400 rounded-full px-2 py-0.5">Instructor</span>
                {image.last_saved && (
                  <span className="text-gray-400 whitespace-nowrap" style={{ fontSize: '0.5rem' }}>
                    {new Date(image.last_saved).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for editing - rendered as portal to escape container constraints */}
      {showModal && ReactDOM.createPortal(
        
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
            <div className="rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#eaf1f7' }}>

              {/* Modal Header — title + action buttons on one line */}
              <div className="flex items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold truncate min-w-0" style={{ maxWidth: '250px' }} title={tempTitle}>{tempTitle}</h2>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isInstructorNote && (
                    image.in_storyboard ? (
                      <button log-id="move-figure-to-recycle-bin-button"
                        onClick={handleTrash}
                        className="bg-yellow-600 text-sm text-white rounded-full px-3 py-1 whitespace-nowrap hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                      >
                        Move to Recycle Bin
                      </button>
                    ) : (
                      <button log-id="restore-figure-to-storyboard-button"
                        onClick={handleUnTrash}
                        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 whitespace-nowrap hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                      >
                        Restore to Storyboard
                      </button>
                    )
                  )}
                  <button log-id="delete-figure-button"
                    onClick={handleDelete}
                    className="bg-red-700 text-sm text-white rounded-full px-3 py-1 whitespace-nowrap hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                  >
                    Permanently Delete
                  </button>
                  <button log-id="save-and-close-figure-button"
                    onClick={(e) => handleClose(e)}
                    className="text-sm text-white rounded-full px-3 py-1 whitespace-nowrap hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                    style={{ backgroundColor: '#348b94' }}
                  >
                    Save & Close
                  </button>
                </div>
              </div>

              {/* Image Display — only for visuals, not notes */}
              {image.filepath && (
                <div className="text-center mb-4">
                  <img
                    src={imageUrl}
                    alt={image.id}
                    className="w-4/5 h-auto mx-auto rounded-lg"
                  />
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold text-grey-darkest mb-2">
                    Title
                  </h4>
                  <input
                    id="titleInput"
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-grey-lightest rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: '#f4f7fa' }}
                    placeholder="Add a title for this visual"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-semibold text-grey-darkest">
                      {image.filepath ? 'Description' : 'Text'}
                    </h4>
                    {image.filepath && annotateWithAI && (
                      <button log-id="generate-description-button"
                        onClick={handleGenerateDescription}
                        disabled={loadingGenDesc}
                        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingGenDesc ? 'Generating...' : 'Generate Description'}
                      </button>
                    )}
                  </div>
                  {loadingGenDesc ? <GeneratingPlaceholder contentName="description" lines={5} /> : (
                  <textarea
                    id="longDesc"
                    rows={isInstructorNote ? 12 : 6}
                    value={tempLongDesc}
                    onChange={(e) => setTempLongDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-grey-lightest rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: '#f4f7fa' }}
                    placeholder={isInstructorNote ? "Type your feedback here." : "Click 'Generate Description' to create with AI, or type a description here."}
                  />
                  )}
                </div>
              </div>


            </div>
          </div>,
        document.body
      )}
    </>
  );
}

export default DraggableCard;
