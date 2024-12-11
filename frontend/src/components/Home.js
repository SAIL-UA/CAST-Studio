import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Bin from './Bin';
import './App.css';
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Home() {
  const [images, setImages] = useState([]);
  const [output, setOutput] = useState('');
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);

  useEffect(() => {
    axios
      .get('/get_user_data', { withCredentials: true })
      .then((response) => {
        const images = response.data.images.map((img) => ({
          ...img,
          x: img.in_storyboard ? img.x : 0,
          y: img.in_storyboard ? img.y : 0,
        }));
        setImages(images);
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
        alert('Error fetching user data: ' + error.message);
      });
  }, []);

  const updateImageData = (imageId, data) => {
    axios
      .post(
        '/update_image_data',
        {
          id: imageId,
          ...data,
        },
        { withCredentials: true }
      )
      .then((response) => {
        console.log('Image data updated:', response.data);
        setImages((prevImages) =>
          prevImages.map((img) =>
            img.id === imageId ? { ...img, ...data } : img
          )
        );
      })
      .catch((error) => {
        console.error('Error updating image data:', error);
        alert('Error updating image data: ' + error.message);
      });
  };

  const runScript = () => {
    setLoadingNarrative(true);
    axios
      .post('/run_script', {}, { withCredentials: true })
      .then((response) => {
        setOutput(response.data.output);
        setLoadingNarrative(false);
      })
      .catch((error) => {
        console.error('Error running script:', error);
        setLoadingNarrative(false);
      });
  };

  const generateDescriptions = () => {
    setLoadingDescriptions(true);
    axios
      .post('/generate_long_descriptions', {}, { withCredentials: true })
      .then((response) => {
        console.log(response.data.message);
        // After generating descriptions, re-fetch data
        return axios.get('/get_user_data', { withCredentials: true });
      })
      .then((response) => {
        const updatedImages = response.data.images.map((img) => ({
          ...img,
          x: img.in_storyboard ? img.x : 0,
          y: img.in_storyboard ? img.y : 0,
        }));
        setImages(updatedImages);
        setLoadingDescriptions(false);
      })
      .catch((error) => {
        console.error('Error generating descriptions:', error);
        setLoadingDescriptions(false);
      });
  };

  return (
    <Container fluid>
      {/* Header Banner */}
      <Row className="header-container">
        <Col>
          <h1>CAST Story Board</h1>
        </Col>
      </Row>

      {/* Buttons Row */}
      <Row className="justify-content-end" style={{ marginTop: '10px' }}>
        <Col md="auto">
          <Button variant="secondary" onClick={generateDescriptions}>
            Generate Descriptions
          </Button>{' '}
          {loadingDescriptions && (
            <Spinner
              animation="border"
              size="sm"
              style={{ marginRight: '10px' }}
            />
          )}
          <Button onClick={runScript}>Generate Narrative</Button>
        </Col>
      </Row>

      {/* Data Story Bin & Storyboard */}
      <Row>
        <Col>
          <div className="bins-container">
            <div className="bin-label">Data Story Bin</div>
            <Bin
              id="top-bin"
              images={images.filter((img) => !img.in_storyboard)}
              updateImageData={updateImageData}
            />
            <div className="bin-label">Data Storyboard</div>
            <Bin
              id="bottom-bin"
              images={images.filter((img) => img.in_storyboard)}
              updateImageData={updateImageData}
            />
          </div>
        </Col>
      </Row>

      {/* Generated Story Section */}
      <Row>
        <Col>
          <div className="bins-container" style={{ marginTop: '30px' }}>
            <div className="bin-label">Generated Story</div>
            <div className="bin story-bin" style={{ height: 'auto', maxHeight: 'none' }}>
              {loadingNarrative ? (
                <div className="loading-center">
                  <Spinner animation="border" />
                </div>
              ) : (
                <ReactMarkdown
                  className="story-text"
                  children={output.trim() !== '' ? output : 'No story generated yet.'}
                  remarkPlugins={[remarkGfm]} // Enables support for GitHub-flavored Markdown
                />
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default Home;
