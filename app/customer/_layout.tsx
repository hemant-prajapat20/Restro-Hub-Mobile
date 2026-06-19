import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
        },
        headerTitleStyle: {
          color: '#1E293B',
          fontWeight: '900',
        },
        headerTintColor: '#1E293B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="active_orders"
        options={{
          title: 'Live Track',
          tabBarLabel: 'Active',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>⏱️</Text>,
        }}
      />
      <Tabs.Screen
        name="past_orders"
        options={{
          title: 'Order History',
          tabBarLabel: 'History',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📜</Text>,
        }}
      />
      <Tabs.Screen
        name="saved_addresses"
        options={{
          title: 'My Addresses',
          tabBarLabel: 'Addresses',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📍</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
