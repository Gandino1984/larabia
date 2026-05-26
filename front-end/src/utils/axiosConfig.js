// front-end/src/utils/axiosConfig.js
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.DEV
    ? ''  // Use Vite proxy in dev — avoids CORS entirely
    : (import.meta.env.VITE_API_URL || 'https://api.larabia.uribarri.online'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (err) {
        console.error('Error parsing user from localStorage:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry GET requests on network errors or timeouts (backend cold-start)
    // Requests with _skipRetry=true manage their own retry logic
    const isNetworkOrTimeout = !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
    if (config?.method === 'get' && isNetworkOrTimeout && !config._skipRetry) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= 3) {
        const delay = config._retryCount * 1500; // 1.5s → 3s → 4.5s
        await new Promise(resolve => setTimeout(resolve, delay));
        return axiosInstance(config);
      }
    }

    if (error.response?.status === 401) {
      // Unauthorized - clear user data
      localStorage.removeItem('currentUser');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
