import axios, {AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {store} from '../../store/index';
import {
  refreshAccessToken,
  clearAuthState,
  updateToken,
} from '../../store/slices/authSlice';
import {BASE_URL, AUTH_TOKEN_KEY} from '@env';

// const baseURL = 'http://192.168.1.59';

const instance = axios.create({
  baseURL: `${BASE_URL}:3000/api`,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Queue for requests while token is being refreshed
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({resolve, reject}) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - attach token to requests
instance.interceptors.request.use(
  async config => {
    // Skip adding token for refresh endpoint to avoid loops
    if (config.url === '/auth/refresh') {
      return config;
    }

    // Get token from Redux store first, then fallback to AsyncStorage
    const state = store.getState();
    let token = state.auth.token;

    // Fallback to AsyncStorage if store doesn't have token
    if (!token) {
      token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      // Update Redux store with token from AsyncStorage
      if (token) {
        store.dispatch(updateToken(token));
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor - handle authentication errors and token refresh
instance.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Check if this is a 401 error and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for login and refresh endpoints
      if (
        originalRequest.url === '/auth/login' ||
        originalRequest.url === '/auth/refresh'
      ) {
        store.dispatch(clearAuthState());
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({resolve, reject});
        })
          .then(() => {
            // Retry original request with new token
            const state = store.getState();
            if (state.auth.token) {
              originalRequest.headers.Authorization = `Bearer ${state.auth.token}`;
            }
            return instance(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      console.log('401 Unauthorized - attempting token refresh');
      isRefreshing = true;

      try {
        // Check if we have a refresh token before attempting refresh
        const state = store.getState();
        if (!state.auth.refreshToken) {
          console.log('No refresh token available, clearing auth state');
          store.dispatch(clearAuthState());
          processQueue(new Error('No refresh token available'), null);
          return Promise.reject(new Error('No refresh token available'));
        }

        // Dispatch refresh token action
        const refreshResult = await store.dispatch(refreshAccessToken());

        if (refreshAccessToken.fulfilled.match(refreshResult)) {
          const newToken = refreshResult.payload.token;
          console.log('Token refreshed successfully');

          // Process queued requests
          processQueue(null, newToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } else {
          // If refresh was rejected, process queue with error and clear auth
          console.log('Token refresh failed:', refreshResult.payload);
          store.dispatch(clearAuthState());
          processQueue(refreshResult.payload, null);
          return Promise.reject(refreshResult.payload);
        }
      } catch (refreshError) {
        // If refresh fails, process queue with error and clear auth
        console.error('Token refresh error:', refreshError);
        store.dispatch(clearAuthState());
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors, just reject
    return Promise.reject(error);
  },
);

// Add request/response logging for debugging (remove in production)
if (__DEV__) {
  instance.interceptors.request.use(request => {
    console.log('API Request:', request.method?.toUpperCase(), request.url);
    if (request.headers.Authorization) {
      console.log('Authorization header present');
    }
    return request;
  });

  instance.interceptors.response.use(
    response => {
      console.log('API Response:', response.status, response.config.url);
      return response;
    },
    error => {
      console.log(
        'API Error:',
        error.response?.status,
        error.config?.url,
        error.message,
      );
      return Promise.reject(error);
    },
  );
}

export default instance;
