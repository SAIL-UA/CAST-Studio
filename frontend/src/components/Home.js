import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Bin from './Bin';
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Home() {
  const [images, setImages] = useState([]);
  const [output, setOutput] = useState('');
  const [recommendedOrder, setRecommendedOrder] = useState([]);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);

  // Fetch user data and narrative cache on component mount
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
      .catch((error) => console.error('Error fetching user data:', error));

    axios
      .get('/get_narrative_cache', { withCredentials: true })
      .then((response) => {
        if (response.data.status === 'success' && response.data.data) {
          const { suggested_order = [], generated_narrative = '' } = response.data.data;
          setRecommendedOrder(suggested_order);
          setOutput(generated_narrative);
        }
      })
      .catch((error) => console.error('Error fetching narrative cache:', error));
  }, []);

  const updateNarrativeCache = (data) => {
    axios
      .post('/update_narrative_cache', data, { withCredentials: true })
      .then(() => console.log('Narrative cache updated'))
      .catch((error) => console.error('Error updating narrative cache:', error));
  };

  const clearNarrativeCache = () => {
    axios
      .post('/clear_narrative_cache', {}, { withCredentials: true })
      .then(() => {
        setRecommendedOrder([]);
        setOutput('');
      })
      .catch((error) => console.error('Error clearing narrative cache:', error));
  };

  const handleDescriptionsUpdate = (id, newShortDesc, newLongDesc) => {
    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id === id
          ? { ...img, short_desc: newShortDesc, long_desc: newLongDesc }
          : img
      )
    );
  };

  const updateImageData = (imageId, data) => {
    axios
      .post('/update_image_data', { id: imageId, ...data }, { withCredentials: true })
      .then((response) => {
        setImages((prevImages) =>
          prevImages.map((img) => (img.id === imageId ? { ...img, ...data } : img))
        );
      })
      .catch((error) => console.error('Error updating image data:', error));
  };

  const runScript = () => {
    setLoadingNarrative(true);
    axios
      .post('/run_script', {}, { withCredentials: true })
      .then((response) => {
        if (response.data.status === 'success') {
          const { narrative, recommended_order } = response.data;
          setOutput(narrative);
          setRecommendedOrder(recommended_order);

          // Update narrative cache
          updateNarrativeCache({
            suggested_order: recommended_order,
            generated_narrative: narrative,
          });
        } else {
          console.error('Error in script:', response.data.message);
        }
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
      .then(() => axios.get('/get_user_data', { withCredentials: true }))
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

  const suggestedOrderImages = recommendedOrder
    .map((filename) => images.find((img) => img.filename === filename))
    .filter((img) => img);

  return (
    <Container fluid>
      <Row className="header-container">
        <Col>
          <h1>CAST Story Board</h1>
        </Col>
      </Row>

      <Row className="justify-content-end buttons-container" style={{ marginTop: '10px' }}>
        <Col md="auto">
          <Button variant="secondary" onClick={generateDescriptions}>
            Generate Descriptions
          </Button>
          {' '}
          {loadingDescriptions && <Spinner animation="border" size="sm" style={{ marginRight: '10px' }} />}
          <Button variant="primary" onClick={runScript}>
            Generate Narrative
          </Button>
          {' '}
          <Button variant="danger" onClick={clearNarrativeCache}>
            Clear Results
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <div className="bins-container">
            <div className="bin-label">Data Story Bin</div>
            <Bin
              id="top-bin"
              images={images.filter((img) => !img.in_storyboard)}
              updateImageData={updateImageData}
              onDescriptionsUpdate={handleDescriptionsUpdate}
            />
            <div className="bin-label">Data Storyboard</div>
            <Bin
              id="bottom-bin"
              images={images.filter((img) => img.in_storyboard)}
              updateImageData={updateImageData}
              onDescriptionsUpdate={handleDescriptionsUpdate}
            />
          </div>
        </Col>
      </Row>

      <Row style={{ marginTop: '10px' }}>
        <Col>
          <div className="bins-container">
            <div className="bin-label">Suggested Order</div>
            <Bin
              id="suggested-order-bin"
              images={suggestedOrderImages}
              updateImageData={() => {}}
              onDescriptionsUpdate={() => {}}
              isSuggestedOrderBin={true}
            />
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <div className="bins-container" style={{ marginTop: '10px' }}>
            <div className="bin-label">Generated Story</div>
            <div
              className="bin story-bin"
              style={{
                border: '1px solid #ccc',
                padding: '10px',
                borderRadius: '5px',
                backgroundColor: '#f0f0f0',
                width: '100%',
                minHeight: '160px',
                maxHeight: '1000px',
                overflowY: 'auto',
              }}
            >
              {loadingNarrative ? (
                <div className="loading-center">
                  <Spinner animation="border" />
                </div>
              ) : (
                <ReactMarkdown
                  className="story-text"
                  children={output.trim() !== '' ? output : 'No story generated yet.'}
                  remarkPlugins={[remarkGfm]}
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
