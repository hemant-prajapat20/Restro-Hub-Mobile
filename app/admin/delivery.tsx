import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import api from '../../utils/api';
import { io, Socket } from 'socket.io-client';

export default function DeliveryScreen() {
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<'Active' | 'Completed'>('Active');

  // Modals
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [selectedManageOrder, setSelectedManageOrder] = useState<any>(null);

  // Form states for New Order
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedItems, setSelectedItems] = useState<{item: any, quantity: number}[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for Managing
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchMenu();

    const socketUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://192.168.1.100:5000';
    const socket = io(socketUrl);
    socket.on('newOrder', (order: any) => {
      if (order.type === 'Delivery') {
        fetchOrders();
        Alert.alert('New Delivery Order', `Order ${order._id.slice(-4)} received!`);
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/orders?type=Delivery');
      const mapped = res.data.map((order: any) => ({
        ...order,
        id: 'DEL-' + order._id.slice(-4).toUpperCase(),
        itemsStr: order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', '),
        time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(order.createdAt).toLocaleDateString(),
      }));
      setDeliveryOrders(mapped);
    } catch (e) {
      console.log('Error fetching delivery orders', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu');
      setMenu(res.data);
    } catch (e) {}
  };

  const handleCreateOrder = async () => {
    if (selectedItems.length === 0 || !newCustomerName || !newCustomerPhone) {
      Alert.alert('Validation Error', 'Please enter customer details and select items');
      return;
    }
    setIsCreating(true);
    const subtotal = selectedItems.reduce((acc, current) => acc + (current.item.price * current.quantity), 0);
    const tax = Math.round(subtotal * 0.05);

    try {
      await api.post('/orders', {
        type: 'Delivery',
        source: 'Direct',
        customerDetails: { name: newCustomerName, phone: newCustomerPhone },
        items: selectedItems.map(si => ({
          menuItem: si.item._id,
          name: si.item.name,
          quantity: si.quantity,
          price: si.item.price
        })),
        subtotal,
        tax,
        total: subtotal + tax,
        status: 'In Kitchen'
      });
      setShowAddOrder(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setSelectedItems([]);
      fetchOrders();
    } catch (e) {
      Alert.alert('Error', 'Failed to create order');
    } finally {
      setIsCreating(false);
    }
  };

  const updateStatus = async (status: string, details?: any) => {
    if (!selectedManageOrder) return;
    setIsUpdating(true);
    try {
      const payload: any = { status };
      if (details) payload.driverDetails = details;
      const res = await api.put(`/orders/${selectedManageOrder._id}`, payload);
      setSelectedManageOrder((prev: any) => ({ ...prev, status: res.data.status, driverDetails: res.data.driverDetails }));
      fetchOrders();
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const verifyOtp = async () => {
    if (!selectedManageOrder || otpInput.length !== 4) return;
    setIsVerifying(true);
    try {
      await api.post(`/orders/${selectedManageOrder._id}/verify-otp`, { otp: otpInput });
      Alert.alert('Success', 'OTP Verified & Order Completed');
      setSelectedManageOrder(null);
      setOtpInput('');
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleItem = (item: any) => {
    setSelectedItems(prev => {
      const ex = prev.find(i => i.item._id === item._id);
      if (ex) {
        return prev.map(i => i.item._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const activeOrders = deliveryOrders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
  const completedOrders = deliveryOrders.filter(o => o.status === 'Completed');
  const pendingOrders = deliveryOrders.filter(o => o.status === 'Pending');

  const displayOrders = feedTab === 'Active' ? activeOrders : completedOrders;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconBox}><Text style={{fontSize: 24}}>🛍️</Text></View>
        <View style={{flex: 1}}>
          <Text style={styles.headerTitle}>Delivery & Online</Text>
          <Text style={styles.headerSub}>Manage cloud kitchen and aggregator orders</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddOrder(true)}>
          <Text style={styles.addBtnText}>+ New Order</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 16 }}>
        {/* KPI Overview (Replaces the large sidebar from web) */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiBoxPending}>
            <Text style={styles.kpiBoxTitle}>Pending</Text>
            <Text style={styles.kpiBoxValue}>{pendingOrders.length}</Text>
          </View>
          <View style={styles.kpiBoxCompleted}>
            <Text style={styles.kpiBoxTitleCompleted}>Completed Today</Text>
            <Text style={styles.kpiBoxValueCompleted}>{completedOrders.length}</Text>
          </View>
        </View>

        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Live Feed</Text>
          <View style={styles.feedTabs}>
            <TouchableOpacity 
              style={[styles.feedTab, feedTab === 'Active' && styles.feedTabActive]}
              onPress={() => setFeedTab('Active')}
            >
              <Text style={[styles.feedTabText, feedTab === 'Active' && styles.feedTabTextActive]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.feedTab, feedTab === 'Completed' && styles.feedTabActive]}
              onPress={() => setFeedTab('Completed')}
            >
              <Text style={[styles.feedTabText, feedTab === 'Completed' && styles.feedTabTextActive]}>Completed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#C5A059" style={{ marginTop: 40 }} />
        ) : displayOrders.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#94A3B8' }}>No {feedTab.toLowerCase()} delivery orders.</Text>
        ) : (
          displayOrders.map(order => (
            <TouchableOpacity 
              key={order._id} 
              style={styles.orderCard}
              onPress={() => {
                setSelectedManageOrder(order);
                setDriverName(order.driverDetails?.name || '');
                setDriverPhone(order.driverDetails?.phone || '');
                setOtpInput('');
              }}
            >
              <View style={styles.cardTop}>
                <View style={[styles.sourceIcon, order.source === 'Zomato' ? { backgroundColor: '#FEF2F2' } : order.source === 'Swiggy' ? { backgroundColor: '#FFF7ED' } : { backgroundColor: '#EFF6FF' }]}>
                  <Text style={{ color: order.source === 'Zomato' ? '#DC2626' : order.source === 'Swiggy' ? '#EA580C' : '#2563EB', fontWeight: '800' }}>
                    {order.source[0]}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.orderId}>{order.id}</Text>
                    <Text style={styles.orderTime}>{order.time}</Text>
                  </View>
                  <Text style={styles.orderItems} numberOfLines={2}>{order.itemsStr}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderTotal}>₹{order.total}</Text>
                  <View style={[styles.statusBadge, order.status === 'Completed' ? styles.statusSuccess : styles.statusInfo]}>
                    <Text style={[styles.statusText, order.status === 'Completed' ? styles.statusSuccessText : styles.statusInfoText]}>{order.status}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{height: 100}} />
      </ScrollView>

      {/* Add Order Modal */}
      <Modal visible={showAddOrder} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Delivery Order</Text>
              <TouchableOpacity onPress={() => setShowAddOrder(false)}><Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll}>
              <View style={{flexDirection: 'row', gap: 12}}>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Customer Name</Text>
                  <TextInput style={styles.input} placeholder="John Doe" value={newCustomerName} onChangeText={setNewCustomerName} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput style={styles.input} placeholder="9876543210" keyboardType="numeric" value={newCustomerPhone} onChangeText={setNewCustomerPhone} />
                </View>
              </View>
              
              <Text style={styles.label}>Menu Items</Text>
              <View style={styles.menuList}>
                {menu.map(item => {
                  const selected = selectedItems.find(i => i.item._id === item._id);
                  return (
                    <View key={item._id} style={styles.menuItem}>
                      <View style={{flex: 1}}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        {selected && <Text style={styles.menuItemQty}>x{selected.quantity}</Text>}
                        <TouchableOpacity style={styles.menuAddBtn} onPress={() => toggleItem(item)}>
                          <Text style={{color: '#fff', fontWeight: 'bold'}}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddOrder(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateOrder} disabled={isCreating}>
                {isCreating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Confirm & Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Order Modal */}
      <Modal visible={!!selectedManageOrder} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage {selectedManageOrder?.id}</Text>
              <TouchableOpacity onPress={() => setSelectedManageOrder(null)}><Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text></TouchableOpacity>
            </View>
            <View style={{padding: 20}}>
              <Text style={{fontWeight: '700', color: '#64748B', marginBottom: 12}}>
                Status: <Text style={{color: '#C5A059'}}>{selectedManageOrder?.status}</Text>
              </Text>

              {/* Status Buttons */}
              <View style={styles.statusBtnGroup}>
                <TouchableOpacity 
                  disabled={selectedManageOrder?.status === 'Completed'}
                  onPress={() => updateStatus('In Kitchen')}
                  style={[styles.statusBtn, selectedManageOrder?.status === 'In Kitchen' && styles.statusBtnActive]}
                >
                  <Text style={[styles.statusBtnTxt, selectedManageOrder?.status === 'In Kitchen' && styles.statusBtnTxtActive]}>In Kitchen</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  disabled={selectedManageOrder?.status === 'Completed'}
                  onPress={() => updateStatus('Ready')}
                  style={[styles.statusBtn, selectedManageOrder?.status === 'Ready' && styles.statusBtnActive]}
                >
                  <Text style={[styles.statusBtnTxt, selectedManageOrder?.status === 'Ready' && styles.statusBtnTxtActive]}>Ready</Text>
                </TouchableOpacity>
              </View>

              <View style={{marginTop: 16}}>
                <Text style={styles.label}>Assign Driver</Text>
                <TextInput 
                  style={[styles.input, {marginBottom: 8}]} 
                  placeholder="Driver Name" 
                  value={driverName} 
                  onChangeText={setDriverName}
                  editable={selectedManageOrder?.status !== 'Completed'} 
                />
                <TextInput 
                  style={[styles.input, {marginBottom: 8}]} 
                  placeholder="Driver Phone" 
                  keyboardType="numeric" 
                  value={driverPhone} 
                  onChangeText={setDriverPhone}
                  editable={selectedManageOrder?.status !== 'Completed'} 
                />
                <TouchableOpacity 
                  disabled={selectedManageOrder?.status === 'Completed' || isUpdating}
                  onPress={() => {
                    if (!driverName || !driverPhone) {
                      Alert.alert('Error', 'Enter Driver Details'); return;
                    }
                    updateStatus('Out for Delivery', { name: driverName, phone: driverPhone });
                  }}
                  style={styles.outForDeliveryBtn}
                >
                  <Text style={styles.outForDeliveryTxt}>Out for Delivery</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.otpBox}>
                <Text style={styles.otpTitle}>Verify Delivery (OTP)</Text>
                <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
                  <TextInput 
                    style={styles.otpInput} 
                    placeholder="XXXX" 
                    maxLength={4} 
                    keyboardType="number-pad"
                    value={otpInput}
                    onChangeText={setOtpInput}
                    editable={selectedManageOrder?.status !== 'Completed'}
                  />
                  <TouchableOpacity 
                    style={[styles.verifyBtn, (otpInput.length !== 4 || selectedManageOrder?.status === 'Completed') && {opacity: 0.5}]}
                    onPress={verifyOtp}
                    disabled={otpInput.length !== 4 || selectedManageOrder?.status === 'Completed' || isVerifying}
                  >
                    {isVerifying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.verifyBtnTxt}>Verify</Text>}
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  iconBox: { width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  addBtn: { backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },

  kpiContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiBoxPending: { flex: 1, backgroundColor: '#0F172A', padding: 16, borderRadius: 16 },
  kpiBoxTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  kpiBoxValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  kpiBoxCompleted: { flex: 1, backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  kpiBoxTitleCompleted: { color: '#059669', fontSize: 12, fontWeight: '700' },
  kpiBoxValueCompleted: { color: '#047857', fontSize: 28, fontWeight: '900', marginTop: 4 },

  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  feedTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  feedTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 8 },
  feedTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  feedTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  feedTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  feedTabTextActive: { color: '#0F172A' },

  orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  sourceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  orderId: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  orderTime: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
  orderItems: { fontSize: 12, color: '#475569', marginTop: 4 },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  statusSuccess: { backgroundColor: '#ECFDF5' },
  statusInfo: { backgroundColor: '#EFF6FF' },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  statusSuccessText: { color: '#059669' },
  statusInfoText: { color: '#2563EB' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalContentSmall: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  formScroll: { padding: 20 },
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },

  menuList: { borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  menuItemPrice: { fontSize: 10, color: '#64748B', fontWeight: '800' },
  menuItemQty: { fontSize: 12, fontWeight: '800', color: '#6366F1' },
  menuAddBtn: { backgroundColor: '#0F172A', padding: 8, borderRadius: 8 },

  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },

  statusBtnGroup: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 12 },
  statusBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  statusBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statusBtnTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  statusBtnTxtActive: { color: '#0F172A' },
  outForDeliveryBtn: { backgroundColor: '#0F172A', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  outForDeliveryTxt: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  otpBox: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  otpTitle: { color: '#16A34A', fontSize: 12, fontWeight: '800' },
  otpInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, textAlign: 'center', fontSize: 18, fontWeight: '900', letterSpacing: 8 },
  verifyBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  verifyBtnTxt: { color: '#fff', fontWeight: '800' }
});
