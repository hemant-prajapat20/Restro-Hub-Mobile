import React, { useState, useEffect, useMemo } from 'react';
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
  Image,
  ImageBackground,
} from 'react-native';
import api from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';

// ---------- Persistent globals (module‑level) ----------
let globalCart: any[] = [];
let globalCustomerName = '';
let globalCustomerPhone = '';
let globalDiscountCode = '';
let globalAppliedDiscount = 0;
let globalTargetTable = '';
let globalPaymentMethod: string | null = null;

export default function CafeScreen() {
  const [activeTab, setActiveTab] = useState<'display' | 'billing'>('display');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ---- Filters ----
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([
    'All',
    'Specialty Beans',
    'Artisan Patisserie',
    'Cold Brew',
    'Signature Beverage',
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ---- Modals ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Specialty Beans',
    price: '',
    stockCount: '',
    originOrType: '',
    roastOrBakeTime: '',
    scoreOrAward: '',
  });

  // ---- POS Billing (persistent) ----
  const [cart, setCart] = useState<any[]>(globalCart);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(globalPaymentMethod);
  const [customerName, setCustomerName] = useState(globalCustomerName);
  const [customerPhone, setCustomerPhone] = useState(globalCustomerPhone);

  // ---- Tables & Seating ----
  const [tables, setTables] = useState<any[]>([]);
  const [targetTable, setTargetTable] = useState(globalTargetTable);

  // ---- Discount ----
  const [discountCode, setDiscountCode] = useState(globalDiscountCode);
  const [appliedDiscount, setAppliedDiscount] = useState(globalAppliedDiscount);

  // ---- UI Toast ----
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
  };

  // Synchronise globals on every change
  useEffect(() => { globalCart = cart; }, [cart]);
  useEffect(() => { globalCustomerName = customerName; }, [customerName]);
  useEffect(() => { globalCustomerPhone = customerPhone; }, [customerPhone]);
  useEffect(() => { globalDiscountCode = discountCode; }, [discountCode]);
  useEffect(() => { globalAppliedDiscount = appliedDiscount; }, [appliedDiscount]);
  useEffect(() => { globalTargetTable = targetTable; }, [targetTable]);
  useEffect(() => { globalPaymentMethod = paymentMethod; }, [paymentMethod]);

  // ---- Initial data fetch ----
  useEffect(() => {
    fetchItems();
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data);
    } catch (e) {

    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/cafebakery/items');
      setItems(res.data.map((i: any) => ({ ...i, id: i._id })));
    } catch (e) {

    } finally {
      setIsLoading(false);
    }
  };

  // ---- Category Management ----
  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  // ---- Image handling ----
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image';
    const imgData: any = { uri, name: filename, type };
    const fd = new FormData();
    fd.append('image', imgData);
    const res = await api.post('/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  };

  // ---- Save (Add / Edit) ----
  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.stockCount) {
      Alert.alert('Error', 'Name, price, and stock are required');
      return;
    }
    setIsUploading(true);
    try {
      let finalImageUrl = 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=400&fit=crop';
      if (imageUri && !imageUri.startsWith('http')) {
        finalImageUrl = await uploadImage(imageUri);
      } else if (imageUri) {
        finalImageUrl = imageUri;
      }

      const payload = {
        ...formData,
        price: Number(formData.price),
        stockCount: Number(formData.stockCount),
        image: finalImageUrl,
      };

      if (editingId) {
        await api.put(`/cafebakery/items/${editingId}`, payload);
      } else {
        await api.post('/cafebakery/items', payload);
      }
      setIsModalOpen(false);
      fetchItems();
      Alert.alert('Success', 'Item saved');
    } catch (e) {
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/cafebakery/items/${id}`);
            fetchItems();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: 'Specialty Beans',
      price: '',
      stockCount: '',
      originOrType: '',
      roastOrBakeTime: '',
      scoreOrAward: '',
    });
    setImageUri(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stockCount: item.stockCount.toString(),
      originOrType: item.originOrType,
      roastOrBakeTime: item.roastOrBakeTime,
      scoreOrAward: item.scoreOrAward,
    });
    setImageUri(item.image);
    setIsModalOpen(true);
  };

  // ---- Cart Operations ----
  const addToCart = (product: any) => {
    if (product.stockCount <= 0) {
      Alert.alert('Out of Stock', 'This item is currently out of stock');
      return;
    }
    setCart(prev => {
      const exist = prev.find(i => i.item.id === product.id);
      if (exist) return prev.map(i => (i.item.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { item: product, quantity: 1, milk: 'None', sweetness: 'No Sweet', notes: '' }];
    });
    showToast(`✓ ${product.name} added`);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.item.id !== id));
  };

  // ---- Billing Calculations (mirroring web) ----
  const cartSubtotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const discountAmount = appliedDiscount; // appliedDiscount already stores absolute discount value
  const afterDiscount = cartSubtotal - discountAmount;
  const serviceCharge = Math.round(afterDiscount * 0.10); // 10% service charge, same as bar lounge
  const cgst = Math.round(afterDiscount * 0.09);
  const sgst = Math.round(afterDiscount * 0.09);
  const cartTotal = afterDiscount + serviceCharge + cgst + sgst;

  const handleApplyDiscount = () => {
    if (discountCode.trim().toUpperCase() === 'CAFE10') {
      const disc = Math.round(cartSubtotal * 0.1);
      setAppliedDiscount(disc);
      Alert.alert('Success', '10% Discount Applied');
    } else {
      setAppliedDiscount(0);
      Alert.alert('Invalid', 'Invalid discount code');
    }
  };

  // ---- Send to Table ----
  const handleSendToTable = async () => {
    if (cart.length === 0 || !targetTable) return;
    try {
      await api.post('/orders', {
        type: 'Cafe',
        tableId: targetTable,
        items: cart.map(c => ({
          menuItem: c.item.id,
          name: c.item.name,
          category: c.item.category,
          quantity: c.quantity,
          price: c.item.price,
          status: 'Served',
        })),
        subtotal: cartSubtotal,
        discount: discountAmount,
        tax: cgst + sgst,
        total: cartTotal,
        status: 'In Kitchen',
        customerDetails: { name: 'Table Guest', phone: 'N/A' },
      });
      setCart([]);
      setTargetTable('');
      setDiscountCode('');
      setAppliedDiscount(0);
      fetchItems();
      Alert.alert('Success', 'Sent to Table successfully!');
      setActiveTab('display');
    } catch (e) {
      Alert.alert('Error', 'Failed to send to table');
    }
  };

  // ---- Checkout ----
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      // Deduct stock on backend (cafe specific endpoint)
      await api.post('/cafebakery/checkout', { cart });
      // Save global transaction (invoice)
      await api.post('/orders', {
        type: 'Cafe',
        items: cart.map(c => ({
          menuItem: c.item.id,
          name: c.item.name,
          category: c.item.category,
          quantity: c.quantity,
          price: c.item.price,
          status: 'Completed',
        })),
        subtotal: cartSubtotal,
        discount: discountAmount,
        tax: cgst + sgst,
        total: cartTotal,
        paymentMethod: paymentMethod || 'Cash',
        status: 'Completed',
        customerDetails: { name: customerName || 'Walk-in', phone: customerPhone || 'N/A' },
      });
      // Reset POS state
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setTargetTable('');
      setDiscountCode('');
      setAppliedDiscount(0);
      setPaymentMethod(null);
      fetchItems();
      Alert.alert('Success', 'Checkout completed');
      setActiveTab('display');
    } catch (e) {
      Alert.alert('Error', 'Failed to checkout');
    }
  };

  // ---- Filtering ----
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchCat = selectedCategory === 'All' || i.category === selectedCategory;
      const matchSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toastVisible && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Header & Tab Switcher */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Cafe & Patisserie</Text>
          <Text style={styles.headerSub}>Specialty Extraction & Barista POS</Text>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'display' && styles.tabActive]}
            onPress={() => setActiveTab('display')}
          >
            <Text style={[styles.tabTxt, activeTab === 'display' && styles.tabTxtActive]}>Inventory Management</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'billing' && styles.tabActive]}
            onPress={() => setActiveTab('billing')}
          >
            <Text style={[styles.tabTxt, activeTab === 'billing' && styles.tabTxtActive]}>Barista POS Counter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ----- Inventory Tab ----- */}
      {activeTab === 'display' && (
        <View style={{ flex: 1 }}>
          <View style={styles.filters}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search cafe..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catBtnTxt, selectedCategory === cat && styles.catBtnTxtActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, padding: 8 }]}
                placeholder="New Category"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity style={styles.addCategoryBtn} onPress={handleAddCategory}>
                <Text style={styles.addCategoryTxt}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Text style={styles.addBtnTxt}>+ New Item</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#C5A059" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.grid}>
              {filteredItems.map(item => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardImgCon}>
                    <Image source={{ uri: item.image }} style={styles.cardImg} />
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeTxt}>{item.stockCount} in stock</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemCat}>{item.category}</Text>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.metaTxt}>Origin: {item.originOrType}</Text>
                      <Text style={styles.metaTxt}>Time: {item.roastOrBakeTime}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actBtn, { backgroundColor: '#C5A059' }]}
                        onPress={() => addToCart(item)}
                      >
                        <Text style={styles.actBtnTxt}>Add to POS</Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                          <Text>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id)}>
                          <Text>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </View>
      )}

      {/* ----- Billing Tab ----- */}
      {activeTab === 'billing' && (
        <ScrollView style={{ padding: 16 }}>
          <Text style={styles.secTitle}>Cart Items</Text>
          {cart.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 40, marginBottom: 40 }}>
              Cart is empty. Add items from inventory.
            </Text>
          ) : (
            <View style={{ marginBottom: 24 }}>
              {cart.map((c, idx) => (
                <View key={idx} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                      {c.quantity}x {c.item.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>
                      ₹{c.item.price} each
                    </Text>
                    {(c.milk !== 'None' || c.sweetness !== 'No Sweet' || c.notes !== '') && (
                      <Text style={{ fontSize: 10, color: '#C5A059', fontWeight: '800', marginTop: 4 }}>
                        {c.milk !== 'None' ? `+ ${c.milk} ` : ''}
                        {c.sweetness !== 'No Sweet' ? `+ ${c.sweetness} ` : ''}
                        {c.notes ? `(${c.notes})` : ''}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#C5A059' }}>
                      ₹{c.quantity * c.item.price}
                    </Text>
                    <TouchableOpacity onPress={() => removeFromCart(c.item.id)}>
                      <Text style={{ color: '#EF4444', fontSize: 20 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Billing Summary */}
          <View style={styles.billTotals}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.billLbl}>Subtotal</Text>
              <Text style={styles.billVal}>₹{cartSubtotal}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[styles.billLbl, { color: '#10B981' }]}>Discount</Text>
                <Text style={[styles.billVal, { color: '#10B981' }]}>- ₹{discountAmount}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.billLbl}>Service Charge (10%)</Text>
              <Text style={styles.billVal}>₹{serviceCharge}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.billLbl}>CGST (9%)</Text>
              <Text style={styles.billVal}>₹{cgst}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.billLbl}>SGST (9%)</Text>
              <Text style={styles.billVal}>₹{sgst}</Text>
            </View>
            <View style={[styles.billRow, styles.billTotal]}>
              <Text style={styles.billTotalLbl}>Total Due</Text>
              <Text style={styles.billTotalVal}>₹{cartTotal}</Text>
            </View>
          </View>

          {/* Discount Code */}
          <View style={styles.discountRow}>
            <TextInput
              style={styles.discountInput}
              placeholder="Discount Code (e.g. CAFE10)"
              placeholderTextColor="#94A3B8"
              value={discountCode}
              onChangeText={setDiscountCode}
            />
            <TouchableOpacity style={styles.discountBtn} onPress={handleApplyDiscount}>
              <Text style={styles.discountBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Seating / Send to Table */}
          <Text style={styles.sectionLabel}>Seating / Send to Table</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.tableChip, targetTable === '' && styles.tableChipActive]}
              onPress={() => setTargetTable('')}
            >
              <Text style={[styles.tableChipText, targetTable === '' && styles.tableChipTextActive]}>Takeaway / Walk‑in</Text>
            </TouchableOpacity>
            {tables.map(t => (
              <TouchableOpacity
                key={t._id}
                style={[styles.tableChip, targetTable === t._id && styles.tableChipActive]}
                onPress={() => setTargetTable(t._id)}
              >
                <Text style={[styles.tableChipText, targetTable === t._id && styles.tableChipTextActive]}>Table {t.number}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {targetTable !== '' ? (
            <View style={styles.actionBox}>
              <Text style={styles.actionNote}>Items will be sent to the selected table's master bill. Payment handled at table.</Text>
              <TouchableOpacity
                style={[styles.sendTableBtn, cart.length === 0 && { opacity: 0.5 }]}
                onPress={handleSendToTable}
                disabled={cart.length === 0}
              >
                <Text style={styles.sendTableBtnText}>Send to Table</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionBox}>
              <Text style={styles.sectionLabel}>Customer & Payment</Text>
              <TextInput
                style={styles.guestInput}
                placeholder="Customer Name (Optional)"
                placeholderTextColor="#94A3B8"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={styles.guestInput}
                placeholder="Phone Number (Optional)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={10}
                value={customerPhone}
                onChangeText={v => setCustomerPhone(v.replace(/[^0-9]/g, ''))}
              />
              <View style={styles.payMethodsRow}>
                {['Cash', 'UPI', 'Online'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.payMethodBtn, paymentMethod === m && styles.payMethodBtnActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.payMethodText, paymentMethod === m && styles.payMethodTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, cart.length === 0 && { opacity: 0.4 }]}
                onPress={handleCheckout}
                disabled={cart.length === 0}
              >
                <Text style={styles.checkoutBtnText}>Complete Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ---------- Add/Edit Modal ---------- */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Cafe Item' : 'Add Cafe Item'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Text style={styles.closeBtn}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
                {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImg} /> : <Text style={styles.uploadTxt}>Upload Image</Text>}
              </TouchableOpacity>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Item Name"
                value={formData.name}
                onChangeText={t => setFormData({ ...formData, name: t })}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="250"
                    keyboardType="numeric"
                    value={formData.price}
                    onChangeText={t => setFormData({ ...formData, price: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="50"
                    keyboardType="numeric"
                    value={formData.stockCount}
                    onChangeText={t => setFormData({ ...formData, stockCount: t })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.filter(c => c !== 'All').map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catBtn, formData.category === c && styles.catBtnActive]}
                    onPress={() => setFormData({ ...formData, category: c })}
                  >
                    <Text style={[styles.catBtnTxt, formData.category === c && styles.catBtnTxtActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Origin / Type</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Boquete, Panama"
                value={formData.originOrType}
                onChangeText={t => setFormData({ ...formData, originOrType: t })}
              />

              <Text style={styles.label}>Roast / Bake Time</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Roast Date: May 28"
                value={formData.roastOrBakeTime}
                onChangeText={t => setFormData({ ...formData, roastOrBakeTime: t })}
              />

              <Text style={styles.label}>Score / Award (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SCA Score: 94.5"
                value={formData.scoreOrAward}
                onChangeText={t => setFormData({ ...formData, scoreOrAward: t })}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnTxt}>Save Item</Text>}
              </TouchableOpacity>
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1C1917', padding: 20 },
  headerTop: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#A8A29E', fontWeight: '700' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#292524', padding: 4, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#C5A059' },
  tabTxt: { fontSize: 10, fontWeight: '800', color: '#A8A29E', textTransform: 'uppercase' },
  tabTxtActive: { color: '#fff' },

  filters: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchBar: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  catBtnActive: { backgroundColor: '#C5A059', borderColor: '#C5A059' },
  catBtnTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  catBtnTxtActive: { color: '#fff' },
  addCategoryBtn: { backgroundColor: '#1C1917', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 },
  addCategoryTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  addBtn: { backgroundColor: '#1C1917', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  addBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  cardImgCon: { height: 120, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  stockBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stockBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },
  cardBody: { padding: 12 },
  itemName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  itemCat: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  itemPrice: { fontSize: 16, fontWeight: '900', color: '#C5A059', marginTop: 4 },
  cardMeta: { marginTop: 8, backgroundColor: '#F8FAFC', padding: 6, borderRadius: 8 },
  metaTxt: { fontSize: 8, color: '#64748B', fontWeight: '700' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actBtnTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  iconBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 8 },

  secTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  billTotals: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  billLbl: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  billVal: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billTotal: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, marginTop: 4 },
  billTotalLbl: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  billTotalVal: { fontSize: 18, fontWeight: '900', color: '#C5A059' },

  discountRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  discountInput: { flex: 1, backgroundColor: '#FAFAF9', borderWidth: 1, borderColor: '#E7E5E4', padding: 12, borderRadius: 8, fontSize: 13, color: '#0F172A' },
  discountBtn: { backgroundColor: '#1C1917', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  discountBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  sectionLabel: { fontSize: 11, color: '#A8A29E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  tableChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FAFAF9', borderWidth: 1, borderColor: '#E7E5E4', marginRight: 8 },
  tableChipActive: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  tableChipText: { fontSize: 12, color: '#78716C', fontWeight: '600' },
  tableChipTextActive: { color: '#92400E', fontWeight: '700' },

  actionBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4' },
  actionNote: { fontSize: 12, color: '#A8A29E', fontStyle: 'italic', textAlign: 'center', marginBottom: 16 },
  sendTableBtn: { backgroundColor: '#C5A059', padding: 16, borderRadius: 8, alignItems: 'center' },
  sendTableBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  guestInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 14, borderRadius: 10, fontSize: 14, marginBottom: 10, color: '#0F172A' },

  payMethodsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  payMethodBtn: { flex: 1, minWidth: '30%', paddingVertical: 12, borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 8, alignItems: 'center', backgroundColor: '#FAFAF9' },
  payMethodBtnActive: { backgroundColor: '#1C1917', borderColor: '#1C1917' },
  payMethodText: { fontSize: 13, color: '#78716C', fontWeight: '600' },
  payMethodTextActive: { color: '#fff' },

  checkoutBtn: { backgroundColor: '#1C1917', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  checkoutBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#C5A059', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 999, elevation: 8 },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  closeBtn: { fontSize: 24, color: '#94A3B8' },
  modalBody: { padding: 20 },
  imgPicker: { height: 160, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  previewImg: { width: '100%', height: '100%' },
  uploadTxt: { color: '#94A3B8', fontWeight: '700' },
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },
  saveBtn: { backgroundColor: '#C5A059', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },
});
