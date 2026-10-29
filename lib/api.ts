import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';

const api: AxiosInstance =
  typeof axios.create === 'function'
    ? axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    : (axios as unknown as AxiosInstance);

// Attach JWT bearer token to every outgoing request
if (api?.interceptors?.request) {
  api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );
}

// Handle 401 Unauthorized -- clear stored token and redirect to login
if (api?.interceptors?.response) {
  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );
}

export default api;
