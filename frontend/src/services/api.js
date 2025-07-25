import axios from 'axios';


// TODO: begin refactoring frontend logic to use endpoints defined in this file

// Define axios instance for API endpoints with /api suffix
const API = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:8050'}/api`,
  withCredentials: true,
});

// API for user-specific endpoints, without /api suffix
const USER_API = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:8050'}`,
  withCredentials: true,
});



// user endpoints
export const login = async() => {
  const response = await USER_API.post('/login')
  return response.data;
};

export const getDashboard = async() => {
  const response = await USER_API.get('/dashboard');
  return response.data;
};

export const logout = async() => {
  const response = await USER_API.post('/logout');
  return response.data;
};





export const getUserData = async() => {
  const response = await API.get('/get_user_data')
  return response.data;
};

export const uploadFigure = async(formData) => {
  const response = await API.post('/upload_figure', formData)
  return response.data;
};

export const deleteFigure = async(figureId) => {
  const response = await API.post('/delete_figure', { figure_id: figureId })
  return response.data;
};

export const serveImage = async(filename) => {
  const response = await API.get(`/serve_image/${filename}`)
  return response.data;
};

export const updateImageData = async(imageId, data) => {
  const response = await API.post('/update_image_data', { image_id: imageId, data })
  return response.data;
};

export const runScript = async() => {
  const response = await API.post('/run_script')
  return response.data;
};

export const getNarrativeCache = async() => {
  const response = await API.get('/get_narrative_cache');
  return response.data;
};

export const updateNarrativeCache = async(data) => {
  const response = await API.post('/update_narrative_cache', { data })
  return response.data; 
};

export const clearNarrativeCache = async() => {
  const response = await API.post('/clear_narrative_cache')
  return response.data;
};

export const generateLongDescriptions = async() => {
  const response = await API.post('/generate_long_descriptions')
  return response.data;
};

export const generateSingleLongDescription = async(imageId) => {
  const response = await API.post('/generate_single_long_description', { image_id: imageId })
  return response.data;
};