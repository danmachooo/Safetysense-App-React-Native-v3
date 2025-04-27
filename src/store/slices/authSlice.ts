/* eslint-disable @typescript-eslint/no-unused-vars */
// Updated authSlice.ts

import {createSlice, PayloadAction, createAsyncThunk} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../../services/api/axios';
import {FCM_TOKEN_KEY, AUTH_TOKEN_KEY, AUTH_USER_KEY} from '@env';
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
  user: User | null;
  fcmToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  fcmToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Login user - Updated to handle topic subscription
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

      const token = response.data.data.token;
      const user = response.data.data.user;

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

      // Subscribe to the responder topic after successful login
      await initializeFCM();
      await subscribeToResponderTopic();

      return {token, user};
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Login failed',
      );
    }
  },
);

// Load token
export const loadToken = createAsyncThunk(
  'auth/loadToken',
  async (_, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
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
      return {token, user, fcmToken};
    } catch (error) {
      return thunkAPI.rejectWithValue('Failed to load authentication data');
    }
  },
);

// Logout user - Updated to handle topic unsubscription
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, thunkAPI) => {
    try {
      // Unsubscribe from the responder topic before logout
      await unsubscribeFromResponderTopic();
      const fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      const response = await axios.post('/auth/logout', {fcmToken});

      if (response.data.success) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        // Note: FCM token is NOT removed on logout
      }

      return {success: true};
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Logout failed',
      );
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
        state.token = action.payload.token;
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
        state.user = null;
        // Keep fcmToken even after logout
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(logoutUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {clearErrors, setFcmToken} = authSlice.actions;
export default authSlice.reducer;
