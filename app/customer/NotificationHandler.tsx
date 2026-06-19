import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

export default function NotificationHandler() {
  useEffect(() => {
    // Expo Go does not support expo-notifications remote push.
    // Skip notification setup in managed Expo Go environment.
    if (Constants.appOwnership === 'expo') {
      console.log('Running in Expo Go – notifications disabled');
      return;
    }

    // Request permissions on iOS
    (async () => {
      if (Platform.OS === 'ios') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Push notifications permission not granted');
          return;
        }
      }
      // Get expo push token (only works in development builds or standalone apps)
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo push token:', token);
      // You may send this token to your backend to register for notifications
    })();

    // Listener for foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Foreground notification received:', notification);
      }
    );

    // Listener for when user interacts with notification (tap)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return null; // No UI needed
}
