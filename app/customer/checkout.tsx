import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
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
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

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
        items: cartItems.map(ci => ({ productId: ci.item._id, quantity: ci.quantity, price: ci.item.price })),
        addressId: selectedAddressId,
        paymentId,
        subtotal,
        tax,
        deliveryFee,
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
        ) : addresses.length === 0 ? (
          <View style={styles.emptyAddressContainer}>
            <Text style={styles.emptyAddressText}>No delivery address saved.</Text>
            <TouchableOpacity onPress={() => router.push('/customer/saved_addresses')}>
              <Text style={styles.addAddressLink}>Add Delivery Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((addr: any) => (
              <TouchableOpacity key={addr._id} style={[styles.addressItem, selectedAddressId === addr._id && styles.addressSelected]} onPress={() => setSelectedAddressId(addr._id)}>
                <Text style={styles.addressText}>{addr.label || 'Home'}</Text>
                <Text style={styles.addressSub}>{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</Text>
              </TouchableOpacity>
            ))}
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

      <TouchableOpacity style={styles.payButton} onPress={placeOrder} disabled={isPlacingOrder}>
        {isPlacingOrder ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.payButtonText}>Proceed</Text>}
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
  cartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
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
});
