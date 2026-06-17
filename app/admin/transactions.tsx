import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../../utils/api';
import { io, Socket } from 'socket.io-client';

export default function TransactionsScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data || []);
    } catch (err) {
      console.log('Failed to fetch orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const socketUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://192.168.1.100:5000';
    const socket: Socket = io(socketUrl);

    socket.on('newOrder', () => {
      fetchOrders();
    });
    
    socket.on('orderUpdated', () => {
      fetchOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const historyOrders = orders.filter((o: any) => o.status === 'Completed' || o.status === 'Cancelled' || o.status === 'Served');
  
  const filteredOrders = historyOrders.filter((inv: any) => {
    const invId = inv._id || inv.id || '';
    return invId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customerDetails?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Served') return { bg: '#D1FAE5', text: '#059669' };
    if (status === 'Cancelled') return { bg: '#FEE2E2', text: '#DC2626' };
    return { bg: '#FEF3C7', text: '#D97706' };
  };

  const getTypeColor = () => {
    return { bg: '#DBEAFE', text: '#2563EB' }; // Blue for all module types for simplicity as per web
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerBox}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>📄</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Order Management</Text>
          <Text style={styles.headerSub}>Manage active orders and historical transactions</Text>
        </View>
      </View>

      <View style={styles.contentCard}>
        <View style={styles.contentHeader}>
          <Text style={styles.sectionTitle}>Past Transactions</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Order ID or Customer..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
          ) : filteredOrders.length === 0 ? (
            <Text style={styles.emptyText}>No orders found</Text>
          ) : (
            filteredOrders.map((order: any) => {
              const invId = order._id || order.id || '';
              const shortId = order.transactionId ? order.transactionId : (invId ? invId.slice(-8).toUpperCase() : 'N/A');
              const statusStyle = getStatusColor(order.status);
              const typeStyle = getTypeColor();

              return (
                <View key={invId} style={styles.orderCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderIdText}>#{shortId}</Text>
                      <Text style={styles.dateText}>
                        {new Date(order.createdAt || order.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.text }]}>{order.status}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBodyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labelText}>CUSTOMER</Text>
                      <Text style={styles.valueTextBold}>{order.customerDetails?.name || 'Walk-in Customer'}</Text>
                      <Text style={styles.valueTextDim}>{order.customerDetails?.phone || 'N/A'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.labelText}>MODULE</Text>
                      <View style={[styles.badge, { backgroundColor: typeStyle.bg }]}>
                        <Text style={[styles.badgeText, { color: typeStyle.text }]}>{order.type}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.totalText}>Total Amount</Text>
                    <Text style={styles.totalAmount}>₹{(order.total || order.amount || 0).toLocaleString()}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  headerBox: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  iconBox: { width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  contentCard: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  contentHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0F172A' },

  listContainer: { padding: 16, gap: 16, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 40, fontWeight: '600' },

  orderCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  orderIdText: { fontSize: 14, fontWeight: '700', color: '#6366F1', marginBottom: 4 },
  dateText: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardBodyRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  labelText: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 4, letterSpacing: 0.5 },
  valueTextBold: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  valueTextDim: { fontSize: 11, fontWeight: '600', color: '#64748B' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  totalText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
});
