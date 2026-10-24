// front-end/src/utils/axiosConfig.js
import axios from 'axios';
import i18n from '../i18n/config';

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
    // The server answers its messages in the language chosen in the header
    // (back-end i18n/translateResponses.js). Accept-Language needs no CORS
    // permission.
    config.headers['Accept-Language'] = String(i18n.language || 'es').slice(0, 2);

    // Add auth token if available
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
        // Who is changing something: the server lets each person change only
        // what's theirs (super admins, anything). Only on writes — on reads
        // it would change what lists show (an author's own drafts…).
        const method = String(config.method || 'get').toLowerCase();
        if (method !== 'get' && user.id_user && !config.headers['x-user-id']) {
          config.headers['x-user-id'] = user.id_user;
        }
      } catch (err) {
        console.error('Error parsing user from localStorage:', err);
      }
    }

    // Multipart uploads (block images, audio, covers, logos, theme background)
    // include server-side sharp processing and can exceed the global 10s timeout
    // on the VPS. Detect FormData and grant the upload 60s automatically
    // (or more, if the request asked for more — e.g. paisaje audio).
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.timeout = Math.max(config.timeout || 0, 60000);
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
