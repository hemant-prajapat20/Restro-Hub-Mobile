import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Vibration
} from 'react-native';
import api from '../../utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

export default function TablesScreen() {
  const [activeFloor, setActiveFloor] = useState(1);
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Local table orders (unsent items)
  const [tableOrders, setTableOrders] = useState<Record<string, any[]>>({});

  // Modals & States
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'checkout' | 'add_items' | 'split'>('checkout');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reservations
  const [reservations, setReservations] = useState<any[]>([]);
  const [showAddReservationModal, setShowAddReservationModal] = useState(false);
  const [newResName, setNewResName] = useState('');
  const [newResPhone, setNewResPhone] = useState('');
  const [newResGuests, setNewResGuests] = useState('2');
  const [newResTime, setNewResTime] = useState('19:00');

  // Merge / Split
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedMergeTables, setSelectedMergeTables] = useState<string[]>([]);
  const [splitWays, setSplitWays] = useState('2');
  
  // Billing
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash'|'UPI'|'Online'>('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Add table modal
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableIdentifier, setNewTableIdentifier] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  useEffect(() => {
    fetchData();
    const socketUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://192.168.1.100:5000';
    const socket = io(socketUrl);
    
    socket.on('newOrder', () => { fetchData(); Vibration.vibrate([0, 100, 100, 100]); });
    socket.on('orderUpdated', () => { fetchData(); });
    socket.on('tableUpdated', () => { fetchData(); });
    
    return () => { socket.disconnect(); };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, mRes, oRes, rRes] = await Promise.all([
        api.get('/tables'),
        api.get('/menu'),
        api.get('/orders'),
        api.get('/reservations')
      ]);
      setTables(tRes.data.map((t: any) => ({ ...t, id: t._id || t.id })));
      setMenuItems(mRes.data.data || mRes.data);
      setDbOrders(oRes.data.filter((o: any) => o.status !== 'Completed' && o.status !== 'Cancelled' && o.type !== 'Delivery'));
      setReservations(rRes.data.data || rRes.data);
    } catch (e) {

    } finally {
      setIsLoading(false);
    }
  };

  const getCombinedItems = (tableId: string) => {
    const local = tableOrders[tableId] || [];
    const db = dbOrders.filter(o => o.tableId?._id === tableId || o.tableId === tableId).flatMap(o => o.items.map((i: any) => ({
      itemId: i.menuItem?._id || i.menuItem || i._id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      isSent: true
    })));

    const merged: Record<string, any> = {};
    [...db, ...local.map(i => ({...i, isSent: false}))].forEach(item => {
      if (!merged[item.itemId]) {
        merged[item.itemId] = { ...item };
      } else {
        merged[item.itemId].quantity += item.quantity;
      }
    });
    return Object.values(merged);
  };

  const computeSubtotal = (tableId: string) => {
    return getCombinedItems(tableId).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const computeTax = (tableId: string) => Math.round(computeSubtotal(tableId) * 0.05);

  const computeTotal = (tableId: string) => {
    const sub = computeSubtotal(tableId);
    if (sub === 0) return 0;
    const dis = Math.round(sub * (appliedDiscount / 100));
    return sub + computeTax(tableId) - dis;
  };

  const addToOrder = (tableId: string, item: any) => {
    const t = tables.find(tb => tb._id === tableId);
    if (t && ['Available', 'Reserved', 'Cleaning'].includes(t.status)) {
      api.put(`/tables/${tableId}`, { status: 'Occupied' }).then(() => fetchData());
    }

    setTableOrders(prev => {
      const items = prev[tableId] || [];
      const mItemId = item._id || item.id;
      const exist = items.find(i => i.itemId === mItemId);
      if (exist) {
        return { ...prev, [tableId]: items.map(i => i.itemId === mItemId ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { ...prev, [tableId]: [...items, { itemId: mItemId, name: item.name, price: item.price, quantity: 1 }] };
    });
  };

  const removeFromOrder = (tableId: string, itemId: string) => {
    setTableOrders(prev => {
      const items = prev[tableId] || [];
      const exist = items.find(i => i.itemId === itemId);
      if (!exist) return prev;
      if (exist.quantity > 1) {
        return { ...prev, [tableId]: items.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i) };
      }
      return { ...prev, [tableId]: items.filter(i => i.itemId !== itemId) };
    });
  };

  const handleSendToKitchen = async () => {
    if (!selectedTableId) return;
    const local = tableOrders[selectedTableId] || [];
    if (local.length === 0) {
      Alert.alert('Info', 'No new items to send');
      return;
    }
    
    const subtotal = local.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax = Math.round(subtotal * 0.05);
    
    try {
      await api.post('/orders', {
        type: 'Dine-In',
        tableId: selectedTableId,
        items: local.map(i => ({ menuItem: i.itemId, name: i.name, quantity: i.quantity, price: i.price, status: 'Served' })),
        subtotal,
        tax,
        total: subtotal + tax,
        status: 'In Kitchen'
      });
      setTableOrders(prev => { const cp = {...prev}; delete cp[selectedTableId]; return cp; });
      fetchData();
      Alert.alert('Success', 'Order sent to kitchen!');
    } catch (e) {
      Alert.alert('Error', 'Failed to send order');
    }
  };

  const handleSettle = async () => {
    if (!selectedTableId) return;
    const total = computeTotal(selectedTableId);
    if (total === 0) return;

    try {
      const tableDbOrders = dbOrders.filter(o => o.tableId?._id === selectedTableId || o.tableId === selectedTableId);
      await Promise.all(tableDbOrders.map(o => api.delete(`/orders/${o._id}`)));

      const combined = getCombinedItems(selectedTableId);
      const subtotal = computeSubtotal(selectedTableId);

      await api.post('/orders', {
        type: 'Dine-In',
        tableId: selectedTableId,
        items: combined.map((i: any) => ({ menuItem: i.itemId, name: i.name, quantity: i.quantity, price: i.price, status: 'Served' })),
        subtotal,
        tax: computeTax(selectedTableId),
        total,
        paymentMethod,
        status: 'Completed',
        customerDetails: { name: customerName || 'Guest', phone: customerPhone || 'N/A' }
      });

      await api.put(`/tables/${selectedTableId}`, { status: 'Cleaning' });
      
      setTableOrders(prev => { const cp = {...prev}; delete cp[selectedTableId]; return cp; });
      setAppliedDiscount(0);
      setDiscountCode('');
      setCustomerName('');
      setCustomerPhone('');
      setSelectedTableId(null);
      fetchData();
      Alert.alert('Success', 'Bill settled successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to settle bill');
    }
  };

  const handleMerge = async () => {
    if (selectedMergeTables.length < 2) return;
    try {
      await api.post('/tables/merge', { primaryTableId: selectedMergeTables[0], secondaryTableIds: selectedMergeTables.slice(1) });
      Alert.alert('Success', 'Tables merged');
      setSelectedMergeTables([]);
      setIsMergeMode(false);
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to merge tables');
    }
  };

  const handleSplit = async () => {
    if (!selectedTableId) return;
    try {
      await api.post('/tables/split', { primaryTableId: selectedTableId });
      Alert.alert('Success', 'Tables split successfully');
      setModalTab('checkout');
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to split tables');
    }
  };

  const handleCreateReservation = async () => {
    if (!newResName || !newResPhone) return;
    try {
      await api.post('/reservations', {
        customerName: newResName,
        customerPhone: newResPhone,
        guests: Number(newResGuests),
        time: newResTime,
        date: new Date().toISOString()
      });
      Alert.alert('Success', 'Reservation created');
      setShowAddReservationModal(false);
      setNewResName('');
      setNewResPhone('');
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to create reservation');
    }
  };

  const handleAddTable = async () => {
    if (!newTableIdentifier) return;
    try {
      await api.post('/tables', {
        number: newTableIdentifier,
        capacity: Number(newTableCapacity),
        floor: activeFloor,
        status: 'Available'
      });
      setShowAddTableModal(false);
      setNewTableIdentifier('');
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to add table');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Available': return { bg: '#ECFDF5', text: '#059669' };
      case 'Occupied': return { bg: '#FEF2F2', text: '#DC2626' };
      case 'Reserved': return { bg: '#FEFCE8', text: '#CA8A04' };
      case 'Cleaning': return { bg: '#FFF7ED', text: '#EA580C' };
      case 'Billing': return { bg: '#EFF6FF', text: '#2563EB' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const floorTables = tables.filter(t => t.floor === activeFloor);
  const selectedTable = tables.find(t => t._id === selectedTableId);
  const combinedItems = selectedTableId ? getCombinedItems(selectedTableId) : [];
  const filteredMenu = menuItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <View style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.floorTabs}>
        <TouchableOpacity style={[styles.floorTab, activeFloor === 1 && styles.floorTabActive]} onPress={() => setActiveFloor(1)}>
          <Text style={[styles.floorTabText, activeFloor === 1 && styles.floorTabTextActive]}>Ground Floor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.floorTab, activeFloor === 2 && styles.floorTabActive]} onPress={() => setActiveFloor(2)}>
          <Text style={[styles.floorTabText, activeFloor === 2 && styles.floorTabTextActive]}>Rooftop</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <TouchableOpacity style={[styles.addBtn, {flex: 1}, isMergeMode && {backgroundColor: '#C5A059'}]} onPress={() => { setIsMergeMode(!isMergeMode); setSelectedMergeTables([]); }}>
          <Text style={styles.addBtnTxt}>{isMergeMode ? 'CANCEL MERGE' : 'MERGE TABLES'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addBtn, {flex: 1}]} onPress={() => setShowAddTableModal(true)}>
          <Text style={styles.addBtnTxt}>ADD TABLE</Text>
        </TouchableOpacity>
      </View>

      {isMergeMode && (
        <View style={{ backgroundColor: '#FEFCE8', padding: 16, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#CA8A04', marginBottom: 16 }}>
          <Text style={{ fontWeight: '800', color: '#CA8A04' }}>Merge Mode Active</Text>
          <Text style={{ fontSize: 12, color: '#A16207', marginBottom: 12 }}>Select the primary table, then secondary tables to link.</Text>
          
          {selectedMergeTables.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {selectedMergeTables.map((id, index) => {
                const t = floorTables.find(ft => ft._id === id);
                const isPrimary = index === 0;
                return (
                  <View key={id} style={{ 
                    backgroundColor: isPrimary ? '#CA8A04' : '#FEF08A', 
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    borderWidth: 1, borderColor: isPrimary ? '#A16207' : '#FDE047'
                  }}>
                    <Text style={{ 
                      color: isPrimary ? '#FFFFFF' : '#854D0E', 
                      fontSize: 12, fontWeight: '800' 
                    }}>
                      {isPrimary ? '👑 ' : ''}T{t?.number || '?'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity 
            disabled={selectedMergeTables.length < 2}
            style={{
              backgroundColor: '#C5A059', 
              opacity: selectedMergeTables.length < 2 ? 0.5 : 1,
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              width: '90%',
              marginTop: 8
            }}
            onPress={handleMerge}
          >
            <Text style={{color: '#FFFFFF', fontWeight: '900', fontSize: 18, letterSpacing: 0.5}}>MERGE {Math.max(selectedMergeTables.length, 2)} TABLES</Text>
``          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.grid}>
        {isLoading ? <ActivityIndicator size="large" color="#C5A059" /> : floorTables.map(table => {
          const colors = getStatusColor(table.status);
          const total = computeTotal(table._id);
          const itemsCount = getCombinedItems(table._id).reduce((s, i) => s + i.quantity, 0);

          return (
            <TouchableOpacity 
              key={table._id} 
              style={[
                styles.tableCard, 
                selectedTableId === table._id && !isMergeMode && { borderColor: '#C5A059', borderWidth: 2 },
                isMergeMode && selectedMergeTables.includes(table._id) && { borderColor: '#CA8A04', borderWidth: 2, backgroundColor: '#FEFCE8' }
              ]}
              onPress={() => {
                if (isMergeMode) {
                  if (table.status !== 'Available') { Alert.alert('Error', 'Only available tables can be merged'); return; }
                  setSelectedMergeTables(prev => prev.includes(table._id) ? prev.filter(id => id !== table._id) : [...prev, table._id]);
                } else {
                  if (table.status === 'Merged') { Alert.alert('Info', 'Manage this from its primary table.'); return; }
                  setSelectedTableId(table._id);
                }
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={styles.tableNum}>#{table.number}</Text>
                  <Text style={styles.tableCap}>👥 {table.capacity} Seater</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.badgeTxt, { color: colors.text }]}>{table.status}</Text>
                </View>
              </View>

              {(table.status === 'Occupied' || table.status === 'Billing') && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>₹{total}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>{itemsCount} items</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
        
        {/* Advanced Reservations Section */}
        <View style={{ padding: 20, marginTop: 16, width: '100%', backgroundColor: '#fff', borderRadius: 32, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, marginBottom: 20 }}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 8}}>
            <Text style={{fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1}} numberOfLines={1} adjustsFontSizeToFit>ADVANCED RESERVATIONS</Text>
            <TouchableOpacity style={{backgroundColor: '#C5A059', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20}} onPress={() => setShowAddReservationModal(true)}>
              <Text style={{color: '#fff', fontSize: 9, fontWeight: '800'}}>ADD RESERVATION</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{gap: 16}}>
            {reservations.length === 0 ? (
              <Text style={{textAlign: 'center', color: '#94A3B8', marginVertical: 20}}>No reservations found.</Text>
            ) : reservations.map((res: any) => (
              <View key={res._id || res.name} style={{flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9'}}>
                <View style={{width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{color: '#0F172A', fontWeight: '800', fontSize: 12}}>{res.time}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 14, fontWeight: '800', color: res.status === 'Confirmed' ? '#0F172A' : '#C5A059'}}>{res.customerName || res.name}</Text>
                  <Text style={{fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 4}}>{res.customerPhone || res.phone} • {res.guests} Guests • Table Tab {res.tableNumber || '-'} • Floor {res.floor || 1}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  {res.status === 'Confirmed' ? (
                    <View style={{paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ECFDF5', borderRadius: 12}}>
                      <Text style={{color: '#059669', fontSize: 9, fontWeight: '800'}}>CONFIRMED</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={{paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#10B981', borderRadius: 12}}
                      onPress={async () => {
                        await api.patch(`/reservations/${res._id}/status`, { status: 'Confirmed' });
                        fetchData();
                      }}
                    >
                      <Text style={{color: '#fff', fontSize: 9, fontWeight: '800'}}>CONFIRM</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* Table Management Modal */}
      <Modal visible={!!selectedTableId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
                <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{color: '#fff', fontSize: 18, fontWeight: '900'}}>#{selectedTable?.number}</Text>
                </View>
                <View>
                  <Text style={{fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4}}>Table Billing & POS</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <View style={[styles.badge, {backgroundColor: getStatusColor(selectedTable?.status || '').bg}]}>
                      <Text style={[styles.badgeTxt, {color: getStatusColor(selectedTable?.status || '').text}]}>{selectedTable?.status}</Text>
                    </View>
                    {selectedTable?.linkedTables?.length > 0 && (
                      <TouchableOpacity style={{backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}} onPress={handleSplit}>
                        <Text style={{fontSize: 8, fontWeight: '800', color: '#0F172A'}}>SPLIT TABLES</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={{fontSize: 10, fontWeight: '800', color: '#94A3B8'}}>• {selectedTable?.floor === 1 ? 'GROUND FLOOR' : 'ROOFTOP'}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center'}} onPress={() => { setSelectedTableId(null); setModalTab('checkout'); }}>
                <Text style={{fontSize: 20, color: '#94A3B8', fontWeight: '300'}}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={{paddingHorizontal: 20, paddingTop: 20}}>
              <View style={{flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 4, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9'}}>
                <TouchableOpacity style={{flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: modalTab === 'checkout' ? '#fff' : 'transparent', borderRadius: 12, shadowColor: modalTab === 'checkout' ? '#000' : 'transparent', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: modalTab === 'checkout' ? 2 : 0}} onPress={() => setModalTab('checkout')}>
                  <Text style={{fontSize: 10, fontWeight: '800', color: modalTab === 'checkout' ? '#0F172A' : '#94A3B8'}}>BILL & CHECKOUT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: modalTab === 'add_items' ? '#fff' : 'transparent', borderRadius: 12, shadowColor: modalTab === 'add_items' ? '#000' : 'transparent', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: modalTab === 'add_items' ? 2 : 0}} onPress={() => setModalTab('add_items')}>
                  <Text style={{fontSize: 10, fontWeight: '800', color: modalTab === 'add_items' ? '#0F172A' : '#94A3B8'}}>TAKE ORDER (+ MENU)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {modalTab === 'checkout' && (
              <ScrollView style={{ padding: 16 }}>
                {selectedTable?.status === 'Cleaning' && (
                  <View style={{backgroundColor: '#FFF7ED', padding: 16, borderRadius: 12, borderColor: '#FFEDD5', borderWidth: 1, marginBottom: 16}}>
                    <Text style={{fontSize: 12, fontWeight: '800', color: '#EA580C', textAlign: 'center'}}>SANITIZATION IN PROGRESS</Text>
                    <TouchableOpacity style={[styles.actBtn, {backgroundColor: '#EA580C', marginTop: 12}]} onPress={async () => {
                      await api.put(`/tables/${selectedTableId}`, { status: 'Available' });
                      setTableOrders(prev => { const cp = {...prev}; delete cp[selectedTableId!]; return cp; });
                      setSelectedTableId(null);
                      fetchData();
                    }}>
                      <Text style={{color: '#fff', fontWeight: '800', fontSize: 10}}>Complete Reset & Open Table</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedTable?.status === 'Reserved' && (
                  <View style={{backgroundColor: '#FEFCE8', padding: 16, borderRadius: 12, borderColor: '#FEF08A', borderWidth: 1, marginBottom: 16}}>
                    <Text style={{fontSize: 12, fontWeight: '800', color: '#CA8A04', textAlign: 'center'}}>TABLE RESERVED</Text>
                    <Text style={{fontSize: 10, color: '#A16207', textAlign: 'center', marginTop: 4}}>This table is locked by a reservation.</Text>
                  </View>
                )}

                {combinedItems.length === 0 ? (
                  <View style={{borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 24, padding: 32, alignItems: 'center', marginVertical: 20}}>
                    <Text style={{fontSize: 24, color: '#94A3B8', marginBottom: 12}}>🍽️</Text>
                    <Text style={{fontSize: 14, fontWeight: '800', color: '#64748B', marginBottom: 8}}>NO ACTIVE BILLING</Text>
                    <Text style={{fontSize: 10, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20, marginBottom: 20, lineHeight: 16}}>There are no items recorded yet. Choose "Take Order (+ Menu)" to register customers' dining dockets.</Text>
                    <TouchableOpacity style={{backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12}} onPress={() => setModalTab('add_items')}>
                      <Text style={{color: '#fff', fontSize: 10, fontWeight: '800'}}>TAKE TABLE ORDER</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.billItems}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8}}>
                        <Text style={{fontSize: 10, fontWeight: '800', color: '#64748B'}}>TABLE ORDER DOCKET</Text>
                        <TouchableOpacity onPress={() => {
                          setTableOrders(prev => { const cp = {...prev}; delete cp[selectedTableId!]; return cp; });
                          api.put(`/tables/${selectedTableId}`, { status: 'Available' }).then(fetchData);
                        }}>
                          <Text style={{fontSize: 10, fontWeight: '800', color: '#EF4444'}}>RESET ORDER</Text>
                        </TouchableOpacity>
                      </View>
                      {combinedItems.map((item: any) => (
                        <View key={item.itemId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                          <View style={{flex: 1}}>
                            <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '700' }}>{item.quantity}x {item.name} {!item.isSent && '(Unsent)'}</Text>
                          </View>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                            <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '800' }}>₹{item.price * item.quantity}</Text>
                            <TouchableOpacity onPress={() => {
                               setTableOrders(prev => {
                                 const items = prev[selectedTableId!] || [];
                                 return { ...prev, [selectedTableId!]: items.filter(i => i.itemId !== item.itemId) };
                               });
                            }}>
                              <Text style={{fontSize: 14, color: '#EF4444'}}>×</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={styles.billTotals}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                        <Text style={styles.billLbl}>Subtotal</Text>
                        <Text style={styles.billVal}>₹{selectedTableId ? computeSubtotal(selectedTableId) : 0}</Text>
                      </View>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                        <Text style={styles.billLbl}>Tax (5%)</Text>
                        <Text style={styles.billVal}>₹{selectedTableId ? computeTax(selectedTableId) : 0}</Text>
                      </View>
                      {appliedDiscount > 0 && (
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                          <Text style={[styles.billLbl, {color: '#10B981'}]}>Discount ({appliedDiscount}%)</Text>
                          <Text style={[styles.billVal, {color: '#10B981'}]}>-₹{Math.round((selectedTableId ? computeSubtotal(selectedTableId) : 0) * (appliedDiscount / 100))}</Text>
                        </View>
                      )}
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0'}}>
                        <Text style={[styles.billLbl, {fontSize: 16, color: '#0F172A'}]}>Total</Text>
                        <Text style={[styles.billVal, {fontSize: 18, color: '#C5A059'}]}>₹{selectedTableId ? computeTotal(selectedTableId) : 0}</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.label}>Discount Code</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput style={[styles.input, {flex: 1}]} placeholder="e.g. VIP25" value={discountCode} onChangeText={setDiscountCode} />
                        <TouchableOpacity style={styles.applyBtn} onPress={() => {
                          const code = discountCode.toUpperCase().trim();
                          if (code === 'VIP25') setAppliedDiscount(25);
                          else if (code === 'TASTY10') setAppliedDiscount(10);
                          else { setAppliedDiscount(0); Alert.alert('Invalid', 'Invalid promo code'); }
                        }}>
                          <Text style={{color: '#fff', fontWeight: '800'}}>Apply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.label}>Customer Details (Optional)</Text>
                      <TextInput style={[styles.input, {marginBottom: 8}]} placeholder="Name" value={customerName} onChangeText={setCustomerName} />
                      <TextInput style={styles.input} placeholder="Phone" keyboardType="numeric" value={customerPhone} onChangeText={setCustomerPhone} />
                    </View>

                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.label}>Payment Method</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['Cash', 'UPI', 'Online'].map(m => (
                          <TouchableOpacity key={m} style={[styles.payMethod, paymentMethod === m && styles.payMethodActive]} onPress={() => setPaymentMethod(m as any)}>
                            <Text style={[styles.payMethodTxt, paymentMethod === m && styles.payMethodTxtActive]}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
                
                <View style={{marginTop: 24, marginBottom: 40}}>
                  <Text style={{fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 12}}>LIFECYCLE MANAGEMENT</Text>
                  <View style={{flexDirection: 'row', gap: 8}}>
                    {['Available', 'Occupied', 'Reserved', 'Cleaning'].map(status => (
                      <TouchableOpacity key={status} style={{flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: selectedTable?.status === status ? '#0F172A' : '#E2E8F0', backgroundColor: selectedTable?.status === status ? '#0F172A' : '#fff', alignItems: 'center'}} onPress={async () => {
                        await api.put(`/tables/${selectedTableId}`, { status });
                        fetchData();
                      }}>
                        <Text style={{fontSize: 9, fontWeight: '800', color: selectedTable?.status === status ? '#fff' : '#64748B', textTransform: 'uppercase'}}>{status}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}

            {modalTab === 'add_items' && (
              <View style={{ flex: 1 }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Search menu..." 
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <ScrollView style={{ padding: 16 }}>
                  {filteredMenu.map(item => {
                    const lItems = selectedTableId ? tableOrders[selectedTableId] || [] : [];
                    const lq = lItems.find(i => i.itemId === item._id)?.quantity || 0;

                    return (
                      <View key={item._id} style={styles.menuRow}>
                        <View style={{flex: 1}}>
                          <Text style={{fontSize: 14, fontWeight: '800', color: '#0F172A'}}>{item.name}</Text>
                          <Text style={{fontSize: 10, color: '#64748B', fontWeight: '700'}}>₹{item.price}</Text>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                          {lq > 0 ? (
                            <>
                              <TouchableOpacity style={styles.circBtn} onPress={() => removeFromOrder(selectedTableId!, item._id)}>
                                <Text style={styles.circBtnTxt}>-</Text>
                              </TouchableOpacity>
                              <Text style={{fontWeight: '800'}}>{lq}</Text>
                              <TouchableOpacity style={styles.circBtn} onPress={() => addToOrder(selectedTableId!, item)}>
                                <Text style={styles.circBtnTxt}>+</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity style={styles.addMenuBtn} onPress={() => addToOrder(selectedTableId!, item)}>
                              <Text style={{color: '#C5A059', fontWeight: '800', fontSize: 10}}>ADD</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )
                  })}
                  <View style={{height: 100}} />
                </ScrollView>
              </View>
            )}
            
            <View style={{padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24}}>
              <TouchableOpacity style={{flex: 1, backgroundColor: '#EADDCA', paddingVertical: 14, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6}} onPress={handleSendToKitchen}>
                <Text style={{fontSize: 16}}>👨‍🍳</Text>
                <Text style={{color: '#fff', fontWeight: '900', fontSize: 10}}>SEND TO KITCHEN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex: 1, backgroundColor: '#A7F3D0', paddingVertical: 14, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6}} onPress={handleSettle}>
                <Text style={{fontSize: 16}}>✓</Text>
                <Text style={{color: '#fff', fontWeight: '900', fontSize: 10}}>COMPLETE BILLING</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Table Modal */}
      <Modal visible={showAddTableModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Table</Text>
              <TouchableOpacity onPress={() => setShowAddTableModal(false)}><Text style={{fontSize: 24, color: '#94A3B8'}}>×</Text></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={styles.label}>Identifier (e.g. T1)</Text>
              <TextInput style={styles.input} value={newTableIdentifier} onChangeText={setNewTableIdentifier} placeholder="T1" />
              <Text style={[styles.label, {marginTop: 12}]}>Capacity</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={newTableCapacity} onChangeText={setNewTableCapacity} placeholder="4" />
              
              <TouchableOpacity style={[styles.actBtn, {backgroundColor: '#C5A059', marginTop: 24}]} onPress={handleAddTable}>
                <Text style={{color: '#fff', fontWeight: '800'}}>Create Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Reservation Modal */}
      <Modal visible={showAddReservationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 500 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Reservation</Text>
              <TouchableOpacity onPress={() => setShowAddReservationModal(false)}><Text style={{fontSize: 24, color: '#94A3B8'}}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
                <Text style={styles.label}>Customer Name</Text>
                <TextInput style={[styles.input, {marginBottom: 12}]} value={newResName} onChangeText={setNewResName} placeholder="Jane Doe" />
                <Text style={styles.label}>Phone</Text>
                <TextInput style={[styles.input, {marginBottom: 12}]} keyboardType="numeric" value={newResPhone} onChangeText={setNewResPhone} placeholder="9876543210" />
                <View style={{flexDirection: 'row', gap: 12, marginBottom: 12}}>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>Guests</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={newResGuests} onChangeText={setNewResGuests} placeholder="2" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>Time</Text>
                    <TextInput style={styles.input} value={newResTime} onChangeText={setNewResTime} placeholder="19:00" />
                  </View>
                </View>
                <TouchableOpacity style={[styles.actBtn, {backgroundColor: '#0F172A', marginTop: 12, marginBottom: 40}]} onPress={handleCreateReservation}>
                  <Text style={{color: '#fff', fontWeight: '800'}}>Add Reservation</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  floorTabs: { flexDirection: 'row', padding: 16, gap: 8 },
  floorTab: { flex: 1, paddingVertical: 12, backgroundColor: '#E2E8F0', borderRadius: 12, alignItems: 'center' },
  floorTabActive: { backgroundColor: '#C5A059' },
  floorTabText: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  floorTabTextActive: { color: '#fff' },

  addBtn: { backgroundColor: '#0F172A', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  addBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12 },
  tableCard: { width: '45%', margin: '2.5%', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  tableNum: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  tableCap: { fontSize: 10, color: '#94A3B8', fontWeight: '800', marginTop: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  
  modalTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 4 },
  mTab: { paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  mTabActive: { borderBottomWidth: 2, borderBottomColor: '#C5A059' },
  mTabTxt: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  mTabTxtActive: { color: '#C5A059' },

  billItems: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  billTotals: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  billLbl: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  billVal: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },
  applyBtn: { backgroundColor: '#0F172A', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },

  payMethod: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center' },
  payMethodActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  payMethodTxt: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  payMethodTxtActive: { color: '#6366F1' },

  actBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  addMenuBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#FDF8F0', borderRadius: 8, borderWidth: 1, borderColor: '#C5A059' },
  circBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  circBtnTxt: { fontSize: 16, fontWeight: '800', color: '#0F172A' }
});
