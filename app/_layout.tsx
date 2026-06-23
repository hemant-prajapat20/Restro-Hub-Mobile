import React from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalStateProvider } from './admin/context/GlobalState';

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

