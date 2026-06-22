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
  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'checkout'>('menu');
  
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

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const currentId = item.id || item._id;
      const existing = prev.find(i => i.itemId === currentId);
      if (existing) {
        return prev.map(i => i.itemId === currentId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: currentId as string, name: item.name, category: item.category, price: item.price, quantity: 1 }];
    });
    showToast(`✓ ${item.name} added`);
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
    setActiveTab('menu');
    setPaymentMethod(null);
    setCustomerName('');
    setCustomerPhone('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Item Added Toast ── */}
      {toastVisible && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}
      <View style={styles.tabHeader}>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'menu' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('menu')}
        >
          <Text style={[styles.tabText, activeTab === 'menu' && styles.tabTextActive]}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'cart' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('cart')}
        >
          <Text style={[styles.tabText, activeTab === 'cart' && styles.tabTextActive]}>
            Current Order ({cart.length})
          </Text>
        </TouchableOpacity>
        {activeTab === 'checkout' && (
          <TouchableOpacity style={[styles.tabBtn, styles.tabBtnActive]}>
             <Text style={[styles.tabText, styles.tabTextActive]}>Checkout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Menu Tab ── */}
      {activeTab === 'menu' && (
        <View style={{ flex: 1 }}>
          <View style={styles.filterBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu..."
              placeholderTextColor="#94A3B8"
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

          <ScrollView contentContainerStyle={styles.menuGrid}>
            <View style={styles.gridContainer}>
              {filteredItems.map((item, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.menuItemCard}
                  onPress={() => addToCart(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: item.image }} style={styles.menuItemImage} />
                    <View style={[styles.vegBadge, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                      <Text style={styles.vegText}>{item.isVeg ? 'VEG' : 'NON-VEG'}</Text>
                    </View>
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

          {cart.length > 0 && (
            <TouchableOpacity style={styles.bottomSummary} onPress={() => setActiveTab('cart')}>
              <View>
                <Text style={styles.bottomSummaryText}>{cart.length} Items</Text>
                <Text style={styles.bottomSummarySub}>View Cart</Text>
              </View>
              <Text style={styles.bottomSummaryTotal}>₹{total.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Cart Tab ── */}
      {activeTab === 'cart' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.cartList}>
            {cart.length === 0 ? (
              <View style={styles.emptyCartBox}>
                <Text style={styles.emptyCartTitle}>Your cart is empty.</Text>
                <Text style={styles.emptyCartSub}>Start adding items from the menu to create an order.</Text>
              </View>
            ) : (
              cart.map((item, i) => (
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
                  <Text style={styles.cartItemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.cartFooter}>
            <View style={styles.cartTotalsRow}>
              <Text style={styles.cartTotalsText}>Subtotal</Text>
              <Text style={styles.cartTotalsValue}>₹{subTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.cartTotalsRow}>
              <Text style={styles.cartTotalsHighlight}>KDS Sync Fee</Text>
              <Text style={styles.cartTotalsHighlight}>Incl.</Text>
            </View>
            <View style={[styles.cartTotalsRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, marginTop: 4 }]}>
              <Text style={styles.cartGrandTotalLabel}>Total Due</Text>
              <Text style={styles.cartGrandTotal}>₹{total.toFixed(2)}</Text>
            </View>

            <View style={styles.cartActions}>
              <TouchableOpacity 
                style={[styles.kotBtn, (cart.length === 0 || orderState !== 'idle') && { opacity: 0.5 }]}
                onPress={handleSendToKitchen}
                disabled={cart.length === 0 || orderState !== 'idle'}
              >
                <Text style={styles.kotBtnText}>
                  {orderState === 'sending' ? 'SENDING...' : 'KOT'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.payBtn, cart.length === 0 && { opacity: 0.5 }]}
                onPress={() => setActiveTab('checkout')}
                disabled={cart.length === 0}
              >
                <Text style={styles.payBtnText}>PAY BILL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Checkout Tab ── */}
      {activeTab === 'checkout' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutLabel}>Customer Details (Required)</Text>
            <TextInput
              style={styles.checkoutInput}
              placeholder="Customer Name"
              placeholderTextColor="#94A3B8"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextInput
              style={[styles.checkoutInput, customerPhone.length > 0 && customerPhone.length !== 10 && styles.inputError]}
              placeholder="Mobile Number (10 digits)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={10}
              value={customerPhone}
              onChangeText={(val) => setCustomerPhone(val.replace(/[^0-9]/g, ''))}
            />
            {customerPhone.length > 0 && customerPhone.length !== 10 && (
              <Text style={styles.errorText}>Must be exactly 10 digits</Text>
            )}

            <Text style={[styles.checkoutLabel, { marginTop: 16 }]}>Payment Method</Text>
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
              <Text style={styles.checkoutSummaryLabel}>Grand Total</Text>
              <Text style={styles.checkoutSummaryValue}>₹{total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.completePayBtn, (!paymentMethod || !customerName || customerPhone.length !== 10 || orderState === 'sending') && styles.disabledBtn]}
              onPress={handleProcessPayment}
              disabled={!paymentMethod || !customerName || customerPhone.length !== 10 || orderState === 'sending'}
            >
              <Text style={styles.completePayBtnText}>
                {orderState === 'sending' ? 'PROCESSING...' : 'COMPLETE PAYMENT'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#D4AF37' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#D4AF37', fontWeight: '700' },

  filterBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  categoryScroll: { flexDirection: 'row' },
  categoryBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  categoryBadgeActive: { backgroundColor: '#D4AF37' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  categoryTextActive: { color: '#fff' },

  menuGrid: { padding: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuItemCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  imageContainer: { position: 'relative', width: '100%', height: 120 },
  menuItemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  vegBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vegText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  menuItemInfo: { padding: 12 },
  menuItemName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  menuItemDesc: { fontSize: 11, color: '#64748B', marginBottom: 8 },
  menuItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuItemPrice: { fontSize: 15, fontWeight: '700', color: '#D4AF37' },
  addButton: { backgroundColor: '#F1F5F9', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { fontSize: 16, color: '#64748B', fontWeight: '800' },

  bottomSummary: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#0F172A', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  bottomSummaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSummarySub: { color: '#94A3B8', fontSize: 12 },
  bottomSummaryTotal: { color: '#10B981', fontSize: 20, fontWeight: '800' },

  cartList: { flex: 1, padding: 16 },
  emptyCartBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#F1F5F9', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyCartTitle: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  emptyCartSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cartItemName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  cartItemPrice: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, marginHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  qtyText: { fontSize: 14, fontWeight: '800', width: 24, textAlign: 'center', color: '#0F172A' },
  cartItemTotal: { fontSize: 15, fontWeight: '800', color: '#0F172A', width: 70, textAlign: 'right' },

  cartFooter: { backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cartTotalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cartTotalsText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  cartTotalsValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cartTotalsHighlight: { fontSize: 14, fontWeight: '700', color: '#D4AF37' },
  cartGrandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cartGrandTotal: { fontSize: 24, fontWeight: '800', color: '#D4AF37' },
  cartActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  kotBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },
  kotBtnText: { color: '#D4AF37', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  payBtn: { flex: 2, backgroundColor: '#D4AF37', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#D4AF37', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  checkoutCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  checkoutLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  checkoutInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: -10, marginBottom: 16, marginLeft: 4 },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  paymentMethodBtn: { flex: 1, minWidth: '45%', paddingVertical: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, alignItems: 'center', backgroundColor: '#F8FAFC' },
  paymentMethodBtnActive: { borderColor: '#D4AF37', backgroundColor: '#FFFBEB', borderWidth: 2 },
  paymentMethodText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  paymentMethodTextActive: { color: '#D4AF37' },
  checkoutSummary: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  checkoutSummaryLabel: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  checkoutSummaryValue: { fontSize: 24, fontWeight: '800', color: '#D4AF37' },
  completePayBtn: { backgroundColor: '#10B981', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  disabledBtn: { opacity: 0.5 },
  completePayBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  // Toast notification
  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
