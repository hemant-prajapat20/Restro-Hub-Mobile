import React from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalStateProvider } from './admin/context/GlobalState';
export default function RootLayout() {
  const queryClient = new QueryClient();
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

