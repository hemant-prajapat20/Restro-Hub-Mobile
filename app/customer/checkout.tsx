import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { clearCart } from '../../store/slices/cartSlice';

// Helper to format numbers as currency
// Helper to format numbers as currency
const formatCurrency = (value: number) => {
  return `₹${value.toFixed(2)}`;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Fetch saved addresses
  const { data: addressesResponse, isLoading: addressesLoading } = useQuery({
    queryKey: ['customerAddresses'],
    queryFn: () => api.get('/customer-orders/addresses').then(res => res.data),
    enabled: !!currentUser,
  });

  const addresses = addressesResponse?.data || [];

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.05; // 5% tax – can be changed later based on user choice
  const tax = subtotal * taxRate;
  const deliveryFee = 2; // Fixed delivery fee – adjust as required
  const total = subtotal + tax + deliveryFee;

  // Mock Razorpay payment – replace with real SDK when ready
  const startRazorpayPayment = async () => {
    return new Promise<string>((resolve) => {
      Alert.alert(
        'Payment',
        `Pay ${formatCurrency(total)}?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
          { text: 'Pay', onPress: () => resolve('mock_payment_id_123') },
        ]
      );
    });
  };

  const placeOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Select Address', 'Please select a delivery address before proceeding.');
      return;
    }
    const paymentId = await startRazorpayPayment();
    if (!paymentId) return;
    setIsPlacingOrder(true);
    try {
      await api.post('/customer-orders/order', {
        items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity, price: item.price })),
        addressId: selectedAddressId,
        paymentId,
        total,
      });
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
      <Text style={styles.sectionTitle}>Delivery Address</Text>
      {addressesLoading ? (
        <ActivityIndicator size="small" color="#D4AF37" />
      ) : (
        <View style={styles.addressList}>
          {addresses.map((addr: any) => (
            <TouchableOpacity key={addr._id} style={[styles.addressItem, selectedAddressId === addr._id && styles.addressSelected]} onPress={() => setSelectedAddressId(addr._id)}>
              <Text style={styles.addressText}>{addr.title}</Text>
              <Text style={styles.addressSub}>{addr.line1}, {addr.city}, {addr.state}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Cart Items</Text>
      {cartItems.map((item: any) => (
        <View key={item.id} style={styles.cartItem}>
          {item.image && <Image source={{ uri: item.image }} style={styles.itemImage} />}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
          </View>
          <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
        </View>
      ))}

      <View style={styles.totalsBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax (5%)</Text>
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

      <TouchableOpacity style={styles.payButton} onPress={placeOrder} disabled={isPlacingOrder}>
        {isPlacingOrder ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.payButtonText}>Pay Now</Text>}
      </TouchableOpacity>
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
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemImage: { width: 48, height: 48, borderRadius: 4, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  itemQty: { color: '#64748B', fontSize: 12, marginTop: 2 },
  itemPrice: { fontWeight: '600', color: '#1E293B' },
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
});
