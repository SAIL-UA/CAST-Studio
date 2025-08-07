import axios from 'axios';

// === Create Axios instances ===
const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const USER_API = axios.create({
  baseURL: '/users',
  withCredentials: true,
});

// === Attach Authorization header if token exists ===
const accessToken = localStorage.getItem('access');
if (accessToken) {
  API.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  USER_API.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
}

// === Token Refresh Helper ===
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const refreshToken = async () => {
  const refresh = localStorage.getItem('refresh');
  if (!refresh) throw new Error("No refresh token available.");

  const response = await USER_API.post('/token/refresh/', { refresh });
  const newAccess = response.data.access;

  localStorage.setItem('access', newAccess);
  API.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
  USER_API.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;

  return newAccess;
};

// === Interceptor to auto-refresh access tokens ===
[API, USER_API].forEach(instance => {
  instance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return axios(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await refreshToken();
          processQueue(null, newToken);
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          return axios(originalRequest);
        } catch (err) {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          window.location.href = '/login';
          processQueue(err, null);
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
});



// user endpoints
export const checkAuth = async() => {
  const response = await USER_API.get('/check_auth/')
  return response.data;
};

export const login = async (credentials) => {
  const response = await USER_API.post('/login/', credentials);

  if (response.data.access && response.data.refresh) {
    localStorage.setItem('access', response.data.access);
    localStorage.setItem('refresh', response.data.refresh);
    API.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    USER_API.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    console.log("set access and refresh tokens");
  }
  
  return response;
};


export const register = async(userData) => {
  const response = await USER_API.post('/register/', userData)
  return response;
};

export const getDashboard = async() => {
  const response = await USER_API.get('/dashboard/');
  return response.data;
};

export const logout = async () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');

  delete API.defaults.headers.common['Authorization'];
  delete USER_API.defaults.headers.common['Authorization'];

  const response = await USER_API.post('/logout/');
  return response.data;
};



export const getUserData = async() => {
  const response = await API.get('/get_user_data/')
  return response;
};

export const uploadFigure = async(formData) => {
  const response = await API.post('/upload_figure/', formData)
  return response.data;
};

export const deleteFigure = async(filename) => {
  const response = await API.post('/delete_figure/', { filename: filename })
  return response.data;
};

export const serveImage = async(filename) => {
  try {
    const response = await API.get(`/serve_image/${filename}/`, {
      responseType: 'blob',
    })
    
    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const blob = await response.data;
    return URL.createObjectURL(blob); 
  } catch (err) {
    console.error('Failed to fetch image blob:', err);
    return ''; 
  }
};

export const updateImageData = async(imageId, data) => {
  const response = await API.post('/update_image_data/', { image_id: imageId, data })
  return response;
};

export const runScript = async() => {
  const response = await API.post('/run_script/')
  return response.data;
};

export const getNarrativeCache = async() => {
  const response = await API.get('/get_narrative_cache/');
  return response;
};

export const updateNarrativeCache = async(data) => {
  const response = await API.post('/update_narrative_cache/', { data })
  return response.data; 
};

export const clearNarrativeCache = async() => {
  const response = await API.post('/clear_narrative_cache/')
  return response.data;
};

export const generateLongDescriptions = async() => {
  const response = await API.post('/generate_long_descriptions/')
  return response.data;
};

export const generateSingleLongDescription = async(imageId) => {
  const response = await API.post('/generate_single_long_description/', { image_id: imageId })
  return response.data;
};


export const logAction = async(data) => {
  const response = await API.post('/log_action/', data)
  return response.data;
};

export const generateLongDescriptionForImage = async(imageId) => {
  const response = await API.post('/generate_single_long_description/', { image_id: imageId })
  return response.data;
};