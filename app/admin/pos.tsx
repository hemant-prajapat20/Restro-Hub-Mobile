import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import api from '../../utils/api';
import { useRouter } from 'expo-router';

export default function POSScreen() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [orderState, setOrderState] = useState<'idle' | 'sending' | 'submitted'>('idle');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await api.get('/menu');
      setMenuItems(response.data);
    } catch (err) {
      console.log('Failed to fetch menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery, menuItems]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const currentId = item.id || item._id;
      const existing = prev.find(i => i.itemId === currentId);
      if (existing) {
        return prev.map(i => i.itemId === currentId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: currentId as string, name: item.name, category: item.category, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.itemId === itemId);
      if (item && item.quantity > 1) {
        return prev.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.itemId !== itemId);
    });
  };

  const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const sgst = subTotal * 0.025;
  const cgst = subTotal * 0.025;
  const total = subTotal + sgst + cgst;

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    setOrderState('sending');
    try {
      await api.post('/orders', {
        type: 'POS',
        items: cart.map(c => ({
          menuItem: c.itemId,
          name: c.name,
          category: c.category || 'General',
          quantity: c.quantity,
          price: c.price
        })),
        subtotal: subTotal,
        tax: sgst + cgst,
        total: total,
        status: 'In Kitchen'
      });
      setOrderState('submitted');
      Alert.alert('Ticket Sent!', 'Order has been successfully synchronized with the Kitchen KDS.', [
        { text: 'Close & Next Order', onPress: handleResetOrder }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to send to kitchen.');
      setOrderState('idle');
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentMethod || !customerName.trim() || customerPhone.length !== 10) {
      Alert.alert('Error', 'Please fill all customer details and select a payment method.');
      return;
    }
    
    // Simulate payment delay for Razorpay/External
    setOrderState('sending');
    
    try {
      await api.post('/orders', {
        type: 'POS',
        items: cart.map(c => ({
          menuItem: c.itemId,
          name: c.name,
          category: c.category || 'General',
          quantity: c.quantity,
          price: c.price,
          status: 'Served'
        })),
        subtotal: subTotal,
        tax: sgst + cgst,
        total: total,
        paymentMethod: paymentMethod,
        status: 'Completed',
        customerDetails: { name: customerName, phone: customerPhone }
      });
      
      Alert.alert('Payment Successful!', 'Order completed.', [
        { text: 'New Order', onPress: handleResetOrder }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to process order.');
      setOrderState('idle');
    }
  };

  const handleResetOrder = () => {
    setCart([]);
    setOrderState('idle');
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setPaymentMethod(null);
    setCustomerName('');
    setCustomerPhone('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Filter & Search Bar ── */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.categoryBadge, activeCategory === cat && styles.categoryBadgeActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Menu Grid ── */}
      <ScrollView contentContainerStyle={styles.menuGrid}>
        <View style={styles.gridContainer}>
          {filteredItems.map((item, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.menuItemCard}
              onPress={() => addToCart(item)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.image }} style={styles.menuItemImage} />
              <View style={[styles.vegBadge, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                <Text style={styles.vegText}>{item.isVeg ? 'VEG' : 'NON-VEG'}</Text>
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.menuItemDesc} numberOfLines={1}>{item.description}</Text>
                <View style={styles.menuItemRow}>
                  <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                  <View style={styles.addButton}>
                    <Text style={styles.addButtonText}>+</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Bottom Cart Summary Bar ── */}
      {cart.length > 0 && !isCartOpen && !isCheckoutOpen && (
        <TouchableOpacity style={styles.bottomSummary} onPress={() => setIsCartOpen(true)}>
          <View>
            <Text style={styles.bottomSummaryText}>{cart.length} Items</Text>
            <Text style={styles.bottomSummarySub}>View Cart</Text>
          </View>
          <Text style={styles.bottomSummaryTotal}>₹{total.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* ── Cart Modal ── */}
      <Modal visible={isCartOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCartOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Current Order ({cart.length})</Text>
            <TouchableOpacity onPress={() => setIsCartOpen(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.cartList}>
            {cart.map((item, i) => (
              <View key={i} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>₹{item.price} each</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity onPress={() => removeFromCart(item.itemId)} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => addToCart({ id: item.itemId })} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.cartFooter}>
            <View style={styles.cartTotalsRow}>
              <Text style={styles.cartTotalsText}>Subtotal</Text>
              <Text style={styles.cartTotalsText}>₹{subTotal}</Text>
            </View>
            <View style={styles.cartTotalsRow}>
              <Text style={styles.cartTotalsText}>Total Due</Text>
              <Text style={styles.cartGrandTotal}>₹{total.toFixed(2)}</Text>
            </View>

            <View style={styles.cartActions}>
              <TouchableOpacity 
                style={[styles.kotBtn, orderState !== 'idle' && { opacity: 0.5 }]}
                onPress={handleSendToKitchen}
                disabled={orderState !== 'idle'}
              >
                <Text style={styles.kotBtnText}>
                  {orderState === 'sending' ? 'Sending...' : 'KOT'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.payBtn}
                onPress={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
              >
                <Text style={styles.payBtnText}>PAY BILL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Checkout Modal ── */}
      <Modal visible={isCheckoutOpen} animationType="fade" transparent={true}>
        <View style={styles.checkoutOverlay}>
          <View style={styles.checkoutCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setIsCheckoutOpen(false)}>
                <Text style={styles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.checkoutBody}>
              <Text style={styles.checkoutLabel}>Customer Details (Required)</Text>
              <TextInput
                style={styles.checkoutInput}
                placeholder="Customer Name"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={[styles.checkoutInput, customerPhone.length > 0 && customerPhone.length !== 10 && styles.inputError]}
                placeholder="Mobile Number (10 digits)"
                keyboardType="numeric"
                maxLength={10}
                value={customerPhone}
                onChangeText={(val) => setCustomerPhone(val.replace(/[^0-9]/g, ''))}
              />

              <Text style={styles.checkoutLabel}>Payment Method</Text>
              <View style={styles.paymentMethodsRow}>
                {['Cash', 'UPI', 'Card', 'Wallet'].map(method => (
                  <TouchableOpacity 
                    key={method}
                    style={[styles.paymentMethodBtn, paymentMethod === method && styles.paymentMethodBtnActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.paymentMethodText, paymentMethod === method && styles.paymentMethodTextActive]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.checkoutSummary}>
                <Text style={styles.cartTotalsText}>Grand Total</Text>
                <Text style={styles.cartGrandTotal}>₹{total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.completePayBtn, (!paymentMethod || !customerName || customerPhone.length !== 10) && styles.disabledBtn]}
                onPress={handleProcessPayment}
                disabled={!paymentMethod || !customerName || customerPhone.length !== 10 || orderState === 'sending'}
              >
                <Text style={styles.payBtnText}>
                  {orderState === 'sending' ? 'Processing...' : 'COMPLETE PAYMENT'}
                </Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  topBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 14 },
  categoryScroll: { flexDirection: 'row' },
  categoryBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  categoryBadgeActive: { backgroundColor: '#6366F1' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  categoryTextActive: { color: '#fff' },

  menuGrid: { padding: 8 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuItemCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  menuItemImage: { width: '100%', height: 120, resizeMode: 'cover' },
  vegBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vegText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  menuItemInfo: { padding: 12 },
  menuItemName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  menuItemDesc: { fontSize: 11, color: '#64748B', marginBottom: 8 },
  menuItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuItemPrice: { fontSize: 15, fontWeight: '700', color: '#6366F1' },
  addButton: { backgroundColor: '#F1F5F9', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { fontSize: 18, color: '#64748B', fontWeight: 'bold' },

  bottomSummary: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#0F172A', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  bottomSummaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSummarySub: { color: '#94A3B8', fontSize: 12 },
  bottomSummaryTotal: { color: '#10B981', fontSize: 20, fontWeight: '800' },

  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  closeBtn: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  
  cartList: { flex: 1, padding: 16 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  cartItemName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  cartItemPrice: { fontSize: 12, color: '#64748B' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, marginHorizontal: 12 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtyBtnText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  qtyText: { fontSize: 14, fontWeight: '700', width: 24, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '700', color: '#0F172A', width: 60, textAlign: 'right' },

  cartFooter: { backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cartTotalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cartTotalsText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  cartGrandTotal: { fontSize: 20, fontWeight: '800', color: '#6366F1' },
  cartActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  kotBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#6366F1', alignItems: 'center' },
  kotBtnText: { color: '#6366F1', fontSize: 16, fontWeight: '700' },
  payBtn: { flex: 2, backgroundColor: '#6366F1', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  checkoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  checkoutCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  checkoutBody: { padding: 20 },
  checkoutLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  checkoutInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 14 },
  inputError: { borderColor: '#EF4444' },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  paymentMethodBtn: { flex: 1, minWidth: '45%', paddingVertical: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center' },
  paymentMethodBtnActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  paymentMethodText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  paymentMethodTextActive: { color: '#6366F1' },
  checkoutSummary: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  completePayBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
});
