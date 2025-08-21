import React, { useState, useEffect, useRef } from 'react';
import Bin from './Bin';
import { getImageDataAll, uploadFigure, getNarrativeCache, updateNarrativeCache, clearNarrativeCache, updateImageData, runScript, generateDescriptionAll } from '../services/api';
import { Container, Row, Col, Button, Spinner} from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Home() {
  const [images, setImages] = useState([]);
  const [output, setOutput] = useState('');
  const [order, setOrder] = useState([]);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categorizeOutput, setCategorizeOutput] = useState('');
  const [themeOutput, setThemeOutput] = useState('');
  const [imagesGeneratingIds, setImagesGeneratingIds] = useState(new Set());

  
  const [sequenceOutput, setSequenceOutput] = useState('');
  const fileInputRef = useRef(null);
  const combinedThemeAndCategories = `${themeOutput || ""}\n\n${categorizeOutput || ""}`;




  // Reusable function to fetch user data
  const fetchUserData = () => {
    getImageDataAll()
      .then((response) => {
        if (response.data.images.length === 0) {
          setImages([]);
          return;
        } 
        const fetchedImages = response.data.images.map((img) => ({
          ...img,
          x: img.in_storyboard ? img.x : 0,
          y: img.in_storyboard ? img.y : 0,
        }));
        setImages(fetchedImages);
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
        alert('Failed to load user data. Please refresh the page.');
      });
  };

  // Fetch on mount
  useEffect(() => {
    fetchUserData();

    getNarrativeCache()
    .then((response) => {
      // axios response expected here; if you're using fetch, parse json() first
      if (response && (response.status === 200 || response.status === 204)) {
        // unwrap if server returns { status, data: {...} }, else use data directly
        const payload = response?.data?.data ?? response?.data ?? {};

        const order =
          Array.isArray(payload.order) ? payload.order : [];

        const narrative =
          typeof payload.narrative === "string" ? payload.narrative : "";

        const theme =
          typeof payload.theme === "string" ? payload.theme : "";

        // categories is an array of { filename, category } objects
        const categories =
          Array.isArray(payload.categories) ? payload.categories : [];

        const sequenceJustification =
          typeof payload.sequence_justification === "string"
            ? payload.sequence_justification
            : "";

        setOrder(order);
        setOutput(narrative);
        setThemeOutput(theme);
        setCategorizeOutput(categories);
        setSequenceOutput(sequenceJustification);
      } else {
        console.log('No narrative cache found');
      }
    })
    .catch((error) => {
      console.error('Error fetching narrative cache:', error);
    });
  }, []);

  const updateNarrativeCacheLocal = (data) => {
    updateNarrativeCache({ data })
      .then(() => console.log('Narrative cache updated'))
      .catch((error) => {
        console.error('Error updating narrative cache:', error);
        // Silent fail for cache update
      });
  };

  const clearNarrativeCacheLocal = () => {
    clearNarrativeCache()
      .then(() => {
        setOrder([]);
        setOutput('');
        setCategorizeOutput('');
        setThemeOutput('');
        setSequenceOutput('');
      })
      .catch((error) => {
        console.error('Error clearing narrative cache:', error);
        alert('Failed to clear results. Please try again.');
      });
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

  const updateImageDataLocal = (imageId, data) => {
    updateImageData(imageId, data)
      .then(() => {
        setImages((prevImages) =>
          prevImages.map((img) => (img.id === imageId ? { ...img, ...data } : img))
        );
      })
      .catch((error) => {
        console.error('Error updating image data:', error);
        alert('Failed to update image data. Please try again.');
      });
  };

  const handleFileUpload = async () => {
    if (!fileInputRef.current.files.length) return;

    setUploading(true);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('figure', file);
  
    try {
      const res = await uploadFigure(formData);

      if (res.status === 'success') {
        fetchUserData();
        fileInputRef.current.value = '';
      } else {
        alert(res.message || 'Error uploading figure');
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

  const runScriptLocal = () => {
    setLoadingNarrative(true);
    runScript()
      .then((response) => {
        if (response.status === 'success') {
          const { 
            narrative, 
            order, 
            categories, 
            theme, 
            sequence_justification 
          } = response;
          // Set final outputs
          setOutput(narrative);
          setOrder(order);

          // Set intermediate outputs
          setCategorizeOutput(categories);
          setThemeOutput(theme);
          setSequenceOutput(sequence_justification);

          // Update the narrative cache if needed
          updateNarrativeCacheLocal({
            order: order,
            narrative: narrative,
            theme: theme,
            categories: categories,
            sequence_justification: sequence_justification
          });
        } else {
          console.error('Error in script:', response.message);
        }
        setLoadingNarrative(false);
      })
      .catch((error) => {
        console.error('Error running script:', error);
        setLoadingNarrative(false);
        alert('Failed to generate story. Please try again.');
      });
  };

  const generateDescriptionsLocal = async () => {
    setLoadingDescriptions(true);
    const response = await generateDescriptionAll();
    if (response.status === 'success') {
      setImagesGeneratingIds(new Set(response.data.map((img) => img.id)));
    } else {
      console.error('Error generating descriptions:', response.message);
      alert('Failed to generate descriptions. Please try again.');
    }
    setLoadingDescriptions(false);
  };

  // onDelete callback: re-fetch data after deletion
  const handleDelete = () => {
    fetchUserData();
  };



  return (
    <Container fluid>
      <Row className="header-container">
        <Col>
          <h1>CAST Story Studio</h1>
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
          className="upload-figure-header"
        >
          {uploading ? 'Uploading...' : 'Upload Figure'}
        </Button>

        {imagesGeneratingIds.size > 0 ? (
          <Button variant="secondary" className="generate-desc-header" disabled>
            Generating Descriptions...
          </Button>
        ) : (
          <Button variant="secondary" className="generate-desc-header" onClick={generateDescriptionsLocal}>
            Generate Descriptions
          </Button>
        )}

        <Button variant="primary" className="generate-story-header" onClick={runScriptLocal}>
          Generate Story
        </Button>

        <Button variant="danger" className="clear-results-header" onClick={clearNarrativeCacheLocal}>
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
              updateImageData={updateImageDataLocal}
              onDescriptionsUpdate={handleDescriptionsUpdate}
              onDelete={handleDelete}  // Pass onDelete here
            />
            <div className="bin-label" style={{width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}>Data Storyboard</div>
            <Bin
              id="bottom-bin"
              images={images.filter((img) => img.in_storyboard)}
              updateImageData={updateImageDataLocal}
              onDescriptionsUpdate={handleDescriptionsUpdate}
              onDelete={handleDelete}
            />
          </div>
        </Col>
      </Row>

      <Row style={{ marginTop: '10px' }}>
        <Col>
          <div className="bins-container">
            <div 
              className="bin-label" 
              style={{ width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}
            >
              Figure Insight Generation
            </div>
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
                display: 'flex',
              }}
            >
              {loadingNarrative ? (
                <div className="loading-center">
                  <Spinner animation="border" />
                </div>
                ) : (
              <textarea
                value={combinedThemeAndCategories}
                readOnly
                style={{
                  width: '100%',
                  height: '100%',  // Match outer container height
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  resize: 'none',  // Disable textarea resizing
                }}
              />
              )}
            </div>
          </div>
        </Col>
      </Row>


      <Row style={{ marginTop: '10px' }}>
        <Col>
          <div className="bins-container">
          <div className="bin-label" style={{ width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}>
            Narrative Structuring
          </div>
          {loadingNarrative ? (
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
              }}>
                <div className="loading-center">
                  <Spinner animation="border" />
                </div>
            </div>
          ) : (
            <Bin
              id="suggested-order-bin"
              images={order
                .map((filename) => images.find((img) => img.filepath === filename))
                .filter((img) => img)}
              updateImageData={() => {}}
              onDescriptionsUpdate={() => {}}
              isSuggestedOrderBin={true}
            />
          )}


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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                { sequenceOutput || '' }
              </ReactMarkdown>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <div className="bins-container" style={{ marginTop: '10px' }}>
            <div className="bin-label" style={{width: '100%', alignSelf: 'flex-start', textAlign: 'left' }}>Story Construction</div>
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
                <div className="story-text" style={{width: '100%', height: '100%', overflowY: 'auto'}}>
                <ReactMarkdown
                  children={output.trim() !== '' ? output : 'No story generated yet.'}
                  remarkPlugins={[remarkGfm]}
                />
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default Home;
