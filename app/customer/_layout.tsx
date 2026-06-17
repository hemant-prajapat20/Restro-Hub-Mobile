import React from 'react';
import { Tabs } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6366F1',
        },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#6366F1',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Restaurants',
          tabBarLabel: 'Explore',
        }}
      />
    </Tabs>
  );
}
