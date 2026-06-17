import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  businessId?: string;
  outletId?: string;
  phone?: string;
  businessData?: any;
  profilePhoto?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      // TODO: Implement @react-native-async-storage/async-storage for persistence
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // TODO: Implement @react-native-async-storage/async-storage for persistence
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
