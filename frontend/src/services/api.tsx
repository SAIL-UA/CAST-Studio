import axios from 'axios';
import { ImageData, StoryDataRaw } from '../types/types';

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
  localStorage.setItem('refresh', response.data.refresh || refresh); // Update refresh if provided
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
              return instance(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await refreshToken();
          processQueue(null, newToken);
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          return instance(originalRequest);
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
  // Pass FormData through unchanged; let the browser set multipart boundary
  const response = await API.post('/images/upload/', formData, {
    transformRequest: [(data) => data],
    headers: {
      // Intentionally leave 'Content-Type' undefined so axios sets the boundary
    },
  });
  return response.data;
};

export const deleteFigure = async(filename: string) => {
  const response = await API.post(`/images/${encodeURIComponent(filename)}/delete/`, {})
  return response.data;
};

export const updateImageData = async(imageId: string, data: any) => {
  const response = await API.post(`/images/${imageId}/update/`, { data })
  return response;
};


export const getGroups = async(group_id?: string) => {
  const url = group_id ? `/groups/?group_id=${encodeURIComponent(group_id)}` : '/groups/';
  const response = await API.get(url);
  return response.data.groups;
};

export const createGroup = async(data: any) => {
  const response = await API.post('/groups/create/', { data });
  return response;
};

export const updateGroup = async(groupId: string, data: any) => {
  const response = await API.post(`/groups/${groupId}/update/`, { data });
  return response;
};

export const deleteGroup = async(groupId: string) => {
  const response = await API.post(`/groups/${groupId}/delete/`, {});
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

export const logMousePositionBatch = async(positions: Array<{x: number, y: number, timestamp: string}>) => {
  const response = await API.post('/log/mouse-batch/', {
    pos_batch: positions,
    timestamp: new Date().toISOString()
  });
  return response.data;
};

// Feedback (async task + polling)
export const requestFeedback = async(data: any) => {
  const response = await API.post('/actions/requestfeedback/', data);
  // Response is: { status: 'accepted', task_id: '...' }
  return response.data;
};

export const requestFeedbackStatus = async(taskId: string) => {
  const response = await API.get('/actions/requestfeedback/', { params: { task_id: taskId } });
  // 202: { status: 'pending|started|retry|received' }, 200: array [{title,text}]
  return { status: response.status, data: response.data };
};

export const logScrollBatch = async(sessions: Array<{
  elementId: string,
  clientHeight: number,
  scrollHeight: number,
  events: Array<{
    scrollTop: number,
    scrollPercentage: number,
    timestamp: string
  }>
}>) => {
  const response = await API.post('/log/scroll-batch/', {
    sessions: sessions,
    timestamp: new Date().toISOString()
  });
  return response.data;
};

export const logUserAction = async(actionType: string, elementId: string, state_info?: Record<string, ImageData>) => {
  const response = await API.post('/log/user-action/', {
    action_type: actionType,
    state_info: state_info || {},
    element_id: elementId,
    timestamp: new Date().toISOString()
  });
  return response.data;
}

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

export const exportStory = async(storyData: StoryDataRaw) => {
  const response = await API.post('/export/', { storyData }, { responseType: 'blob' })
  return response;
};

export const createScaffold = async(pattern: string, x?: number, y?: number) => {
  const response = await API.post('/scaffolds/create/', { pattern, x, y });
  return response.data;
};

export const getScaffolds = async(scaffold_id?: string) => {
  const url = scaffold_id ? `/scaffolds/?scaffold_id=${encodeURIComponent(scaffold_id)}` : '/scaffolds/';
  const response = await API.get(url);
  return response.data.scaffolds;
};

export const updateScaffold = async(scaffoldId: string, data: any) => {
  const response = await API.post(`/scaffolds/${scaffoldId}/update/`, { data });
  return response;
};

export const deleteScaffold = async(scaffoldId: string) => {
  const response = await API.post(`/scaffolds/${scaffoldId}/delete/`, {});
  return response;
};
