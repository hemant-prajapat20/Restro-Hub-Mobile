import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import { RootState } from '../../store';

export default function PastOrders() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const { data, isLoading } = useQuery({
    queryKey: ['customerPastOrders'],
    queryFn: () => api.get('/customer-orders/my-orders').then(res => res.data),
    enabled: !!user,
  });

  const allOrders = data?.data || [];
  // Filter for Completed, Cancelled, Delivered
  const pastOrders = allOrders.filter((order: any) => 
    ['Completed', 'Cancelled', 'Delivered'].includes(order.status)
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Loading your history...</Text>
      </View>
    );
  }

  if (pastOrders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="receipt" size={48} color="#D4AF37" style={{ opacity: 0.5 }} />
        </View>
        <Text style={styles.emptyTitle}>No past orders</Text>
        <Text style={styles.emptySubtitle}>Looks like you haven't placed any orders yet. Discover top restaurants and place your first order!</Text>
        
        <TouchableOpacity 
          style={styles.exploreBtn}
          onPress={() => router.navigate('/customer')}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={styles.exploreBtnText}>Discover Restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Ionicons name="time" size={28} color="#D4AF37" />
        <Text style={styles.headerTitle}>Your Past Orders</Text>
      </View>

      <View style={styles.listContainer}>
        {pastOrders.map((order: any) => {
          const isExpanded = expandedOrders[order._id];
          const isCancelled = order.status === 'Cancelled';
          
          return (
            <View key={order._id} style={styles.orderCard}>
              
              <View style={styles.cardTop}>
                <View style={styles.logoContainer}>
                  {order.businessId?.logoUrl ? (
                    <Image source={{ uri: order.businessId.logoUrl }} style={styles.logo} />
                  ) : (
                    <Ionicons name="restaurant" size={24} color="#94A3B8" />
                  )}
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.businessName}>{order.businessId?.name || 'Unknown Restaurant'}</Text>
                  <Text style={styles.timeText}>
                    {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                  <Text style={styles.orderIdText}>
                    Order #{order.transactionId || order._id.substring(order._id.length - 8).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, isCancelled ? styles.statusBadgeRed : styles.statusBadgeGreen]}>
                  <Ionicons 
                    name={isCancelled ? "close-circle" : "checkmark-circle"} 
                    size={14} 
                    color={isCancelled ? "#DC2626" : "#16A34A"} 
                  />
                  <Text style={[styles.statusText, isCancelled ? styles.statusTextRed : styles.statusTextGreen]}>
                    {order.status}
                  </Text>
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.totalText}>₹{order.total.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => toggleExpand(order._id)} style={styles.expandBtn}>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Expandable Receipt Section */}
              {isExpanded && (
                <View style={styles.receiptContainer}>
                  <Text style={styles.receiptTitle}>Items Ordered</Text>
                  {order.items?.map((item: any, idx: number) => (
                    <View key={idx} style={styles.receiptItemRow}>
                      <View style={styles.receiptItemLeft}>
                        <Text style={styles.receiptItemQty}>{item.quantity}x</Text>
                        <Text style={styles.receiptItemName}>{item.menuItem?.name || item.name || 'Item'}</Text>
                      </View>
                      <Text style={styles.receiptItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.receiptDivider} />
                  
                  {/* Delivery & Payment Details */}
                  <View style={styles.extraDetailsContainer}>
                    {order.paymentMethod && (
                      <View style={styles.extraDetailRow}>
                        <Ionicons name="card-outline" size={16} color="#64748B" />
                        <Text style={styles.extraDetailText}>Paid via {order.paymentMethod}</Text>
                      </View>
                    )}
                    {order.customerDetails?.address && (
                      <View style={styles.extraDetailRow}>
                        <Ionicons name="location-outline" size={16} color="#64748B" />
                        <Text style={styles.extraDetailText} numberOfLines={2}>
                          Delivered to: {order.customerDetails.address}
                        </Text>
                      </View>
                    )}
                    {order.status === 'Out for Delivery' && order.driverDetails?.name && (
                      <View style={[styles.extraDetailRow, { backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, marginTop: 8, borderColor: '#FDE68A', borderWidth: 1, alignItems: 'flex-start' }]}>
                        <Ionicons name="bicycle" size={20} color="#D4AF37" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, color: '#92400E', fontWeight: '700' }}>Out for Delivery</Text>
                          <Text style={{ fontSize: 13, color: '#B45309', marginTop: 2, fontWeight: '500' }}>
                            Partner: {order.driverDetails.name}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#B45309', fontWeight: '500' }}>
                            Contact: {order.driverDetails.phone}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Total Paid</Text>
                    <Text style={styles.receiptTotalValue}>₹{order.total.toFixed(2)}</Text>
                  </View>
                </View>
              )}

            </View>
          );
        })}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 26,
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
    marginBottom: 2,
  },
  timeText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  orderIdText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeGreen: {
    backgroundColor: '#F0FDF4',
  },
  statusBadgeRed: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextGreen: {
    color: '#16A34A',
  },
  statusTextRed: {
    color: '#DC2626',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  expandBtn: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  receiptContainer: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptItemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  receiptItemQty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
    width: 24,
  },
  receiptItemName: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  receiptItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  receiptTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D4AF37',
  },
  extraDetailsContainer: {
    gap: 8,
  },
  extraDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extraDetailText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
});
