// frontend/src/components/DraggableCard.js

import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { updateImageData, deleteFigure, generateLongDescriptionForImage, serveImage } from '../services/api';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

function DraggableCard({ image, onDescriptionsUpdate, onDelete, draggable = true }) {
  const [showModal, setShowModal] = useState(false);
  const [tempShortDesc, setTempShortDesc] = useState(image.short_desc || '');
  const [tempLongDesc, setTempLongDesc] = useState(image.long_desc || '');
  const [loadingGenDesc, setLoadingGenDesc] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const cardRef = useRef(null);

  // Fetch and resolve image blob URL
  useEffect(() => {
    const fetchImageBlob = async () => {
      try {
        const blobUrl = await serveImage(image.filepath);
        setImageUrl(blobUrl);
      } catch (err) {
        console.error('Failed to fetch image blob:', err);
      }
    };
    fetchImageBlob();
  }, [image.filepath]);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'image',
      canDrag: draggable,
      item: () => {
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const initialMousePosition = {
            x: window.event?.clientX || 0,
            y: window.event?.clientY || 0,
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

  const cardStyle = draggable
    ? image.in_storyboard
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
    : {
        opacity: 1,
        position: 'relative',
        margin: '5px',
        cursor: 'default',
      };

  const handleShow = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    updateImageData(image.id, {
      short_desc: tempShortDesc,
      long_desc: tempLongDesc,
    })
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
      const res = await deleteFigure(image.filepath);
      if (res.status === 'success') {
        if (onDelete) onDelete(image.id);
        setShowModal(false);
      } else {
        alert(res.message || 'Error deleting figure');
      }
    } catch (err) {
      console.error('Error deleting figure:', err);
      alert('An error occurred while deleting the figure');
    }
  };

  const handleGenerateDescription = () => {
    setLoadingGenDesc(true);
    generateLongDescriptionForImage(image.id)
      .then((res) => {
        if (res.status === 'success') {
          setTempLongDesc(res.long_desc);
        } else {
          console.log('Error generating single description:', res.message);
        }
      })
      .catch((err) => {
        console.error('Error generating single description:', err);
      })
      .finally(() => {
        setLoadingGenDesc(false);
      });
  };

  return (
    <>
      <div
        ref={draggable ? drag : null}
        style={cardStyle}
        onDoubleClick={handleShow}
      >
        <Card
          ref={cardRef}
          style={{
            width: '150px',
            overflow: 'hidden',
            border: image.long_desc?.trim() ? '1px solid #ccc' : '2px solid red',
          }}
        >
          <Card.Img
            variant="top"
            src={imageUrl || 'placeholder.jpg'}
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
              src={imageUrl || 'placeholder.jpg'}
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
