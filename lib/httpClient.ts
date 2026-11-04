import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

/**
 * The application's single HTTP client. Services should import this module
 * instead of importing Axios directly so cross-cutting HTTP behaviour remains
 * consistent.
 */
const httpClient: AxiosInstance = axios.create?.({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
}) || axios;

httpClient.defaults.headers.common['Content-Type'] = 'application/json';

// Jest's automatic Axios mock does not provide interceptor managers. Guarding
// their registration keeps services easy to unit test while production always
// receives the complete pipeline.
if (httpClient.interceptors?.request && httpClient.interceptors?.response) {
  httpClient.interceptors.request.use(
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

  httpClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        window.location.assign('/login');
      }

      return Promise.reject(error);
    },
  );
}

export default httpClient;
export const isAxiosError: typeof axios.isAxiosError = (payload) => axios.isAxiosError(payload);
export const isCancel: typeof axios.isCancel = (value) => axios.isCancel(value);
