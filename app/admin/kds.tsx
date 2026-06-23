import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Vibration
} from 'react-native';
import api from '../../utils/api';
import { io, Socket } from 'socket.io-client';

export default function KDSScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedItems, setCompletedItems] = useState<Record<string, string[]>>({});
  
  const [prepModalVisible, setPrepModalVisible] = useState(false);
  const [prepTimeInput, setPrepTimeInput] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    const socketUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://192.168.1.100:5000';
    const socket = io(socketUrl);
    
    socket.on('newOrder', (order: any) => {
      fetchData();
      if (order && order.type !== 'Delivery') {
        Vibration.vibrate([0, 200, 100, 200]);
        Alert.alert('New Kitchen Order', `Order ${order._id ? order._id.slice(-4) : ''} received!`);
      }
    });
    socket.on('orderUpdated', () => {
      fetchData();
    });

    return () => { socket.disconnect(); };
  }, []);

  const fetchData = async () => {
    try {
      const [orderRes, settingsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/settings')
      ]);
      const activeOrders = orderRes.data.filter((o: any) => o.status !== 'Completed' && o.status !== 'Cancelled' && o.type !== 'Delivery');
      setOrders(activeOrders);
      setSettings(settingsRes.data.data || settingsRes.data);
    } catch (e) {

    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, prepTime?: number) => {
    try {
      const payload: any = { status };
      if (prepTime) payload.estimatedPrepTime = prepTime;
      await api.put(`/orders/${id}`, payload);
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleToggleItem = (orderId: string, itemId: string) => {
    setCompletedItems(prev => {
      const existing = prev[orderId] || [];
      if (existing.includes(itemId)) {
        return { ...prev, [orderId]: existing.filter(id => id !== itemId) };
      } else {
        return { ...prev, [orderId]: [...existing, itemId] };
      }
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }]}>
        <ActivityIndicator size="large" color="#C5A059" />
      </View>
    );
  }

  if (settings && settings.kdsWebhook === false) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 48 }}>🔌</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 16 }}>KDS Disabled</Text>
        <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 8 }}>
          The Kitchen Display System has been deactivated via System Controls. 
          Please use physical tickets or re-enable the KDS Webhook in settings.
        </Text>
      </View>
    );
  }

  const getStatusBorder = (status: string) => {
    switch(status) {
      case 'New':
      case 'Pending': return '#F97316';
      case 'In Kitchen':
      case 'Preparing': return '#C5A059';
      case 'Ready': return '#10B981';
      default: return '#334155';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 24 }}>👨‍🍳</Text>
          <Text style={styles.headerTitle}>Kitchen Display System</Text>
        </View>
        <View style={styles.queueBox}>
          <Text style={styles.queueLabel}>Queue</Text>
          <Text style={styles.queueValue}>{orders.length} Orders</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {orders.map(order => {
          const compItems = completedItems[order._id] || [];
          const borderColor = getStatusBorder(order.status);
          
          return (
            <View key={order._id} style={[styles.ticket, { borderColor }]}>
              {/* Ticket Header */}
              <View style={styles.ticketHeader}>
                <View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={[styles.badge, { backgroundColor: borderColor }]}>
                      <Text style={styles.badgeText}>{order.status}</Text>
                    </View>
                    {order.tableId && (
                      <View style={styles.tableBadge}>
                        <Text style={styles.tableBadgeText}>Table #{order.tableId.number || '0'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ticketId}>Order #{order._id.slice(-4)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.timeText}>⏱️ {order.estimatedPrepTime ? `${order.estimatedPrepTime} min` : 'Est: --'}</Text>
                  <Text style={styles.typeText}>{order.type}</Text>
                </View>
              </View>

              {/* Ticket Body */}
              <ScrollView style={styles.ticketBody}>
                {order.items.map((item: any, index: number) => {
                  const isComp = compItems.includes(item._id || item.menuItem);
                  return (
                    <TouchableOpacity 
                      key={item._id || item.menuItem} 
                      style={[styles.itemRow, isComp && styles.itemRowComp]}
                      onPress={() => handleToggleItem(order._id, item._id || item.menuItem)}
                    >
                      <View style={[styles.qtyBox, isComp && styles.qtyBoxComp]}>
                        <Text style={[styles.qtyText, isComp && { color: '#64748B' }]}>{item.quantity}x</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.itemName, isComp && styles.itemNameComp]}>{item.name}</Text>
                          {index === 0 && !isComp && (
                            <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: '#EF4444', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' }}>Priority</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View>
                        {isComp ? <Text style={{fontSize: 20}}>✅</Text> : <Text style={{fontSize: 20}}>⚪</Text>}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Ticket Footer */}
              <View style={styles.ticketFooter}>
                {['New', 'Pending'].includes(order.status) ? (
                  <TouchableOpacity 
                    style={styles.actionBtnPrimary}
                    onPress={() => {
                      setActiveOrderId(order._id);
                      setPrepTimeInput('');
                      setPrepModalVisible(true);
                    }}
                  >
                    <Text style={styles.actionBtnText}>Start Cooking</Text>
                  </TouchableOpacity>
                ) : ['Preparing', 'In Kitchen'].includes(order.status) ? (
                  <TouchableOpacity 
                    style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                    onPress={() => updateStatus(order._id, 'Ready')}
                  >
                    <Text style={styles.actionBtnText}>Mark As Ready</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.actionBtnPrimary, { backgroundColor: '#1E293B' }]}
                    onPress={() => updateStatus(order._id, 'Completed')}
                  >
                    <Text style={styles.actionBtnText}>Picked Up</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Prep Time Modal */}
      <Modal visible={prepModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Estimated Prep Time</Text>
            <Text style={styles.modalSub}>Enter time in minutes (e.g. 15)</Text>
            <TextInput
              style={styles.prepInput}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor="#94A3B8"
              value={prepTimeInput}
              onChangeText={setPrepTimeInput}
              autoFocus
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPrepModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.startBtn} 
                onPress={() => {
                  setPrepModalVisible(false);
                  if (activeOrderId) updateStatus(activeOrderId, 'In Kitchen', Number(prepTimeInput) || undefined);
                }}
              >
                <Text style={styles.startBtnText}>Start Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  queueBox: { alignItems: 'flex-end' },
  queueLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  queueValue: { color: '#C5A059', fontSize: 14, fontWeight: '800' },

  ticket: { width: 320, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  ticketHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tableBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tableBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  ticketId: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 8 },
  timeText: { color: '#94A3B8', fontSize: 12, fontWeight: '800', fontFamily: 'monospace' },
  typeText: { color: '#64748B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, textAlign: 'right' },

  ticketBody: { flex: 1, maxHeight: 400, padding: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 8, borderRadius: 12, marginBottom: 8 },
  itemRowComp: { backgroundColor: 'rgba(0,0,0,0.3)' },
  qtyBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  qtyBoxComp: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.05)' },
  qtyText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  itemName: { color: '#F8FAFC', fontWeight: '800', fontSize: 14 },
  itemNameComp: { color: '#64748B', textDecorationLine: 'line-through' },

  ticketFooter: { padding: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  actionBtnPrimary: { backgroundColor: '#C5A059', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub: { color: '#94A3B8', fontSize: 12, marginBottom: 16 },
  prepInput: { backgroundColor: '#0F172A', color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 24 },
  modalFooter: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#334155', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontWeight: '800' },
  startBtn: { flex: 1, backgroundColor: '#C5A059', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '800' },
});
