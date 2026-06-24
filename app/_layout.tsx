import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalStateProvider } from './admin/context/GlobalState';
import { LogBox } from 'react-native';
import axios from 'axios';

LogBox.ignoreLogs([
  'ProgressBarAndroid has been extracted',
  'SafeAreaView has been deprecated',
  'Clipboard has been extracted',
  'PushNotificationIOS has been extracted'
]);
// Initialize QueryClient outside the component to prevent recreation on every render.
// Configured with 5-minute staleTime for aggressive caching and faster transitions.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
      gcTime: 1000 * 60 * 15,   // Keep unused data in memory for 15 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    // ⚡ PRE-WARMING: Ping the Render free tier server immediately when the app launches.
    // This wakes up the backend in the background while the user is typing their credentials!
    axios.get('https://restro-hub-0fmy.onrender.com/api').catch(() => {});
  }, []);

  return (
    <Provider store={store}>
      <GlobalStateProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="customer" />
          </Stack>
        </QueryClientProvider>
      </GlobalStateProvider>
    </Provider>
  );
}

