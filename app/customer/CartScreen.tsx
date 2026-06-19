import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { removeFromCart, addToCart } from '../../store/slices/cartSlice';

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cartState = useSelector((state: RootState) => state.cart);
  const totalCartItems = cartState.items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = cartState.items.reduce((acc, i) => acc + i.item.price * i.quantity, 0);

  const handleProceed = () => {
    router.push('/customer/address');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {cartState.items.map((ci) => (
          <View key={ci.item._id} style={styles.cartItemRow}>
            {ci.item.image ? (
              <Image source={{ uri: ci.item.image }} style={styles.itemImage} />
            ) : (
              <View style={styles.itemPlaceholder}>
                <Ionicons name="fast-food" size={24} color="#CBD5E1" />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{ci.item.name}</Text>
              <Text style={styles.itemPrice}>₹{ci.item.price}</Text>
            </View>
            <View style={styles.quantityControl}>
              <TouchableOpacity onPress={() => dispatch(removeFromCart({ itemId: ci.item._id }))} style={styles.qtyBtn}>
                <Ionicons name="remove" size={16} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{ci.quantity}</Text>
              <TouchableOpacity onPress={() => dispatch(addToCart({ businessId: ci.item.businessId, businessName: ci.item.businessName, item: ci.item }))} style={styles.qtyBtn}>
                <Ionicons name="add" size={16} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.itemTotal}>₹{ci.item.price * ci.quantity}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.subtotal}>Subtotal: ₹{subtotal}</Text>
        <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
          <Text style={styles.proceedBtnText}>Proceed to Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 20 },
  scroll: { flex: 1, marginHorizontal: 20 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  itemImage: { width: 60, height: 60, borderRadius: 8 },
  itemPlaceholder: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  itemPrice: { fontSize: 14, color: '#475569' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  qtyBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  qtyText: { fontSize: 14, fontWeight: '600', marginHorizontal: 4 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFF' },
  subtotal: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  proceedBtn: { backgroundColor: '#D4AF37', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  proceedBtnText: { color: '#1E293B', fontSize: 16, fontWeight: '800' },
});
