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
let failedQueue: Array<{resolve: (token: string) => void, reject: (error: any) => void}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
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

      // Don't try to refresh tokens for login, register, or password reset endpoints
      const excludedEndpoints = ['/login/', '/register/', '/password-reset/', '/token/refresh/'];
      const isExcludedEndpoint = excludedEndpoints.some(endpoint => 
        originalRequest.url?.includes(endpoint)
      );

      if (error.response?.status === 401 && !originalRequest._retry && !isExcludedEndpoint) {
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

export const login = async (credentials: { username: string; password: string }) => {
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


export const register = async(userData: { username: string; email: string; password: string }) => {
  const response = await USER_API.post('/register/', userData)
  return response;
};

export const logout = async () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');

  delete API.defaults.headers.common['Authorization'];
  delete USER_API.defaults.headers.common['Authorization'];

  const response = await USER_API.post('/logout/');
  return response.data;
};

export const getImageData = async(image_id: string) => {
  const response = await API.get(`/images/?image_id=${encodeURIComponent(image_id)}`)
  return response.data.images;
};

export const getImageDataAll = async() => {
  const response = await API.get('/images/')
  return response;
};

export const uploadFigure = async(formData: FormData) => {
  const response = await API.post('/images/upload/', formData)
  return response.data;
};

export const deleteFigure = async(filename: string) => {
  const response = await API.post(`/images/${encodeURIComponent(filename)}/delete/`, {})
  return response.data;
};

export const serveImage = async(filename: string) => {
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

export const updateImageData = async(imageId: string, data: any) => {
  const response = await API.post(`/images/${imageId}/update/`, { data })
  return response;
};

export const generateNarrativeAsync = async(story_structure_id?: string, use_groups?: boolean) => {
  const response = await API.post('/narrative/generate/async/', {
    story_structure_id: story_structure_id || null,
    use_groups: use_groups || false
  })
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

export const updateNarrativeCache = async(data: any) => {
  const response = await API.post('/narrative/cache/update/', { data })
  return response.data; 
};

export const clearNarrativeCache = async() => {
  const response = await API.post('/narrative/cache/clear/')
  return response.data;
};

export const generateDescription = async(image_id: string) => {
  const response = await API.post(`/descriptions/generate/?image_id=${encodeURIComponent(image_id)}`)
  return response.data;
};

export const generateDescriptionAll = async() => {
  const response = await API.post('/descriptions/generate/')
  return response.data;
};

export const logAction = async(data: any) => {
  const response = await API.post('/actions/log/', data)
  return response.data;
};

// Password reset endpoints
export const requestPasswordReset = async(email: string) => {
  const response = await USER_API.post('/password-reset/', { email });
  return response;
};

export const verifyResetCode = async(email: string, code: string) => {
  const response = await USER_API.post('/password-reset-verify/', { 
    email, 
    code 
  });
  return response;
};

export const confirmPasswordReset = async(email: string, code: string, newPassword: string, confirmPassword: string) => {
  const response = await USER_API.post('/password-reset-confirm/', {
    email,
    code,
    new_password: newPassword,
    confirm_password: confirmPassword
  });
  return response;
};

// Group Management
export const createGroup = async(groupData: any) => {
  const response = await API.post('/groups/create/', groupData);
  return response.data;
};

export const getGroups = async() => {
  const response = await API.get('/groups/');
  return response.data;
};

export const updateGroup = async(groupId: string, groupData: any) => {
  const response = await API.patch(`/groups/${groupId}/update/`, groupData);
  return response.data;
};

export const deleteGroup = async(groupId: string) => {
  const response = await API.delete(`/groups/${groupId}/delete/`);
  return response.data;
};

export const addImageToGroup = async(imageId: string, groupId: string) => {
  const response = await API.post('/groups/images/add/', {
    image_id: imageId,
    group_id: groupId
  });
  return response.data;
};

export const removeImageFromGroup = async(imageId: string) => {
  const response = await API.post('/groups/images/remove/', {
    image_id: imageId
  });
  return response.data;
};