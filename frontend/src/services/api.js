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

export const getImageData = async(image_id) => {
  const response = await API.get(`/images/?image_id=${encodeURIComponent(image_id)}`)
  return response.data.images;
};

export const getImageDataAll = async() => {
  const response = await API.get('/images/')
  return response;
};

export const uploadFigure = async(formData) => {
  const response = await API.post('/images/upload/', formData)
  return response.data;
};

export const deleteFigure = async(filename) => {
  const response = await API.post(`/images/${encodeURIComponent(filename)}/delete/`, {})
  return response.data;
};

export const serveImage = async(filename) => {
  try {
    const response = await API.get(`/images/${encodeURIComponent(filename)}/serve/`, {
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
  const response = await API.post(`/images/${imageId}/update/`, { data })
  return response;
};

export const generateNarrativeAsync = async() => {
  const response = await API.post('/narrative/generate/async/')
  return response.data;
};

export const generateNarrative = async() => {
  const response = await API.post('/narrative/generate/')
  return response.data;
};

// Deprecated: Use generateNarrative or generateNarrativeAsync instead
export const runScript = async() => {
  const response = await API.post('/narrative/generate/')
  return response.data;
};

export const getNarrativeCache = async() => {
  const response = await API.get('/narrative/cache/');
  return response;
};

export const updateNarrativeCache = async(data) => {
  const response = await API.post('/narrative/cache/update/', { data })
  return response.data; 
};

export const clearNarrativeCache = async() => {
  const response = await API.post('/narrative/cache/clear/')
  return response.data;
};

export const generateDescription = async(image_id) => {
  const response = await API.post(`/descriptions/generate/?image_id=${encodeURIComponent(image_id)}`)
  return response.data;
};

export const generateDescriptionAll = async() => {
  const response = await API.post('/descriptions/generate/')
  return response.data;
};

export const logAction = async(data) => {
  const response = await API.post('/actions/log/', data)
  return response.data;
};