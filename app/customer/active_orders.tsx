import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import { RootState } from '../../store';

// Helper function to calculate progress percentage
const getStatusProgress = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 33;
    case 'preparing':
    case 'in kitchen': return 66;
    case 'ready': return 66;
    case 'out for delivery': return 100;
    case 'served': return 100;
    default: return 33;
  }
};

export default function ActiveOrders() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customerActiveOrders'],
    queryFn: () => api.get('/customer-orders/my-orders').then(res => res.data),
    enabled: !!user,
  });

  // Connect to Socket for live status updates
  useEffect(() => {
    // We assume your base API URL config is setup correctly inside your `api` utility, 
    // or we can fall back to standard local host for DEV
    const socket = io('http://192.168.1.5:5000'); // Ensure this matches your actual backend IP
    
    socket.on('orderStatusUpdated', () => {
      refetch(); // Invalidate and fetch latest statuses silently
    });

    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  const allOrders = data?.data || [];
  // Filter out Completed and Cancelled orders
  const activeOrders = allOrders.filter((order: any) => 
    !['Completed', 'Cancelled'].includes(order.status)
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Tracking your active orders...</Text>
      </View>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="bicycle" size={48} color="#D4AF37" style={{ opacity: 0.5 }} />
        </View>
        <Text style={styles.emptyTitle}>No active delivery</Text>
        <Text style={styles.emptySubtitle}>You don't have any orders running right now. Please search for a restaurant and place an order.</Text>
        
        <TouchableOpacity 
          style={styles.exploreBtn}
          onPress={() => router.navigate('/customer')}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={styles.exploreBtnText}>Search Restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Orders</Text>
      </View>

      <View style={styles.listContainer}>
        {activeOrders.map((order: any) => (
          <View key={order._id} style={styles.orderCard}>
            
            {/* Top Info Section */}
            <View style={styles.cardTop}>
              <View style={styles.logoContainer}>
                {order.businessId?.logoUrl ? (
                  <Image source={{ uri: order.businessId.logoUrl }} style={styles.logo} />
                ) : (
                  <Ionicons name="restaurant" size={24} color="#94A3B8" />
                )}
              </View>
              <View style={styles.cardHeaderInfo}>
                <Text style={styles.businessName}>{order.businessId?.name || 'Restaurant'}</Text>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={14} color="#D4AF37" />
                  <Text style={styles.timeText}>
                    Ordered at {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>
              </View>
              <View style={styles.totalBadge}>
                <Text style={styles.totalText}>₹{order.total}</Text>
              </View>
            </View>

            {/* Status Progress Section */}
            <View style={styles.statusSection}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusLabel}>Current Status</Text>
                <Text style={styles.statusValue}>{order.status}</Text>
              </View>
              
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${getStatusProgress(order.status)}%` }
                  ]} 
                />
              </View>
              
              <View style={styles.progressLabels}>
                <Text style={styles.progressStepText}>Placed</Text>
                <Text style={styles.progressStepText}>Preparing</Text>
                <Text style={styles.progressStepText}>Delivery</Text>
              </View>
            </View>

            {/* Actions & OTP Section */}
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="call" size={16} color="#475569" />
                <Text style={styles.actionBtnText}>Call Restaurant</Text>
              </TouchableOpacity>
              
              {order.deliveryOtp && (
                <View style={styles.otpContainer}>
                  <Text style={styles.otpLabel}>OTP:</Text>
                  <Text style={styles.otpValue}>{order.deliveryOtp}</Text>
                </View>
              )}
            </View>

          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    color: '#64748B',
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 4,
  },
  totalBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
  },
  statusSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37',
    textTransform: 'uppercase',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginRight: 6,
  },
  otpValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 2,
  },
});
