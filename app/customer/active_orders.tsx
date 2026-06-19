import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import { RootState } from '../../store';

const getStatusProgress = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 33;
    case 'preparing':
    case 'in kitchen': return 66;
    case 'ready': return 80;
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

  useEffect(() => {
    const socket = io(process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://192.168.1.5:5000');
    socket.on('orderStatusUpdated', () => refetch());
    return () => { socket.disconnect(); };
  }, [refetch]);

  const allOrders = data?.data || [];
  const activeOrders = allOrders.filter((order: any) => 
    !['Completed', 'Cancelled', 'Delivered'].includes(order.status)
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
        <Text style={styles.emptySubtitle}>You don't have any orders running right now.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.listContainer}>
        {activeOrders.map((order: any) => (
          <View key={order._id} style={styles.orderCard}>
            
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.logoContainer}>
                  {order.businessId?.logoUrl ? (
                    <Image source={{ uri: order.businessId.logoUrl }} style={styles.logo} />
                  ) : (
                    <Ionicons name="restaurant" size={24} color="#94A3B8" />
                  )}
                </View>
                <View>
                  <Text style={styles.businessName}>{order.businessId?.name || 'Restaurant'}</Text>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={12} color="#D4AF37" />
                    <Text style={styles.timeText}>
                      {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>● {order.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.totalText}>₹{order.total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Progress Row */}
            <View style={styles.progressRow}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelActive}>Order Placed</Text>
                <Text style={order.status.toLowerCase() !== 'pending' ? styles.progressLabelActive : styles.progressLabel}>Preparing</Text>
                <Text style={order.status === 'Out for Delivery' ? styles.progressLabelActiveGold : styles.progressLabel}>
                  <Ionicons name="bicycle" size={12} color={order.status === 'Out for Delivery' ? "#D4AF37" : "#94A3B8"} /> On the way
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${getStatusProgress(order.status)}%` }]} /> 
              </View>
            </View>

            {/* Delivery Details Box */}
            <View style={styles.detailsBox}>
              <View style={styles.detailsRow}>
                <View>
                  <Text style={styles.detailsLabel}>ORDER ID</Text>
                  <Text style={styles.detailsValueBold}>#{order.transactionId || order._id.substring(order._id.length-8).toUpperCase()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailsLabel}>PAYMENT</Text>
                  <Text style={styles.detailsValueBold}>{order.paymentMethod || 'Online'}</Text>
                </View>
              </View>
              
              <Text style={[styles.detailsLabel, { marginTop: 16, marginBottom: 8 }]}>DELIVERY DETAILS</Text>
              <View style={styles.deliveryDetailRow}>
                <Ionicons name="person" size={12} color="#1E293B" style={{ marginRight: 6 }} />
                <Text style={styles.deliveryDetailText}>
                  <Text style={{ fontWeight: '700', color: '#1E293B' }}>{order.customerDetails?.name || user?.firstName} </Text>
                  <Text style={{ color: '#94A3B8' }}>({order.customerDetails?.phone || user?.phone})</Text>
                </Text>
              </View>
              <View style={styles.deliveryDetailRow}>
                <Ionicons name="location" size={12} color="#D4AF37" style={{ marginRight: 6 }} />
                <Text style={styles.deliveryDetailText}>{order.customerDetails?.address || 'Address not provided'}</Text>
              </View>
            </View>

            {/* Items Row */}
            <View style={styles.itemsRow}>
              {order.items?.map((item: any, idx: number) => (
                <View key={idx} style={styles.itemPill}>
                  <Text style={styles.itemPillText}>{item.quantity}x {item.menuItem?.name || item.name}</Text>
                </View>
              ))}
            </View>

            {/* Action Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.btnTrack}>
                <Text style={styles.btnTrackText}>Track Driver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnContact}>
                <Text style={styles.btnContactText}>Contact Restaurant</Text>
              </TouchableOpacity>
            </View>

            {/* OTP Box */}
            {order.deliveryOtp && (
              <View style={styles.otpBox}>
                <Text style={styles.otpHeader}>DELIVERY VERIFICATION OTP</Text>
                <Text style={styles.otpNumber}>{order.deliveryOtp.split('').join(' ')}</Text>
                <Text style={styles.otpSub}>Give this PIN to your driver when they arrive</Text>
              </View>
            )}

            {/* Driver Details Box */}
            {order.driverDetails?.name && (
              <View style={styles.driverBox}>
                <Text style={styles.driverBoxHeader}>Driver Details</Text>
                <Text style={styles.driverDetailText}>Name: <Text style={{ fontWeight: '700' }}>{order.driverDetails.name}</Text></Text>
                <Text style={styles.driverDetailText}>Phone: <Text style={{ fontWeight: '700' }}>{order.driverDetails.phone}</Text></Text>
              </View>
            )}

          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingText: { color: '#64748B', marginTop: 16, fontSize: 15, fontWeight: '500' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(212, 175, 55, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  listContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F1F5F9', overflow: 'hidden', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  logo: { width: '100%', height: '100%', resizeMode: 'cover' },
  businessName: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#64748B', marginLeft: 4, fontWeight: '500' },
  
  headerRight: { alignItems: 'flex-end' },
  statusBadge: { backgroundColor: '#D4AF37', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginBottom: 8 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  totalText: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  
  progressRow: { marginBottom: 24 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  progressLabelActive: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  progressLabelActiveGold: { fontSize: 12, fontWeight: '700', color: '#D4AF37' },
  progressBarContainer: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
  
  detailsBox: { backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9', padding: 16, marginBottom: 16 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailsLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  detailsValueBold: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  deliveryDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  deliveryDetailText: { fontSize: 13, color: '#64748B' },
  
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  itemPill: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  itemPillText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btnTrack: { flex: 1, backgroundColor: '#FFFBEB', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnTrackText: { color: '#D4AF37', fontWeight: '800', fontSize: 13 },
  btnContact: { flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnContactText: { color: '#1E293B', fontWeight: '800', fontSize: 13 },
  
  otpBox: { backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, alignItems: 'center', marginBottom: 16 },
  otpHeader: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 12 },
  otpNumber: { fontSize: 28, fontWeight: '900', color: '#1E293B', letterSpacing: 6, marginBottom: 12 },
  otpSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  
  driverBox: { backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 16 },
  driverBoxHeader: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  driverDetailText: { fontSize: 13, color: '#64748B', marginBottom: 4 },
});
