import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Image } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { RootState } from '../../store';

export default function CustomerLayout() {
  const router = useRouter();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notificationsResponse, refetch: refetchNotifications } = useQuery({
    queryKey: ['customerNotifications'],
    queryFn: () => api.get('/customer-orders/notifications').then(res => res.data),
    enabled: !!currentUser,
    refetchInterval: 30000 // Poll every 30s
  });

  const notifications = notificationsResponse?.data || [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  useEffect(() => {
    // Connect to backend websocket
    const socketUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl); 
    
    socket.on('newCustomerNotification', (notif: any) => {
      if (notif.customerId === currentUser?._id) {
        refetchNotifications();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  const handleReadNotification = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await api.put(`/customer-orders/notifications/${notif._id}/read`);
        refetchNotifications();
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
  };

  const HeaderTitle = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name="restaurant" size={24} color="#D4AF37" />
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 }}>
        Restro<Text style={{ color: '#D4AF37' }}>Hub</Text>
      </Text>
    </View>
  );

  const HeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
      <TouchableOpacity 
        style={{ padding: 4, marginRight: 8 }} 
        onPress={() => setShowNotifications(true)}
      >
        <Ionicons name="notifications-outline" size={26} color="#1E293B" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ padding: 4 }} 
        onPress={() => router.push('/customer/profile')}
      >
        {currentUser?.profilePhoto ? (
          <Image 
            source={{ uri: currentUser.profilePhoto }} 
            style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#D4AF37' }} 
          />
        ) : (
          <Ionicons name="person-circle-outline" size={28} color="#1E293B" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitle: () => <HeaderTitle />,
          headerRight: () => <HeaderRight />,
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            elevation: 0,
            shadowOpacity: 0,
          },
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
            tabBarIcon: ({ color }) => <Ionicons name="search" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="active_orders"
          options={{
            title: 'Live Track',
            tabBarLabel: 'Active',
            tabBarIcon: ({ color }) => <Ionicons name="time" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="past_orders"
          options={{
            title: 'Order History',
            tabBarLabel: 'History',
            tabBarIcon: ({ color }) => <Ionicons name="receipt" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="saved_addresses"
          options={{
            title: 'My Addresses',
            tabBarLabel: 'Addresses',
            tabBarIcon: ({ color }) => <Ionicons name="location" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="checkout"
          options={{
            title: 'Checkout',
            tabBarLabel: 'Checkout',
            tabBarIcon: ({ color }) => <Ionicons name="cash-outline" size={22} color={color} />,
          }}
        />
      </Tabs>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {notifications.length > 0 ? (
                notifications.map((notif: any) => (
                  <TouchableOpacity 
                    key={notif._id}
                    style={[styles.notifItem, !notif.isRead && styles.notifUnread]}
                    onPress={() => handleReadNotification(notif)}
                  >
                    <View style={styles.notifIconContainer}>
                      <Ionicons 
                        name={notif.type === 'order' ? 'cart' : notif.type === 'booking' ? 'calendar' : 'information-circle'} 
                        size={20} 
                        color="#D4AF37" 
                      />
                    </View>
                    <View style={styles.notifTextContainer}>
                      <Text style={[styles.notifTitle, !notif.isRead && styles.notifTitleUnread]}>
                        {notif.title}
                      </Text>
                      <Text style={styles.notifMessage}>{notif.message}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    </View>
                    {!notif.isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyNotifs}>
                  <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyNotifsText}>No notifications yet</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  modalBody: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'center',
  },
  notifUnread: {
    backgroundColor: '#FDFBF7', // Very light gold/yellow tint
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifTextContainer: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: '#1E293B',
  },
  notifMessage: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4AF37',
    marginLeft: 8,
  },
  emptyNotifs: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyNotifsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
