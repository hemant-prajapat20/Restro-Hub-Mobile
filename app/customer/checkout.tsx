import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { clearCart, addToCart, removeFromCart } from '../../store/slices/cartSlice';

// Helper to format numbers as currency
// Helper to format numbers as currency
const formatCurrency = (value: number) => {
  return `₹${value.toFixed(2)}`;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartBusinessId = useSelector((state: RootState) => state.cart.businessId);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Online' | 'Cash on Delivery'>('Online');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerName, setCustomerName] = useState(currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');

  // Fetch saved addresses
  const { data: addressesResponse, isLoading: addressesLoading } = useQuery({
    queryKey: ['customerAddresses'],
    queryFn: () => api.get('/customer-orders/addresses').then(res => res.data),
    enabled: !!currentUser,
  });

  // Fetch business info (for delivery fee & tax set by owner)
  const { data: businessData } = useQuery({
    queryKey: ['publicMenu', cartBusinessId],
    queryFn: () => api.get(`/customer-orders/menu/${cartBusinessId}`).then(res => res.data),
    enabled: !!cartBusinessId,
  });

  const businessInfo = businessData?.business || {};
  const addresses = addressesResponse?.data || [];

useEffect(() => {
  if (addresses.length > 0 && !selectedAddressId) {
    const defaultAddr = addresses.find((addr: any) => addr.isDefault) || addresses[0];
    setSelectedAddressId(defaultAddr._id);
  }
}, [addresses]);

  // Calculate totals — delivery fee & tax rate come from business settings
  const subtotal = cartItems.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  const taxRate = businessInfo.taxRate ?? 0.05; // From business settings, fallback 5%
  const tax = subtotal * taxRate;
  const deliveryFee = businessInfo.deliveryFee ?? 0; // From business settings, fallback 0
  const total = subtotal + tax + deliveryFee;

  const startRazorpayPayment = async (totalAmount: number): Promise<string> => {
    try {
      const orderRes = await api.post('/payment/create-order', {
        amount: totalAmount,
        receipt: `receipt_${Date.now()}`
      });
      
      const orderData = orderRes.data;
      if (orderData.status !== 'success') {
        throw new Error(orderData.message || 'Failed to initialize payment');
      }

      const { id: order_id, amount, currency } = orderData.data;

      return new Promise<string>((resolve, reject) => {
        const options = {
          description: 'RestroHub Order Payment',
          image: 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png',
          currency,
          key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YourKeyIdHere',
          amount: amount.toString(),
          name: 'RestroHub POS',
          order_id,
          prefill: {
            email: currentUser?.email || 'customer@example.com',
            contact: customerPhone || '9999999999',
            name: customerName || 'Walk-in Customer'
          },
          theme: { color: '#D4AF37' }
        };

        RazorpayCheckout.open(options).then(async (data: any) => {
          try {
            const verifyRes = await api.post('/payment/verify', {
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature
            });
            if (verifyRes.data.status === 'success') {
              resolve(data.razorpay_payment_id);
            } else {
              reject(new Error('Payment verification failed'));
            }
          } catch (err) {
            reject(err);
          }
        }).catch((error: any) => {
          reject(error);
        });
      });
    } catch (err: any) {
      console.error('Razorpay Init Error:', err);
      Alert.alert('Payment Error', err.message || 'Payment initialization failed');
      return '';
    }
  };

  const handleProceed = () => {
    if (!selectedAddressId) {
      Alert.alert('Select Address', 'Please select a delivery address before proceeding.');
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter both name and mobile number.');
      return;
    }

    let paymentId = 'COD';
    
    if (paymentMethod === 'Online') {
      try {
        paymentId = await startRazorpayPayment(total);
        if (!paymentId) return; // cancelled or failed
      } catch (err: any) {
        Alert.alert('Payment Failed', err.message || 'Unknown error');
        try {
          await api.post('/customer-orders/payment-failed', {
            amount: total,
            reason: err.description || err.message || 'User cancelled'
          });
        } catch (e) {}
        return;
      }
    }

    setIsPlacingOrder(true);
    try {
      await api.post('/customer-orders/order', {
        items: cartItems.map(ci => ({ productId: ci.item._id, quantity: ci.quantity, price: ci.item.price })),
        addressId: selectedAddressId,
        paymentId,
        paymentMethod,
        customerDetails: {
          name: customerName,
          phone: customerPhone
        },
        subtotal,
        tax,
        deliveryFee,
        total,
      });
      setShowPaymentModal(false);
      dispatch(clearCart());
      Alert.alert('Success', 'Your order has been placed!', [{ text: 'OK', onPress: () => router.replace('/customer/past_orders') }]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Your cart is empty.</Text>
        <TouchableOpacity onPress={() => router.replace('/customer')}>
          <Text style={styles.link}>Start Ordering</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/customer/saved_addresses')}>
            <Text style={{ color: '#64748B', fontWeight: '600', fontSize: 13 }}>+ Add</Text>
          </TouchableOpacity>
          {!isChangingAddress && addresses.length > 0 && (
            <TouchableOpacity onPress={() => setIsChangingAddress(true)}>
              <Text style={{ color: '#D4AF37', fontWeight: '600' }}>Change</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {addressesLoading ? (
          <ActivityIndicator size="small" color="#D4AF37" />
        ) : addresses.length === 0 ? (
          <View style={styles.emptyAddressContainer}>
            <Text style={styles.emptyAddressText}>No delivery address saved.</Text>
            <TouchableOpacity onPress={() => router.push('/customer/saved_addresses')}>
              <Text style={styles.addAddressLink}>Add Delivery Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.addressList}>
            {isChangingAddress ? (
              <>
                {addresses.map((addr: any) => (
                  <TouchableOpacity 
                    key={addr._id} 
                    style={[styles.addressItem, selectedAddressId === addr._id && styles.addressSelected]} 
                    onPress={() => {
                      setSelectedAddressId(addr._id);
                      setIsChangingAddress(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.addressText}>{addr.label || 'Home'}</Text>
                      {selectedAddressId === addr._id && <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />}
                    </View>
                    <Text style={styles.addressSub}>{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={{ padding: 12, borderWidth: 1, borderColor: '#D4AF37', borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center' }}
                  onPress={() => router.push('/customer/saved_addresses')}
                >
                  <Ionicons name="add" size={20} color="#D4AF37" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#D4AF37', fontWeight: '600' }}>Add New Address</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Show only selected
              addresses.filter((a: any) => a._id === selectedAddressId).map((addr: any) => (
                <View key={addr._id} style={[styles.addressItem, styles.addressSelected]}>
                  <Text style={styles.addressText}>{addr.label || 'Home'}</Text>
                  <Text style={styles.addressSub}>{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</Text>
                </View>
              ))
            )}
          </View>
        )}

      <View style={styles.cartHeaderRow}>
        <Text style={styles.sectionTitle}>Cart Items</Text>
        <TouchableOpacity onPress={() => router.push(`/customer?businessId=${cartBusinessId}`)}>
          <Text style={styles.addMoreLink}>+ Add More Items</Text>
        </TouchableOpacity>
      </View>
      {cartItems.map((item: any) => (
        <View key={item.item._id} style={styles.cartItem}>
          {item.item.image && <Image source={{ uri: item.item.image }} style={styles.itemImage} />}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.item.name}</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity onPress={() => dispatch(removeFromCart({ itemId: item.item._id }))} style={styles.qtyBtn}>
                <Ionicons name="remove" size={16} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.itemQty}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => dispatch(addToCart({ businessId: cartBusinessId || '', businessName: '', item: item.item }))} style={styles.qtyBtn}>
                <Ionicons name="add" size={16} color="#1E293B" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.itemPrice}>{formatCurrency(item.item.price * item.quantity)}</Text>
        </View>
      ))}

      <View style={styles.totalsBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
          <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Delivery Fee</Text>
          <Text style={styles.totalValue}>{formatCurrency(deliveryFee)}</Text>
        </View>
        <View style={styles.totalRowBold}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.payButton} onPress={handleProceed}>
        <Text style={styles.payButtonText}>Proceed</Text>
      </TouchableOpacity>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Your Order</Text>
            
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Enter your name" />
            
            <Text style={styles.inputLabel}>Mobile Number *</Text>
            <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="Enter mobile number" keyboardType="phone-pad" />
            
            <Text style={styles.inputLabel}>Payment Method *</Text>
            <View style={styles.paymentMethodsRowSmall}>
              <TouchableOpacity 
                style={[styles.paymentMethodCardSmall, paymentMethod === 'Online' && styles.paymentMethodSelectedSmall]}
                onPress={() => setPaymentMethod('Online')}
              >
                <Ionicons name="card" size={20} color={paymentMethod === 'Online' ? '#D4AF37' : '#94A3B8'} />
                <Text style={[styles.paymentMethodTextSmall, paymentMethod === 'Online' && styles.paymentMethodTextSelectedSmall]}>Online</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.paymentMethodCardSmall, paymentMethod === 'Cash on Delivery' && styles.paymentMethodSelectedSmall]}
                onPress={() => setPaymentMethod('Cash on Delivery')}
              >
                <Ionicons name="cash" size={20} color={paymentMethod === 'Cash on Delivery' ? '#16A34A' : '#94A3B8'} />
                <Text style={[styles.paymentMethodTextSmall, paymentMethod === 'Cash on Delivery' && styles.paymentMethodTextSelectedSmall]}>COD</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmOrder} disabled={isPlacingOrder}>
                {isPlacingOrder ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Confirm Order</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8, marginTop: 12 },
  addressList: { marginBottom: 12 },
  addressItem: { padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 8 },
  addressSelected: { borderColor: '#D4AF37', backgroundColor: '#FFFBEB' },
  addressText: { fontWeight: '600', color: '#1E293B' },
  addressSub: { color: '#64748B', marginTop: 2, fontSize: 12 },
  emptyAddressContainer: { padding: 12, alignItems: 'center', marginBottom: 12 },
  emptyAddressText: { color: '#64748B', fontSize: 16, marginBottom: 8 },
  addAddressLink: { color: '#D4AF37', fontWeight: '600' },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemImage: { width: 56, height: 56, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  itemQty: { marginHorizontal: 12, fontSize: 14, fontWeight: '700', color: '#1E293B' },
  itemPrice: { fontWeight: '700', color: '#1E293B', fontSize: 16 },
  cartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginTop: 12 },
  addMoreLink: { color: '#D4AF37', fontWeight: '700', fontSize: 14, marginTop: 12 },
  totalsBox: { marginTop: 16, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FEF08A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalRowBold: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6 },
  totalLabel: { fontWeight: '600', color: '#1E293B' },
  totalValue: { fontWeight: '600', color: '#1E293B' },
  payButton: { marginTop: 20, backgroundColor: '#D4AF37', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payButtonText: { color: '#1E293B', fontSize: 16, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  emptyText: { fontSize: 18, color: '#64748B', marginBottom: 12 },
  link: { color: '#D4AF37', fontWeight: '600', fontSize: 16 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: '#1E293B' },
  paymentMethodsRowSmall: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  paymentMethodCardSmall: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, alignItems: 'center', backgroundColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  paymentMethodSelectedSmall: { borderColor: '#D4AF37', backgroundColor: '#FFFBEB' },
  paymentMethodTextSmall: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  paymentMethodTextSelectedSmall: { color: '#1E293B' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: 16 },
  confirmBtn: { flex: 2, padding: 14, borderRadius: 8, backgroundColor: '#D4AF37', alignItems: 'center' },
  confirmBtnText: { color: '#1E293B', fontWeight: '700', fontSize: 16 },
});
