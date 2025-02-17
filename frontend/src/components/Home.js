import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Bin from './Bin';
import { Container, Row, Col, Button, Spinner, Form } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Home() {
  const [images, setImages] = useState([]);
  const [output, setOutput] = useState('');
  const [recommendedOrder, setRecommendedOrder] = useState([]);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Reusable function to fetch user data
  const fetchUserData = () => {
    axios
      .get('/get_user_data', { withCredentials: true })
      .then((response) => {
        const fetchedImages = response.data.images.map((img) => ({
          ...img,
          x: img.in_storyboard ? img.x : 0,
          y: img.in_storyboard ? img.y : 0,
        }));
        setImages(fetchedImages);
      })
      .catch((error) => console.error('Error fetching user data:', error));
  };

  // Fetch on mount
  useEffect(() => {
    fetchUserData();

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
      .then(() => {
        setImages((prevImages) =>
          prevImages.map((img) => (img.id === imageId ? { ...img, ...data } : img))
        );
      })
      .catch((error) => console.error('Error updating image data:', error));
  };

  const handleFileUpload = async () => {
    if (!fileInputRef.current.files.length) return;

    setUploading(true);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('figure', file);

    try {
      const res = await axios.post('/upload_figure', formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.status === 'success') {
        fetchUserData();
        fileInputRef.current.value = '';
      } else {
        alert(res.data.message || 'Error uploading figure');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('An error occurred while uploading the figure');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = () => {
    handleFileUpload();
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

  // onDelete callback: re-fetch data after deletion
  const handleDelete = () => {
    fetchUserData();
  };

  const suggestedOrderImages = recommendedOrder
    .map((filename) => images.find((img) => img.filename === filename))
    .filter((img) => img);

  return (
    <Container fluid>
      <Row className="header-container">
        <Col>
          <h1>CAST Storyboard</h1>
        </Col>
      </Row>

      <div 
        className="d-flex justify-content-center align-items-center my-3" 
        style={{ gap: '1rem' }}  // Adds spacing between items
      >
        <input
          type="file"
          accept=".png, .jpg, .jpeg, .bmp, .tiff"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        <Button
          variant="success"
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Figure'}
        </Button>

        <Button variant="secondary" onClick={generateDescriptions}>
          Generate Descriptions
        </Button>
        {loadingDescriptions && <Spinner animation="border" size="sm" />}

        <Button variant="primary" onClick={runScript}>
          Generate Narrative
        </Button>

        <Button variant="danger" onClick={clearNarrativeCache}>
          Clear Results
        </Button>
        {loadingNarrative && <Spinner animation="border" size="sm" />}
      </div>





      <Row>
        <Col>
          <div className="bins-container">
            <div className="bin-label" style={{width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}>Data Story Bin</div>
            <Bin
              id="top-bin"
              images={images.filter((img) => !img.in_storyboard)}
              updateImageData={updateImageData}
              onDescriptionsUpdate={handleDescriptionsUpdate}
              onDelete={handleDelete}  // Pass onDelete here
            />
            <div className="bin-label" style={{width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}>Data Storyboard</div>
            <Bin
              id="bottom-bin"
              images={images.filter((img) => img.in_storyboard)}
              updateImageData={updateImageData}
              onDescriptionsUpdate={handleDescriptionsUpdate}
              onDelete={handleDelete}
            />
          </div>
        </Col>
      </Row>

      <Row style={{ marginTop: '10px' }}>
        <Col>
          <div className="bins-container">
            <div className="bin-label" style={{width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}>Suggested Order</div>
            <Bin
              id="suggested-order-bin"
              images={recommendedOrder
                .map((filename) => images.find((img) => img.filename === filename))
                .filter((img) => img)}
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
            <div className="bin-label" style={{width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}>Generated Story</div>
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
