import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
} from 'react-native';
import api from '../../utils/api';

const INITIAL_BAR_ITEMS = [
  { id: 'B1', name: 'Macallan Sherry Oak 18 Y.O.', vintage: '18 Years Aged', category: 'Single Malt', alcoholContent: '43%', pricePerGlass: 1850, stockBottles: 8, capacityMl: 700, origin: 'Speyside, Scotland', image: 'https://images.unsplash.com/photo-1527551329241-118ff867fc4d?w=400&h=400&fit=crop' },
  { id: 'B2', name: 'Dom Pérignon Vintage Brut', vintage: 'Vintage 2012', category: 'Vintage Wine', alcoholContent: '12.5%', pricePerGlass: 4200, stockBottles: 14, capacityMl: 750, origin: 'Champagne, France', image: 'https://images.unsplash.com/photo-1594487767123-c6e7a2cf9481?w=400&h=400&fit=crop' },
  { id: 'B5', name: 'Royal Saffron Sazerac', vintage: 'Maison Special Mix', category: 'Craft Cocktail', alcoholContent: '18%', pricePerGlass: 850, stockBottles: 99, capacityMl: 200, origin: 'House Mixologist', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop' }
];

export default function BarLoungeScreen() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cart and billing states
  const [activeTab, setActiveTab] = useState<'display' | 'billing'>('display');
  const [cart, setCart] = useState<any[]>([]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  
  const [tables, setTables] = useState<any[]>([]);
  const [targetTable, setTargetTable] = useState('');
  
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  // CRUD Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Liquor Form
  const [liqName, setLiqName] = useState('');
  const [liqVintage, setLiqVintage] = useState('');
  const [liqCategory, setLiqCategory] = useState('Single Malt');
  const [liqAbv, setLiqAbv] = useState('');
  const [liqPrice, setLiqPrice] = useState('');
  const [liqStock, setLiqStock] = useState('');
  const [liqCapacity, setLiqCapacity] = useState('750');
  const [liqOrigin, setLiqOrigin] = useState('');
  const [liqImage, setLiqImage] = useState('');

  useEffect(() => {
    fetchBarItems();
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

  const fetchBarItems = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/barlounge/liquor');
      if (res.data && res.data.length > 0) {
        setItems(res.data.map((item: any) => ({ ...item, id: item._id })));
      } else {
        setItems(INITIAL_BAR_ITEMS);
      }
    } catch (err) {
      console.error('Failed to fetch bar items', err);
      setItems(INITIAL_BAR_ITEMS);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['All', 'Single Malt', 'Vintage Wine', 'Cognac', 'Craft Cocktail'];

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [items, activeCategory, searchQuery]);

  // --- CRUD Liquors ---
  const handleOpenAdd = () => {
    setEditingItem(null);
    setLiqName('');
    setLiqVintage('');
    setLiqCategory('Single Malt');
    setLiqAbv('');
    setLiqPrice('');
    setLiqStock('');
    setLiqCapacity('750');
    setLiqOrigin('');
    setLiqImage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setLiqName(item.name || '');
    setLiqVintage(item.vintage || '');
    setLiqCategory(item.category || 'Single Malt');
    setLiqAbv(item.alcoholContent || '');
    setLiqPrice(item.pricePerGlass ? String(item.pricePerGlass) : '');
    setLiqStock(item.stockBottles ? String(item.stockBottles) : '');
    setLiqCapacity(item.capacityMl ? String(item.capacityMl) : '750');
    setLiqOrigin(item.origin || '');
    setLiqImage(item.image || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!liqName.trim() || !liqPrice) {
      Alert.alert('Validation Error', 'Name and price are required.');
      return;
    }
    const payload = {
      name: liqName,
      vintage: liqVintage,
      category: liqCategory,
      alcoholContent: liqAbv,
      pricePerGlass: Number(liqPrice),
      stockBottles: Number(liqStock),
      capacityMl: Number(liqCapacity),
      origin: liqOrigin,
      image: liqImage || 'https://images.unsplash.com/photo-1569529465841-dfedd87500f7?w=400&h=400&fit=crop'
    };

    try {
      if (editingItem && !editingItem.id.startsWith('B')) {
        await api.put(`/barlounge/liquor/${editingItem.id}`, payload);
      } else {
        await api.post('/barlounge/liquor', payload);
      }
      setIsModalOpen(false);
      fetchBarItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to save liquor item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (!id.startsWith('B')) {
              await api.delete(`/barlounge/liquor/${id}`);
              fetchBarItems();
            } else {
              setItems(prev => prev.filter(b => b.id !== id));
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to delete item');
          }
        }
      }
    ]);
  };

  // --- Billing & Cart ---
  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.item.id !== itemId);
    });
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + (c.item.pricePerGlass * c.quantity), 0);
  const cartTax = Math.round((cartSubtotal - appliedDiscount) * 0.05 * 2); // 5% CGST + 5% SGST = 10%
  const cartTotal = (cartSubtotal - appliedDiscount) + cartTax;

  const handleApplyDiscount = () => {
    if (discountCode === 'LUXURY10') {
      setAppliedDiscount(cartSubtotal * 0.1);
      Alert.alert('Success', '10% Luxury Discount Applied');
    } else {
      Alert.alert('Invalid', 'Invalid discount code');
      setAppliedDiscount(0);
    }
  };

  const handleSendToTable = async () => {
    if (cart.length === 0 || !targetTable) return;
    try {
      await api.post('/orders', {
        type: 'Bar',
        tableId: targetTable,
        items: cart.map(c => ({
          menuItem: c.item.id,
          name: c.item.name,
          category: c.item.category,
          quantity: c.quantity,
          price: c.item.pricePerGlass,
          status: 'Served'
        })),
        subtotal: cartSubtotal,
        discount: appliedDiscount,
        tax: cartTax,
        total: cartTotal,
        status: 'In Kitchen',
        customerDetails: { name: 'Table Guest', phone: 'N/A' },
        mixologist: 'Head Mixologist'
      });
      setCart([]);
      setTargetTable('');
      setDiscountCode('');
      setAppliedDiscount(0);
      fetchBarItems();
      Alert.alert('Success', 'Sent to Table successfully!');
      setActiveTab('display');
    } catch (err) {
      Alert.alert('Error', 'Failed to send to table');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !paymentMethod) {
      Alert.alert('Error', 'Please select a payment method.');
      return;
    }
    
    try {
      await api.post('/barlounge/checkout', { cart: cart.map(c => ({ item: c.item, quantity: c.quantity })) });
      await api.post('/orders', {
        type: 'Bar',
        items: cart.map(c => ({
          menuItem: c.item.id,
          name: c.item.name,
          category: c.item.category,
          quantity: c.quantity,
          price: c.item.pricePerGlass,
          status: 'Completed'
        })),
        subtotal: cartSubtotal,
        discount: appliedDiscount,
        tax: cartTax,
        total: cartTotal,
        paymentMethod: paymentMethod,
        status: 'Completed',
        customerDetails: { name: customerName || 'Walk-in', phone: customerPhone || 'N/A' },
        mixologist: 'Head Mixologist'
      });
      
      setCart([]);
      setPaymentMethod(null);
      setCustomerName('');
      setCustomerPhone('');
      setTargetTable('');
      setDiscountCode('');
      setAppliedDiscount(0);
      fetchBarItems();
      Alert.alert('Success', 'Bar checkout completed successfully');
      setActiveTab('display');
    } catch (err) {
      Alert.alert('Error', 'Failed to process checkout');
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 }}>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === 'display' ? '#8B5CF6' : 'transparent', alignItems: 'center' }} onPress={() => setActiveTab('display')}>
          <Text style={{ fontWeight: '800', color: activeTab === 'display' ? '#8B5CF6' : '#94A3B8' }}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === 'billing' ? '#8B5CF6' : 'transparent', alignItems: 'center' }} onPress={() => setActiveTab('billing')}>
          <Text style={{ fontWeight: '800', color: activeTab === 'billing' ? '#8B5CF6' : '#94A3B8' }}>Lounge Billing Counter {cart.length > 0 ? `(${cart.length})` : ''}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'display' && (
        <View style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search liquors & cocktails..."
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
        <TouchableOpacity style={styles.addNewBtn} onPress={handleOpenAdd}>
          <Text style={styles.addNewBtnText}>+ Add New Liquor</Text>
        </TouchableOpacity>

        <View style={styles.gridContainer}>
          {filteredItems.map((item, i) => (
            <View key={i} style={styles.menuItemCard}>
              <Image source={{ uri: item.image }} style={styles.menuItemImage} />
              <View style={styles.menuItemInfo}>
                <View style={styles.rowSpaceBetween}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{item.category}</Text>
                  </View>
                  <View style={styles.actionIconsRow}>
                    <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.menuItemVintage}>{item.vintage}</Text>
                
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>Alc: {item.alcoholContent}</Text>
                  <Text style={styles.statText}>Bot: {item.stockBottles}</Text>
                </View>

                <View style={styles.menuItemRow}>
                  <Text style={styles.menuItemPrice}>₹{item.pricePerGlass}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
        <View style={{height: 100}} />
      </ScrollView>
      </View>
      )}

      {activeTab === 'billing' && (
        <ScrollView style={{ padding: 16, backgroundColor: '#FAFAF9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F4', paddingBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', letterSpacing: 1 }}>Active Lounge Ticket</Text>
          </View>
          {cart.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#F5F5F4', borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', borderStyle: 'dashed' }}>
              <Text style={{ color: '#A8A29E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>No Active Pour Selections</Text>
              <Text style={{ color: '#A8A29E', fontSize: 12, textAlign: 'center' }}>Select any premium reserve bottle or mix from the cellar to open the tax invoice.</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E7E5E4', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 16 }}>
              {cart.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i === cart.length - 1 ? 0 : 1, borderBottomColor: '#F5F5F4' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1C1917', fontSize: 14 }}>{c.item.name}</Text>
                    <Text style={{ fontSize: 12, color: '#A8A29E', marginTop: 2 }}>₹{c.item.pricePerGlass} per glass</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAF9', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4' }}>
                      <TouchableOpacity onPress={() => removeFromCart(c.item.id)} style={{ paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: '#78716C', fontWeight: '700' }}>-</Text></TouchableOpacity>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1C1917', paddingHorizontal: 4 }}>{c.quantity}</Text>
                      <TouchableOpacity onPress={() => addToCart(c.item)} style={{ paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: '#78716C', fontWeight: '700' }}>+</Text></TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1C1917', minWidth: 60, textAlign: 'right' }}>₹{c.quantity * c.item.pricePerGlass}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
              <Text style={{ fontSize: 13, color: '#78716C', fontWeight: '600' }}>Subtotal</Text>
              <Text style={{ fontSize: 13, color: '#1C1917', fontWeight: '600' }}>₹{cartSubtotal}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12}}>
              <Text style={{ fontSize: 13, color: '#78716C', fontWeight: '600' }}>Tax (10%)</Text>
              <Text style={{ fontSize: 13, color: '#1C1917', fontWeight: '600' }}>₹{cartTax}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E7E5E4'}}>
              <Text style={{fontSize: 16, color: '#1C1917', fontWeight: '800'}}>Total Due</Text>
              <Text style={{fontSize: 18, color: '#F59E0B', fontWeight: '900'}}>₹{cartTotal}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 24 }}>
            <TextInput style={[styles.formInput, {flex: 1, marginBottom: 0, backgroundColor: '#FAFAF9', borderColor: '#E7E5E4'}]} placeholder="Discount Code (e.g. LUXURY10)" value={discountCode} onChangeText={setDiscountCode} />
            <TouchableOpacity style={{ backgroundColor: '#1C1917', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 8 }} onPress={handleApplyDiscount}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Apply</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, color: '#A8A29E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Lounge / Seating Cabin</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <TouchableOpacity style={[{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FAFAF9', borderWidth: 1, borderColor: '#E7E5E4', marginRight: 8 }, targetTable === '' && { backgroundColor: '#FDF1F5', borderColor: '#F59E0B' }]} onPress={() => setTargetTable('')}>
              <Text style={[{ fontSize: 13, color: '#78716C', fontWeight: '600' }, targetTable === '' && { color: '#F59E0B', fontWeight: '700' }]}>Mixologist Desk (In-Person)</Text>
            </TouchableOpacity>
            {tables.map(t => (
              <TouchableOpacity key={t._id} style={[{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FAFAF9', borderWidth: 1, borderColor: '#E7E5E4', marginRight: 8 }, targetTable === t._id && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]} onPress={() => setTargetTable(t._id)}>
                <Text style={[{ fontSize: 13, color: '#78716C', fontWeight: '600' }, targetTable === t._id && { color: '#F59E0B', fontWeight: '700' }]}>Table {t.number}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {targetTable !== '' ? (
            <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4' }}>
              <Text style={{ fontSize: 12, color: '#A8A29E', marginBottom: 16, textAlign: 'center', fontStyle: 'italic' }}>
                Items will be sent to the selected table's master bill. Payment will be handled there.
              </Text>
              <TouchableOpacity 
                style={[{ backgroundColor: '#F59E0B', padding: 16, borderRadius: 8, alignItems: 'center' }, cart.length === 0 && { opacity: 0.5 }]} 
                onPress={handleSendToTable} 
                disabled={cart.length === 0}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Send to Master Bill</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4' }}>
              <Text style={{ fontSize: 11, color: '#A8A29E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Customer & Payment</Text>
              <TextInput style={[styles.formInput, {marginBottom: 12, backgroundColor: '#FAFAF9', borderColor: '#E7E5E4'}]} placeholder="Customer Name (Optional)" value={customerName} onChangeText={setCustomerName} />
              <TextInput style={[styles.formInput, {marginBottom: 16, backgroundColor: '#FAFAF9', borderColor: '#E7E5E4'}]} placeholder="Phone Number (Optional)" keyboardType="numeric" value={customerPhone} onChangeText={setCustomerPhone} />

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                {['Cash', 'UPI', 'Card'].map(m => (
                  <TouchableOpacity key={m} style={[{ flex: 1, paddingVertical: 12, backgroundColor: '#FAFAF9', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4', alignItems: 'center' }, paymentMethod === m && { backgroundColor: '#1C1917', borderColor: '#1C1917' }]} onPress={() => setPaymentMethod(m as any)}>
                    <Text style={[{ fontSize: 13, color: '#78716C', fontWeight: '600' }, paymentMethod === m && { color: '#fff' }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[{ backgroundColor: '#1C1917', padding: 16, borderRadius: 8, alignItems: 'center' }, cart.length === 0 && { opacity: 0.5 }]} 
                onPress={handleCheckout} 
                disabled={cart.length === 0}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Complete Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{height: 100}} />
        </ScrollView>
      )}

      
      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Liquor' : 'New Liquor'}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}><Text style={styles.closeBtn}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody}>
            <Text style={styles.formLabel}>Item Name *</Text>
            <TextInput style={styles.formInput} value={liqName} onChangeText={setLiqName} placeholder="e.g. Macallan 18" />
            
            <View style={{flexDirection:'row', gap: 16}}>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput style={styles.formInput} value={liqCategory} onChangeText={setLiqCategory} placeholder="Single Malt" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Vintage</Text>
                <TextInput style={styles.formInput} value={liqVintage} onChangeText={setLiqVintage} placeholder="18 Years Aged" />
              </View>
            </View>

            <View style={{flexDirection:'row', gap: 16}}>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Price/Glass (₹) *</Text>
                <TextInput style={styles.formInput} value={liqPrice} onChangeText={setLiqPrice} keyboardType="numeric" placeholder="1850" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>ABV %</Text>
                <TextInput style={styles.formInput} value={liqAbv} onChangeText={setLiqAbv} placeholder="43%" />
              </View>
            </View>

            <View style={{flexDirection:'row', gap: 16}}>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Stock (Bottles)</Text>
                <TextInput style={styles.formInput} value={liqStock} onChangeText={setLiqStock} keyboardType="numeric" placeholder="10" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Bottle Size (ml)</Text>
                <TextInput style={styles.formInput} value={liqCapacity} onChangeText={setLiqCapacity} keyboardType="numeric" placeholder="750" />
              </View>
            </View>

            <Text style={styles.formLabel}>Origin</Text>
            <TextInput style={styles.formInput} value={liqOrigin} onChangeText={setLiqOrigin} placeholder="Scotland" />

            <Text style={styles.formLabel}>Image URL</Text>
            <TextInput style={styles.formInput} value={liqImage} onChangeText={setLiqImage} placeholder="https://..." />
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
              <Text style={styles.saveBtnText}>Save Liquor</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>



    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  topBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 14 },
  categoryScroll: { flexDirection: 'row' },
  categoryBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  categoryBadgeActive: { backgroundColor: '#8B5CF6' }, 
  categoryText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  categoryTextActive: { color: '#fff' },

  menuGrid: { padding: 8 },
  addNewBtn: { backgroundColor: '#F3E8FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#8B5CF6', borderStyle: 'dashed', marginBottom: 16, marginHorizontal: 8 },
  addNewBtnText: { color: '#7E22CE', fontSize: 15, fontWeight: '700' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 8 },
  menuItemCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  menuItemImage: { width: '100%', height: 120, resizeMode: 'cover' },
  menuItemInfo: { padding: 12 },
  
  rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryTag: { backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryTagText: { color: '#7E22CE', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  
  actionIconsRow: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 2 },
  iconBtnText: { fontSize: 14 },

  menuItemName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  menuItemVintage: { fontSize: 10, color: '#64748B', marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statText: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  menuItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuItemPrice: { fontSize: 15, fontWeight: '700', color: '#8B5CF6' },
  addButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  bottomSummary: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#0F172A', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  bottomSummaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSummarySub: { color: '#94A3B8', fontSize: 12 },
  bottomSummaryTotal: { color: '#8B5CF6', fontSize: 20, fontWeight: '800' },

  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  closeBtn: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  
  formBody: { padding: 20 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  formInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', padding: 14, borderRadius: 10, fontSize: 15, marginBottom: 16, color: '#0F172A' },
  saveBtn: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

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
  cartGrandTotal: { fontSize: 20, fontWeight: '800', color: '#8B5CF6' },
  payBtn: { backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  checkoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  checkoutCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  checkoutBody: { padding: 20 },
  checkoutLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  checkoutInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 14 },
  inputError: { borderColor: '#EF4444' },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  paymentMethodBtn: { flex: 1, minWidth: '30%', paddingVertical: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center' },
  paymentMethodBtnActive: { borderColor: '#8B5CF6', backgroundColor: '#F3E8FF' },
  paymentMethodText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  paymentMethodTextActive: { color: '#8B5CF6' },
  checkoutSummary: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  completePayBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
});
