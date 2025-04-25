import {createSlice, PayloadAction, createAsyncThunk} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../../services/api/axios';

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
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({email, password}: {email: string; password: string}, thunkAPI) => {
    try {
      const response = await axios.post('/auth/login', {email, password});
      console.log(response);
      const token = response.data.data.token;
      const user = response.data.data.user;
      console.log('AUTH TOKEN TAKEN BY REDUX: ', token);
      console.log('AUTH USER TAKEN BY REDUX: ', user);

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      if (user) {
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }
      return {token, user};
    } catch (error: any) {
      console.log(error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Login failed',
      );
    }
  },
);

export const loadToken = createAsyncThunk(
  'auth/loadToken',
  async (_, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      let user = null;
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (userData) {
        user = JSON.parse(userData);
      }
      return {token, user};
    } catch (error) {
      return thunkAPI.rejectWithValue('Failed to load authentication data');
    }
  },
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, thunkAPI) => {
    try {
      // Since axios interceptor adds the token, we don't need to manually add it here
      const response = await axios.post('/auth/logout');

      if (response.data.success) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_USER_KEY);
      }

      return {success: true};
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Logout failed',
      );
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearErrors: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Login cases
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

      // Load token cases
      .addCase(loadToken.pending, state => {
        state.loading = true;
      })
      .addCase(loadToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = !!(action.payload.token && action.payload.user);
        state.loading = false;
      })
      .addCase(loadToken.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout cases
      .addCase(logoutUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(logoutUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {clearErrors} = authSlice.actions;
export default authSlice.reducer;
