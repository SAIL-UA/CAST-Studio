// frontend/src/components/DraggableCard.js

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useDrag } from 'react-dnd';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

function DraggableCard({ image, onDescriptionsUpdate }) {
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
   * Updated useDrag to provide page-relative oldX, oldY, and drag offsets.
   */
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'image',
      // Provide old coords as page-relative and drag offsets
      item: (monitor) => {
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const initialClientOffset = monitor.getInitialClientOffset();
          const initialPageOffset = {
            x: initialClientOffset.x + window.pageXOffset,
            y: initialClientOffset.y + window.pageYOffset,
          };
          const oldX = rect.left + window.pageXOffset;
          const oldY = rect.top + window.pageYOffset;
          const offsetX = initialPageOffset.x - oldX;
          const offsetY = initialPageOffset.y - oldY;
          console.log(`Dragging ${image.id} from (${oldX}, ${oldY}) with offset (${offsetX}, ${offsetY})`);
          return {
            id: image.id,
            oldX, // page-relative
            oldY, // page-relative
            offsetX, // distance from cursor to card's top-left
            offsetY,
          };
        }
        // Fallback in case ref is not available
        return {
          id: image.id,
          oldX: image.x, // May not be accurate
          oldY: image.y,
          offsetX: 0,
          offsetY: 0,
        };
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [image.id] // Removed image.x and image.y from dependencies
  );

  const style = image.in_storyboard
    ? {
        left: `${image.x}px`, // bin-relative
        top: `${image.y}px`,  // bin-relative
        opacity: isDragging ? 0.5 : 1,
        position: 'absolute',
        cursor: 'move',
      }
    : {
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        margin: '5px',
        cursor: 'grab',
      };

  return (
    <>
      <div ref={drag} style={style} onDoubleClick={handleShow}>
        <Card ref={cardRef} style={{ width: '150px', overflow: 'hidden' }}>
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
                WebkitBoxOrient: 'vertical',
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
          <Button className="btn save-close" variant="secondary" onClick={handleClose}>
            Save &amp; Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default DraggableCard;
