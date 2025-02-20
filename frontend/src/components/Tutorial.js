import React from 'react';
import { Carousel } from 'react-bootstrap';

const tutorialImages = [
  { src: '/images/Tutorial1.png', caption: "1/15" },
  { src: '/images/Tutorial2.png', caption: "2/15" },
  { src: '/images/Tutorial3.png', caption: "3/15" },
  { src: '/images/Tutorial4.png', caption: "4/15" },
  { src: '/images/Tutorial5.png', caption: "5/15" },
  { src: '/images/Tutorial6.png', caption: "6/15" },
  { src: '/images/Tutorial7.png', caption: "7/15" },
  { src: '/images/Tutorial8.png', caption: "8/15" },
  { src: '/images/Tutorial9.png', caption: "9/15" },
  { src: '/images/Tutorial10.png', caption: "10/15" },
  { src: '/images/Tutorial11.png', caption: "11/15" },
  { src: '/images/Tutorial12.png', caption: "12/15" },
  { src: '/images/Tutorial13.png', caption: "13/15" },
  { src: '/images/Tutorial14.png', caption: "14/15" },
  { src: '/images/Tutorial15.png', caption: "15/15" },
];

const Tutorial = () => {
    return (
      <div className="tutorial-container" style={{ padding: '20px' }}>
        <Carousel
          keyboard={true}
          indicators={true}
          controls={true}
          interval={null}
          // Ensure the carousel is a positioned container
          style={{ position: 'relative' }}
          prevIcon={
            <span
              style={{
                fontSize: '2rem',
                color: 'black',
                lineHeight: '1',
                position: 'absolute',
                top: '50%',
                left: '10px',
                transform: 'translateY(-50%)',
                zIndex: 1,
              }}
            >
              &#8592;
            </span>
          }
          nextIcon={
            <span
              style={{
                fontSize: '2rem',
                color: 'black',
                lineHeight: '1',
                position: 'absolute',
                top: '50%',
                right: '10px',
                transform: 'translateY(-50%)',
                zIndex: 1,
              }}
            >
              &#8594;
            </span>
          }
        >
          {tutorialImages.map((image, index) => (
            <Carousel.Item key={index}>
              <img
                className="d-block"
                src={image.src}
                alt={`Slide ${index + 1}`}
                style={{ height: '85vh', margin: '0 auto', marginBottom: '100px' }}
              />
              {image.caption && (
                <Carousel.Caption>
                  <p style={{ color: 'black', fontSize: '1.5rem' }}>
                    {image.caption}
                  </p>
                </Carousel.Caption>
              )}
            </Carousel.Item>
          ))}
        </Carousel>
      </div>
    );
  };
  
  export default Tutorial;
