// frontend/src/components/DraggableCard.js

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useDrag } from 'react-dnd';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

function DraggableCard({ image, onDescriptionsUpdate, onDelete, draggable = true }) {
  const [showModal, setShowModal] = useState(false);
  const [tempShortDesc, setTempShortDesc] = useState(image.short_desc || '');
  const [tempLongDesc, setTempLongDesc] = useState(image.long_desc || '');
  const [loadingGenDesc, setLoadingGenDesc] = useState(false);
  const cardRef = useRef(null); // Ref to access the card's DOM element

  const handleShow = () => {
    setShowModal(true);
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
      })
      .catch((error) => {
        console.error('Error updating descriptions:', error);
        setShowModal(false);
      });
  };

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
        // Call the onDelete callback (pass the deleted image id if desired)
        if (onDelete) onDelete(image.id);
        setShowModal(false);
      } else {
        alert(res.data.message || 'Error deleting figure');
      }
    } catch (err) {
      console.error('Error deleting figure:', err);
      alert('An error occurred while deleting the figure');
    }
  };

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
  };

  /**
   * If the card is draggable, set up the useDrag hook.
   * Otherwise, render a static card.
   */
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'image', // Define the drag type
      canDrag: draggable, // Control whether the card is draggable
      item: () => {
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const initialMousePosition = {
            x: window.event.clientX,
            y: window.event.clientY,
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
  
        // Fallback if cardRef is unavailable
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
  
  

  const style = draggable
  ? image.in_storyboard
    ? {
        left: `${image.x}px`, // bin-relative
        top: `${image.y}px`,  // bin-relative
        opacity: isDragging ? 0.5 : 1,
        position: 'absolute',
        cursor: 'move',
        border: image.long_desc?.trim() ? '1px solid #ccc' : '2px solid red', // Red border if long_desc is blank
      }
    : {
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        margin: '5px',
        cursor: 'grab',
        border: image.long_desc?.trim() ? '1px solid #ccc' : '2px solid red', // Red border if long_desc is blank
      }
  : {
      opacity: 1,
      position: 'relative',
      margin: '5px',
      cursor: 'default',
      border: image.long_desc?.trim() ? '1px solid #ccc' : '2px solid red', // Red border if long_desc is blank
    };


  return (
    <>
      <div
        ref={draggable ? drag : null}
        style={{
          // Use your computed position/opacity styles here if needed.
          // For example, if the card is in the storyboard:
          ...(image.in_storyboard
            ? {
                left: `${image.x}px`,
                top: `${image.y}px`,
                opacity: isDragging ? 0.5 : 1,
                position: 'absolute',
                cursor: 'move'
              }
            : {
                opacity: isDragging ? 0.5 : 1,
                position: 'relative',
                margin: '5px',
                cursor: 'grab'
              })
        }}
        onDoubleClick={handleShow}
      >
        <Card
          ref={cardRef}
          style={{
            width: '150px',
            overflow: 'hidden',
            // Apply the border directly to the Card.
            border: image.long_desc?.trim() ? '1px solid #ccc' : '2px solid red'
          }}
        >
          <Card.Img
            variant="top"
            src={`/images/${image.filename}`}
            alt={image.id}
            style={{ height: '100px', objectFit: 'cover' }}
          />
          <Card.Body style={{ padding: '0.5rem' }}>
            <Card.Text
              style={{
                fontSize: '0.8rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {image.short_desc}
            </Card.Text>
          </Card.Body>
        </Card>
      </div>
  
      <Modal show={showModal} onHide={handleClose} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editing: {image.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img
              src={`/images/${image.filename}`}
              alt={image.id}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
  
          <Form>
            <Form.Group controlId="shortDesc">
              <Form.Label>Short Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={tempShortDesc}
                onChange={(e) => setTempShortDesc(e.target.value)}
              />
            </Form.Group>
  
            <Form.Group controlId="longDesc" className="mt-3">
              <Form.Label>Long Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={tempLongDesc}
                onChange={(e) => setTempLongDesc(e.target.value)}
              />
            </Form.Group>
          </Form>
  
          <div className="mt-3 text-center">
            <Button
              variant="primary"
              className="btn generate-desc"
              onClick={handleGenerateDescription}
              disabled={loadingGenDesc}
            >
              {loadingGenDesc ? 'Generating...' : 'Generate Description'}
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={handleDelete}>
            Delete Figure
          </Button>
          <Button className="btn save-close" variant="secondary" onClick={handleClose}>
            Save &amp; Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );    
}

export default DraggableCard;