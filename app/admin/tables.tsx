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
  Alert
} from 'react-native';
import api from '../../utils/api';
import { useQueryClient } from '@tanstack/react-query';

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
  const [modalTab, setModalTab] = useState<'checkout' | 'add_items'>('checkout');
  const [searchQuery, setSearchQuery] = useState('');
  
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
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, mRes, oRes] = await Promise.all([
        api.get('/tables'),
        api.get('/menu'),
        api.get('/orders')
      ]);
      setTables(tRes.data.map((t: any) => ({ ...t, id: t._id || t.id })));
      setMenuItems(mRes.data.data || mRes.data);
      setDbOrders(oRes.data.filter((o: any) => o.status !== 'Completed' && o.status !== 'Cancelled' && o.type !== 'Delivery'));
    } catch (e) {
      console.log('Error fetching table data', e);
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
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddTableModal(true)}>
          <Text style={styles.addBtnTxt}>+ Add Table</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {isLoading ? <ActivityIndicator size="large" color="#C5A059" /> : floorTables.map(table => {
          const colors = getStatusColor(table.status);
          const total = computeTotal(table._id);
          const itemsCount = getCombinedItems(table._id).reduce((s, i) => s + i.quantity, 0);

          return (
            <TouchableOpacity 
              key={table._id} 
              style={[styles.tableCard, selectedTableId === table._id && { borderColor: '#C5A059', borderWidth: 2 }]}
              onPress={() => setSelectedTableId(table._id)}
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
        <View style={{height: 100}} />
      </ScrollView>

      {/* Table Management Modal */}
      <Modal visible={!!selectedTableId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Table #{selectedTable?.number}</Text>
                <Text style={{color: '#64748B', fontSize: 12, fontWeight: '700'}}>Status: {selectedTable?.status}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedTableId(null); setModalTab('checkout'); }}><Text style={{fontSize: 24, color: '#94A3B8'}}>×</Text></TouchableOpacity>
            </View>

            <View style={styles.modalTabs}>
              <TouchableOpacity style={[styles.mTab, modalTab === 'checkout' && styles.mTabActive]} onPress={() => setModalTab('checkout')}>
                <Text style={[styles.mTabTxt, modalTab === 'checkout' && styles.mTabTxtActive]}>Checkout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mTab, modalTab === 'add_items' && styles.mTabActive]} onPress={() => setModalTab('add_items')}>
                <Text style={[styles.mTabTxt, modalTab === 'add_items' && styles.mTabTxtActive]}>Add Items</Text>
              </TouchableOpacity>
            </View>

            {modalTab === 'checkout' && (
              <ScrollView style={{ padding: 16 }}>
                {combinedItems.length === 0 ? (
                  <Text style={{textAlign: 'center', color: '#94A3B8', marginTop: 40}}>No items ordered yet.</Text>
                ) : (
                  <View>
                    <View style={styles.billItems}>
                      {combinedItems.map((item: any) => (
                        <View key={item.itemId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ flex: 1, fontSize: 12, color: '#0F172A', fontWeight: '700' }}>{item.quantity}x {item.name} {!item.isSent && '(Unsent)'}</Text>
                          <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '800' }}>₹{item.price * item.quantity}</Text>
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

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 }}>
                      <TouchableOpacity style={[styles.actBtn, {backgroundColor: '#0F172A'}]} onPress={handleSendToKitchen}>
                        <Text style={{color: '#fff', fontWeight: '800', fontSize: 12}}>Send KOT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actBtn, {backgroundColor: '#10B981', flex: 2}]} onPress={handleSettle}>
                        <Text style={{color: '#fff', fontWeight: '800', fontSize: 12}}>Settle Bill</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
  
  modalTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
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
