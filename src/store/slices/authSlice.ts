/* eslint-disable @typescript-eslint/no-unused-vars */
// Updated authSlice.ts with Token Rotation - FIXED VERSION

import {createSlice, PayloadAction, createAsyncThunk} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../../services/api/axios';
import _axios from 'axios';
import {
  FCM_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  BASE_URL,
} from '@env';
import {
  subscribeToResponderTopic,
  unsubscribeFromResponderTopic,
  initializeFCM,
} from '../../services/firebase/fcmService';
import {RootState} from '../../store/index';

interface User {
  id: number;
  firstname: string;
  lastname: string;
  contact: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  fcmToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  fcmToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isRefreshing: false,
};

// Token refresh thunk - FIXED
export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, thunkAPI) => {
    try {
      // Get the current refresh token from storage
      const refreshToken = await AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Create a separate axios instance to avoid interceptor loops
      const refreshAxios = _axios.create({
        baseURL: `${BASE_URL}:3000/api`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });

      // Send refresh token in the request - adapt based on your backend implementation
      const response = await refreshAxios.post(
        '/auth/refresh',
        {},
        {
          headers: {
            Cookie: `refreshToken=${refreshToken}`, // If using cookie-based refresh
          },
        },
      );

      // Handle different response formats
      let newToken, newRefreshToken;

      if (response.data.success && response.data.data) {
        // Format: { success: true, data: { access, refresh } }
        const {access, refresh} = response.data.data;
        newToken = access;
        newRefreshToken = refresh;
      } else if (response.data.success && response.data.token) {
        // Format: { success: true, token: "..." }
        newToken = response.data.token;
        newRefreshToken = refreshToken; // Keep existing refresh token
      } else if (response.data.access) {
        // Format: { access: "...", refresh?: "..." }
        newToken = response.data.access;
        newRefreshToken = response.data.refresh || refreshToken;
      } else {
        throw new Error('Invalid refresh response format');
      }

      // Store both tokens
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, newRefreshToken);
      }

      console.log('Token refreshed successfully');

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error: any) {
      console.error('Token refresh failed:', error);

      // If refresh fails, clear auth state
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
      await unsubscribeFromResponderTopic();

      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          'Token refresh failed',
      );
    }
  },
);

// Login user - Updated to handle topic subscription and refresh token
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({email, password}: {email: string; password: string}, thunkAPI) => {
    try {
      const fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

      const response = await axios.post('/auth/login', {
        email,
        password,
        fcmToken,
      });
      console.log('Login response:', response.data);
      const {access, refresh, user} = response.data.data;

      console.log('ACCESS TOKEN', access);
      console.log('REFRESH TOKEN', refresh); // Fixed: was logging function instead of token
      console.log('USER', user);

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, access);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refresh);

      // Subscribe to the responder topic after successful login
      await initializeFCM();
      await subscribeToResponderTopic();

      return {access, refresh, user}; // Return refresh token too
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Login failed',
      );
    }
  },
);

// Load token - FIXED to load refresh token
export const loadToken = createAsyncThunk(
  'auth/loadToken',
  async (_, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
      const fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      let user = null;
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (userData) {
        user = JSON.parse(userData);

        // If we have a user and token, ensure topic is subscribed
        if (token && user) {
          await subscribeToResponderTopic();
        }
      }
      return {token, refreshToken, user, fcmToken}; // Return refresh token too
    } catch (error) {
      return thunkAPI.rejectWithValue('Failed to load authentication data');
    }
  },
);

// Logout user - Updated to handle refresh token cleanup
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, thunkAPI) => {
    try {
      // Unsubscribe from the responder topic before logout
      await unsubscribeFromResponderTopic();
      const fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);

      const response = await axios.post('/auth/logout', {
        fcmToken,
        refreshToken, // Send refresh token for server-side cleanup
      });

      if (response.data.success) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
        // Note: FCM token is NOT removed on logout
      }

      return {success: true};
    } catch (error: any) {
      // Even if logout request fails, clear local storage
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);

      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Logout failed',
      );
    }
  },
);

// Clear auth state action (used when refresh fails)
export const clearAuthState = createAsyncThunk(
  'auth/clearAuthState',
  async (_, thunkAPI) => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
      await unsubscribeFromResponderTopic();
      return {success: true};
    } catch (error) {
      return thunkAPI.rejectWithValue('Failed to clear auth state');
    }
  },
);

// Create the slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearErrors: state => {
      state.error = null;
    },
    setFcmToken: (state, action: PayloadAction<string>) => {
      state.fcmToken = action.payload;
    },
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    updateRefreshToken: (state, action: PayloadAction<string>) => {
      state.refreshToken = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      // Login
      .addCase(loginUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access;
        state.refreshToken = action.payload.refresh; // Store refresh token
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // Load token
      .addCase(loadToken.pending, state => {
        state.loading = true;
      })
      .addCase(loadToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken; // Load refresh token
        state.user = action.payload.user;
        state.fcmToken = action.payload.fcmToken;
        state.isAuthenticated = !!(action.payload.token && action.payload.user);
        state.loading = false;
      })
      .addCase(loadToken.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logoutUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.token = null;
        state.refreshToken = null; // Clear refresh token
        state.user = null;
        // Keep fcmToken even after logout
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(logoutUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
        // Clear tokens even on logout failure
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
      })

      // Token refresh
      .addCase(refreshAccessToken.pending, state => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken; // Update refresh token
        state.error = null;
      })
      .addCase(
        refreshAccessToken.rejected,
        (state, action: PayloadAction<any>) => {
          state.isRefreshing = false;
          state.token = null;
          state.refreshToken = null; // Clear refresh token
          state.user = null;
          state.isAuthenticated = false;
          state.error = action.payload;
        },
      )

      // Clear auth state
      .addCase(clearAuthState.fulfilled, state => {
        state.token = null;
        state.refreshToken = null; // Clear refresh token
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const {clearErrors, setFcmToken, updateToken, updateRefreshToken} =
  authSlice.actions;
export default authSlice.reducer;
