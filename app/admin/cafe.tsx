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
  Image
} from 'react-native';
import api from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';

export default function CafeScreen() {
  const [activeTab, setActiveTab] = useState<'display' | 'billing'>('display');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All', 'Specialty Beans', 'Artisan Patisserie', 'Cold Brew', 'Signature Beverage']);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', category: 'Specialty Beans', price: '', stockCount: '', originOrType: '', roastOrBakeTime: '', scoreOrAward: ''
  });

  // Cart
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash'|'UPI'|'Online'>('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Tables & Seating
  const [tables, setTables] = useState<any[]>([]);
  const [targetTable, setTargetTable] = useState('');

  // Discount
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);



  useEffect(() => {
    fetchItems();
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data);
    } catch (e) {
      console.log('Error fetching tables', e);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };



  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/cafebakery/items');
      setItems(res.data.map((i: any) => ({...i, id: i._id})));
    } catch (e) {
      console.log('Error fetching cafe items', e);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
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
    const type = match ? `image/${match[1]}` : `image`;

    const imgData: any = { uri, name: filename, type };
    const fd = new FormData();
    fd.append('image', imgData);

    const res = await api.post('/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

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
        image: finalImageUrl
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
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/cafebakery/items/${id}`);
          fetchItems();
        } catch (e) {
          Alert.alert('Error', 'Failed to delete');
        }
      }}
    ]);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', category: 'Specialty Beans', price: '', stockCount: '', originOrType: '', roastOrBakeTime: '', scoreOrAward: '' });
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
      scoreOrAward: item.scoreOrAward
    });
    setImageUri(item.image);
    setIsModalOpen(true);
  };

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
  };

  const addToCart = (product: any) => {
    if (product.stockCount <= 0) {
      Alert.alert('Out of Stock', 'This item is currently out of stock');
      return;
    }
    setCart(prev => {
      const exist = prev.find(i => i.item.id === product.id);
      if (exist) return prev.map(i => i.item.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { item: product, quantity: 1, milk: 'None', sweetness: 'No Sweet', notes: '' }];
    });
    showToast(`✓ ${product.name} added`);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.item.id !== id));
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const cartTax = Math.round((cartSubtotal - appliedDiscount) * 0.05);
  const cartTotal = (cartSubtotal - appliedDiscount) + cartTax;

  const handleApplyDiscount = () => {
    if (discountCode === 'CAFE10') {
      setAppliedDiscount(cartSubtotal * 0.1);
      Alert.alert('Success', '10% Discount Applied');
    } else {
      Alert.alert('Invalid', 'Invalid discount code');
      setAppliedDiscount(0);
    }
  };

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
          status: 'Served'
        })),
        subtotal: cartSubtotal,
        discount: appliedDiscount,
        tax: cartTax,
        total: cartTotal,
        status: 'In Kitchen',
        customerDetails: { name: 'Table Guest', phone: 'N/A' }
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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      await api.post('/cafebakery/checkout', { cart });
      await api.post('/orders', {
        type: 'Cafe',
        items: cart.map(c => ({
          menuItem: c.item.id,
          name: c.item.name,
          category: c.item.category,
          quantity: c.quantity,
          price: c.item.price,
          status: 'Completed'
        })),
        subtotal: cartSubtotal,
        discount: appliedDiscount,
        tax: cartTax,
        total: cartTotal,
        paymentMethod,
        status: 'Completed',
        customerDetails: { name: customerName || 'Walk-in', phone: customerPhone || 'N/A' }
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setTargetTable('');
      setDiscountCode('');
      setAppliedDiscount(0);
      fetchItems();
      Alert.alert('Success', 'Checkout completed');
      setActiveTab('display');
    } catch (e) {
      Alert.alert('Error', 'Failed to checkout');
    }
  };

  const filteredItems = items.filter(i => {
    const matchCat = selectedCategory === 'All' || i.category === selectedCategory;
    const matchQ = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <View style={styles.container}>
      {/* ── Item Added Toast ── */}
      {toastVisible && (
        <View style={{ position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#C5A059', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 999, elevation: 8 }} pointerEvents="none">
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{toastMsg}</Text>
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Cafe & Patisserie</Text>
          <Text style={styles.headerSub}>Specialty Extraction & Barista POS</Text>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'display' && styles.tabActive]} onPress={() => setActiveTab('display')}>
            <Text style={[styles.tabTxt, activeTab === 'display' && styles.tabTxtActive]}>Inventory Management</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'billing' && styles.tabActive]} onPress={() => setActiveTab('billing')}>
            <Text style={[styles.tabTxt, activeTab === 'billing' && styles.tabTxtActive]}>Barista POS Counter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'display' && (
        <View style={{ flex: 1 }}>
          <View style={styles.filters}>
            <TextInput style={styles.searchBar} placeholder="Search cafe..." value={searchQuery} onChangeText={setSearchQuery} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {categories.map(cat => (
                <TouchableOpacity key={cat} style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]} onPress={() => setSelectedCategory(cat)}>
                  <Text style={[styles.catBtnTxt, selectedCategory === cat && styles.catBtnTxtActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1, padding: 8 }]} placeholder="New Category" value={newCategoryName} onChangeText={setNewCategoryName} />
              <TouchableOpacity style={{ backgroundColor: '#1C1917', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 }} onPress={handleAddCategory}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>



          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Text style={styles.addBtnTxt}>+ New Item</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? <ActivityIndicator size="large" color="#C5A059" style={{ marginTop: 40 }} /> : (
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
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[styles.actBtn, {backgroundColor: '#C5A059'}]} onPress={() => addToCart(item)}>
                          <Text style={{color: '#fff', fontSize: 10, fontWeight: '800'}}>Add to POS</Text>
                        </TouchableOpacity>

                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}><Text>✏️</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id)}><Text>🗑️</Text></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              <View style={{height: 100}} />
            </ScrollView>
          )}
        </View>
      )}

      {activeTab === 'billing' && (
        <ScrollView style={{ padding: 16 }}>
          <Text style={styles.secTitle}>Cart Items</Text>
          {cart.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 40, marginBottom: 40 }}>Cart is empty. Add items from inventory.</Text>
          ) : (
            <View style={{ marginBottom: 24 }}>
              {cart.map((c, idx) => (
                <View key={idx} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{c.quantity}x {c.item.name}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>₹{c.item.price} each</Text>
                    {(c.milk !== 'None' || c.sweetness !== 'No Sweet' || c.notes !== '') && (
                      <Text style={{ fontSize: 10, color: '#C5A059', fontWeight: '800', marginTop: 4 }}>
                        {c.milk !== 'None' ? `+ ${c.milk} ` : ''} 
                        {c.sweetness !== 'No Sweet' ? `+ ${c.sweetness} ` : ''}
                        {c.notes ? `(${c.notes})` : ''}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#C5A059' }}>₹{c.quantity * c.item.price}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(c.item.id)}><Text style={{ color: '#EF4444', fontSize: 20 }}>×</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.billTotals}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
              <Text style={styles.billLbl}>Subtotal</Text>
              <Text style={styles.billVal}>₹{cartSubtotal}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
              <Text style={styles.billLbl}>Tax (5%)</Text>
              <Text style={styles.billVal}>₹{cartTax}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0'}}>
              <Text style={[styles.billLbl, {fontSize: 16, color: '#0F172A'}]}>Total</Text>
              <Text style={[styles.billVal, {fontSize: 18, color: '#C5A059'}]}>₹{cartTotal}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 16 }}>
            <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} placeholder="Discount Code (e.g. CAFE10)" value={discountCode} onChangeText={setDiscountCode} />
            <TouchableOpacity style={{ backgroundColor: '#1C1917', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 }} onPress={handleApplyDiscount}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Apply</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.secTitle, { marginTop: 8 }]}>Seating / Send to Table</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <TouchableOpacity style={[styles.catBtn, targetTable === '' && styles.catBtnActive]} onPress={() => setTargetTable('')}>
              <Text style={[styles.catBtnTxt, targetTable === '' && styles.catBtnTxtActive]}>Takeaway / Walk-in</Text>
            </TouchableOpacity>
            {tables.map(t => (
              <TouchableOpacity key={t._id} style={[styles.catBtn, targetTable === t._id && styles.catBtnActive]} onPress={() => setTargetTable(t._id)}>
                <Text style={[styles.catBtnTxt, targetTable === t._id && styles.catBtnTxtActive]}>Table {t.number}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {targetTable !== '' ? (
            <View>
              <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 16, textAlign: 'center' }}>
                Items will be sent to the selected table's master bill. Payment will be handled there.
              </Text>
              <TouchableOpacity 
                style={[styles.checkoutBtn, { backgroundColor: '#C5A059' }, cart.length === 0 && { opacity: 0.5 }]} 
                onPress={handleSendToTable} 
                disabled={cart.length === 0}
              >
                <Text style={styles.checkoutBtnTxt}>Send to Table</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.secTitle, { marginTop: 8 }]}>Customer & Payment</Text>
              <TextInput style={[styles.input, {marginBottom: 8}]} placeholder="Customer Name (Optional)" value={customerName} onChangeText={setCustomerName} />
              <TextInput style={[styles.input, {marginBottom: 16}]} placeholder="Phone Number (Optional)" keyboardType="numeric" value={customerPhone} onChangeText={setCustomerPhone} />

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                {['Cash', 'UPI', 'Online'].map(m => (
                  <TouchableOpacity key={m} style={[styles.payMethod, paymentMethod === m && styles.payMethodActive]} onPress={() => setPaymentMethod(m as any)}>
                    <Text style={[styles.payMethodTxt, paymentMethod === m && styles.payMethodTxtActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.checkoutBtn, cart.length === 0 && { opacity: 0.5 }]} 
                onPress={handleCheckout} 
                disabled={cart.length === 0}
              >
                <Text style={styles.checkoutBtnTxt}>Complete Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{height: 100}} />
        </ScrollView>
      )}



      {/* Add/Edit Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Cafe Item' : 'Add Cafe Item'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}><Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
                {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImg} /> : <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Upload Image</Text>}
              </TouchableOpacity>

              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} placeholder="Item Name" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (₹)</Text>
                  <TextInput style={styles.input} placeholder="250" keyboardType="numeric" value={formData.price} onChangeText={t => setFormData({...formData, price: t})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput style={styles.input} placeholder="50" keyboardType="numeric" value={formData.stockCount} onChangeText={t => setFormData({...formData, stockCount: t})} />
                </View>
              </View>

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.filter(c => c !== 'All').map(c => (
                  <TouchableOpacity key={c} style={[styles.catBtn, formData.category === c && styles.catBtnActive]} onPress={() => setFormData({...formData, category: c})}>
                    <Text style={[styles.catBtnTxt, formData.category === c && styles.catBtnTxtActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Origin / Type</Text>
              <TextInput style={styles.input} placeholder="e.g. Boquete, Panama" value={formData.originOrType} onChangeText={t => setFormData({...formData, originOrType: t})} />

              <Text style={styles.label}>Roast / Bake Time</Text>
              <TextInput style={styles.input} placeholder="e.g. Roast Date: May 28" value={formData.roastOrBakeTime} onChangeText={t => setFormData({...formData, roastOrBakeTime: t})} />

              <Text style={styles.label}>Score / Award (Optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. SCA Score: 94.5" value={formData.scoreOrAward} onChangeText={t => setFormData({...formData, scoreOrAward: t})} />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnTxt}>Save Item</Text>}
              </TouchableOpacity>
              <View style={{height: 100}} />
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
  iconBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 8 },

  secTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  billTotals: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  billLbl: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  billVal: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },

  payMethod: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center' },
  payMethodActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  payMethodTxt: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  payMethodTxtActive: { color: '#6366F1' },

  checkoutBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  checkoutBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  
  imgPicker: { height: 160, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  previewImg: { width: '100%', height: '100%' },

  saveBtn: { backgroundColor: '#C5A059', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' }
});
