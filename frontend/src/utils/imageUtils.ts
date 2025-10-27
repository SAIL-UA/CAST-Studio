import { ImageData, ImageMetadata } from '../types/types';
import { getImageData } from '../services/api';
const IMAGE_BASE_URL = process.env.REACT_APP_IMAGE_BASE_URL || '/images';

export const getImageUrl = (filename: string): string => {
  return `${IMAGE_BASE_URL}/${filename}`;
};

/**
 * Formats image metadata by fetching details if a string (image ID) is provided,
 * or by using the provided ImageData object. Returns a standardized metadata object.
 * @param {ImageData|string} image - The image data object or image ID string.
 */
export const formatImageMetadata = async (image: ImageData|string): Promise<ImageMetadata> => {
  let imageData: ImageData;
  if (typeof image === 'string') {
    imageData = await getImageData(image);
  } else { imageData = image; }

  return {
    image_id: imageData.id,
    x: imageData.x,
    y: imageData.y,
    filepath: imageData.filepath,
    description: imageData.long_desc || '',
    source: imageData.source || '',
    user: imageData.user
  };
};