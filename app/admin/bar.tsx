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

// Global cache — persist cart across tab navigation (same pattern as restro.tsx)
let globalCart: any[] = [];
let globalCustomerName = '';
let globalCustomerPhone = '';
let globalDiscountCode = '';
let globalAppliedDiscount = 0;
let globalTargetTable = '';
let globalPaymentMethod: string | null = null;

const INITIAL_BAR_ITEMS = [
  { id: 'B1', name: 'Macallan Sherry Oak 18 Y.O.', vintage: '18 Years Aged', category: 'Single Malt', alcoholContent: '43%', pricePerGlass: 1850, stockBottles: 8, capacityMl: 700, origin: 'Speyside, Scotland', image: 'https://images.unsplash.com/photo-1527551329241-118ff867fc4d?w=400&h=400&fit=crop' },
  { id: 'B2', name: 'Dom Pérignon Vintage Brut', vintage: 'Vintage 2012', category: 'Vintage Wine', alcoholContent: '12.5%', pricePerGlass: 4200, stockBottles: 14, capacityMl: 750, origin: 'Champagne, France', image: 'https://images.unsplash.com/photo-1594487767123-c6e7a2cf9481?w=400&h=400&fit=crop' },
  { id: 'B3', name: 'Château Margaux Premier Grand Cru', vintage: 'Vintage 2015', category: 'Vintage Wine', alcoholContent: '13.5%', pricePerGlass: 5500, stockBottles: 6, capacityMl: 750, origin: 'Bordeaux, France', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop' },
  { id: 'B4', name: 'Remy Martin Louis XIII Cognac', vintage: 'Grande Champagne Reserve', category: 'Cognac', alcoholContent: '40%', pricePerGlass: 8500, stockBottles: 3, capacityMl: 700, origin: 'Cognac, France', image: 'https://images.unsplash.com/photo-1569529465841-dfedd87500f7?w=400&h=400&fit=crop' },
  { id: 'B5', name: 'Royal Saffron Sazerac', vintage: 'Maison Special Mix', category: 'Craft Cocktail', alcoholContent: '18%', pricePerGlass: 850, stockBottles: 24, capacityMl: 250, origin: 'Maison In-House', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop' },
  { id: 'B6', name: 'Yamazaki Single Malt Whiskey', vintage: '12 Years Aged', category: 'Single Malt', alcoholContent: '45%', pricePerGlass: 2600, stockBottles: 5, capacityMl: 700, origin: 'Osaka, Japan', image: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d5?w=400&h=400&fit=crop' },
  { id: 'B7', name: 'Gran Patrón Burdeos Anejo', vintage: 'Finest Handcrafted', category: 'Craft Cocktail', alcoholContent: '40%', pricePerGlass: 3400, stockBottles: 7, capacityMl: 750, origin: 'Jalisco, Mexico', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=400&fit=crop' },
];

export default function BarLoungeScreen() {
  const [activeTab, setActiveTab] = useState<'display' | 'billing'>('display');
  const [items, setItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Persistent POS state
  const [cart, setCart] = useState<any[]>(globalCart);
  const [customerName, setCustomerName] = useState(globalCustomerName);
  const [customerPhone, setCustomerPhone] = useState(globalCustomerPhone);
  const [discountCode, setDiscountCode] = useState(globalDiscountCode);
  const [appliedDiscount, setAppliedDiscount] = useState(globalAppliedDiscount);
  const [targetTable, setTargetTable] = useState(globalTargetTable);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(globalPaymentMethod);

  // Sync to global cache
  useEffect(() => { globalCart = cart; }, [cart]);
  useEffect(() => { globalCustomerName = customerName; }, [customerName]);
  useEffect(() => { globalCustomerPhone = customerPhone; }, [customerPhone]);
  useEffect(() => { globalDiscountCode = discountCode; }, [discountCode]);
  useEffect(() => { globalAppliedDiscount = appliedDiscount; }, [appliedDiscount]);
  useEffect(() => { globalTargetTable = targetTable; }, [targetTable]);
  useEffect(() => { globalPaymentMethod = paymentMethod; }, [paymentMethod]);

  // Filters
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const categories = ['All', 'Single Malt', 'Vintage Wine', 'Cognac', 'Craft Cocktail'];

  // CRUD Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [liqName, setLiqName] = useState('');
  const [liqVintage, setLiqVintage] = useState('');
  const [liqCategory, setLiqCategory] = useState('Single Malt');
  const [liqAbv, setLiqAbv] = useState('');
  const [liqPrice, setLiqPrice] = useState('');
  const [liqStock, setLiqStock] = useState('');
  const [liqCapacity, setLiqCapacity] = useState('750');
  const [liqOrigin, setLiqOrigin] = useState('');
  const [liqImage, setLiqImage] = useState('');

  // Invoice receipt state
  const [checkoutReceipt, setCheckoutReceipt] = useState<any | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
  };

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [barRes, tableRes] = await Promise.all([
        api.get('/barlounge/liquor'),
        api.get('/tables'),
      ]);
      setItems(barRes.data?.length > 0 ? barRes.data.map((i: any) => ({ ...i, id: i._id })) : INITIAL_BAR_ITEMS);
      setTables(tableRes.data || []);
    } catch {
      setItems(INITIAL_BAR_ITEMS);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.origin || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [items, activeCategory, searchQuery]);

  // ── CRUD ──
  const handleOpenAdd = () => {
    setEditingItem(null);
    setLiqName(''); setLiqVintage(''); setLiqCategory('Single Malt');
    setLiqAbv(''); setLiqPrice(''); setLiqStock('');
    setLiqCapacity('750'); setLiqOrigin(''); setLiqImage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setLiqName(item.name || ''); setLiqVintage(item.vintage || '');
    setLiqCategory(item.category || 'Single Malt'); setLiqAbv(item.alcoholContent || '');
    setLiqPrice(item.pricePerGlass ? String(item.pricePerGlass) : '');
    setLiqStock(item.stockBottles ? String(item.stockBottles) : '');
    setLiqCapacity(item.capacityMl ? String(item.capacityMl) : '750');
    setLiqOrigin(item.origin || ''); setLiqImage(item.image || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!liqName.trim() || !liqPrice) {
      Alert.alert('Validation Error', 'Name and price are required.');
      return;
    }
    const payload = {
      name: liqName, vintage: liqVintage, category: liqCategory,
      alcoholContent: liqAbv, pricePerGlass: Number(liqPrice),
      stockBottles: Number(liqStock), capacityMl: Number(liqCapacity),
      origin: liqOrigin, image: liqImage || 'https://images.unsplash.com/photo-1569529465841-dfedd87500f7?w=400&h=400&fit=crop'
    };
    try {
      if (editingItem && !editingItem.id.startsWith('B')) {
        await api.put(`/barlounge/liquor/${editingItem.id}`, payload);
      } else {
        await api.post('/barlounge/liquor', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to save liquor item');
    }
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (!id.startsWith('B')) {
              await api.delete(`/barlounge/liquor/${id}`);
              fetchData();
            } else {
              setItems(prev => prev.filter(b => b.id !== id));
            }
          } catch { Alert.alert('Error', 'Failed to delete item'); }
        }
      }
    ]);
  };

  // ── Cart ──
  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { item, quantity: 1 }];
    });
    showToast(`✓ ${item.name} added`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === itemId);
      if (existing && existing.quantity > 1) return prev.map(i => i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.item.id !== itemId);
    });
  };

  // ── Billing Calculations (matches web exactly) ──
  const liquorSubtotal = cart.reduce((sum, c) => sum + (c.item.pricePerGlass * c.quantity), 0);
  const discountAmount = Math.round(liquorSubtotal * appliedDiscount);
  const afterDiscount = liquorSubtotal - discountAmount;
  const serviceCharge = Math.round(afterDiscount * 0.10);  // 10% service charge
  const cgst = Math.round(afterDiscount * 0.09);            // 9% CGST
  const sgst = Math.round(afterDiscount * 0.09);            // 9% SGST
  const cartTotal = afterDiscount + serviceCharge + cgst + sgst;

  const handleApplyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    if (code === 'GUILD20') {
      setAppliedDiscount(0.20);
      showToast('✓ 20% Guild Discount Applied');
    } else if (code === 'LUXURY10') {
      setAppliedDiscount(0.10);
      showToast('✓ 10% Luxury Discount Applied');
    } else {
      setAppliedDiscount(0);
      Alert.alert('Invalid Code', 'That discount code is not recognised. Try GUILD20.');
    }
  };

  // ── Send to Table ──
  const handleSendToTable = async () => {
    if (cart.length === 0 || !targetTable) return;
    setIsProcessing(true);
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
        subtotal: liquorSubtotal,
        discount: discountAmount,
        tax: cgst + sgst,
        total: cartTotal,
        status: 'In Kitchen',
        customerDetails: { name: 'Table Guest', phone: 'N/A' },
        mixologist: 'Head Mixologist / Sommelier'
      });
      const tName = tables.find(t => t._id === targetTable)?.number || targetTable;
      Alert.alert('✓ Sent to Table', `Lounge order has been routed to Table ${tName}.`);
      setCart([]); setTargetTable(''); setDiscountCode(''); setAppliedDiscount(0);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to send to table');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Checkout → Invoice ──
  const handleCheckout = async () => {
    // Strict validation
    if (!customerName.trim()) {
      Alert.alert('Guest Name Required', 'A real guest name is required to generate a bar invoice.');
      return;
    }
    if (customerPhone.length !== 10) {
      Alert.alert('Phone Required', 'A valid 10-digit mobile number is required.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Payment Required', 'Please select a payment method.');
      return;
    }
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      // 1. Deduct stock
      await api.post('/barlounge/checkout', {
        cart: cart.map(c => ({ item: c.item, quantity: c.quantity }))
      });

      // 2. Save completed order/transaction
      const orderRes = await api.post('/orders', {
        type: 'Bar',
        items: cart.map(c => ({
          menuItem: c.item.id,
          name: c.item.name,
          category: c.item.category,
          quantity: c.quantity,
          price: c.item.pricePerGlass,
          status: 'Completed'
        })),
        subtotal: liquorSubtotal,
        discount: discountAmount,
        tax: cgst + sgst,
        total: cartTotal,
        paymentMethod: paymentMethod,
        status: 'Completed',
        customerDetails: { name: customerName, phone: customerPhone },
        mixologist: 'Alba Thorne (Head Sommelier)'
      });

      // 3. Generate invoice receipt (same structure as web)
      const invoiceNum = 'MSN-BAR-' + Math.floor(100000 + Math.random() * 900000);
      setCheckoutReceipt({
        invoiceNumber: invoiceNum,
        timestamp: new Date().toLocaleString(),
        customerName,
        customerPhone,
        paymentMethod,
        items: [...cart],
        liquorSubtotal,
        discountAmount,
        serviceCharge,
        cgst,
        sgst,
        total: cartTotal,
        table: targetTable ? (tables.find(t => t._id === targetTable)?.number || targetTable) : 'Walk-in Counter',
        mixologist: 'Alba Thorne (Head Sommelier)',
      });

      // 4. Clear everything
      setCart([]); setPaymentMethod(null); setCustomerName(''); setCustomerPhone('');
      setTargetTable(''); setDiscountCode(''); setAppliedDiscount(0);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to process checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Item Added Toast ── */}
      {toastVisible && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* ── Tab Header ── */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'display' && styles.tabBtnActive]}
          onPress={() => setActiveTab('display')}
        >
          <Text style={[styles.tabText, activeTab === 'display' && styles.tabTextActive]}>
            Cellar Inventory
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'billing' && styles.tabBtnActive]}
          onPress={() => setActiveTab('billing')}
        >
          <Text style={[styles.tabText, activeTab === 'billing' && styles.tabTextActive]}>
            Lounge Billing {cart.length > 0 ? `(${cart.reduce((a, c) => a + c.quantity, 0)})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Inventory Tab ── */}
      {activeTab === 'display' && (
        <View style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or origin..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBadge, activeCategory === cat && styles.catBadgeActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
            <TouchableOpacity style={styles.addNewBtn} onPress={handleOpenAdd}>
              <Text style={styles.addNewBtnText}>+ Add New Liquor / Cocktail</Text>
            </TouchableOpacity>

            <View style={styles.grid}>
              {filteredItems.map((item, i) => (
                <View key={i} style={styles.card}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={styles.cardInfo}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.catTag}>
                        <Text style={styles.catTagText}>{item.category}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => handleOpenEdit(item)}>
                          <Text style={{ fontSize: 14 }}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                          <Text style={{ fontSize: 14 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardVintage}>{item.vintage}</Text>
                    <View style={styles.cardStats}>
                      <Text style={styles.cardStat}>ABV: {item.alcoholContent}</Text>
                      <Text style={styles.cardStat}>Stock: {item.stockBottles} btl</Text>
                    </View>
                    <View style={styles.cardPriceRow}>
                      <Text style={styles.cardPrice}>₹{item.pricePerGlass}/glass</Text>
                      <TouchableOpacity style={styles.addBtn} onPress={() => { addToCart(item); }}>
                        <Text style={styles.addBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Lounge Billing Tab ── */}
      {activeTab === 'billing' && (
        <ScrollView style={{ flex: 1, backgroundColor: '#FAFAF9' }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.billingTitle}>Active Lounge Ticket</Text>

          {/* Cart Items */}
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartTitle}>No Active Pour Selections</Text>
              <Text style={styles.emptyCartSub}>Select any premium reserve from the Cellar tab to open the tax invoice.</Text>
            </View>
          ) : (
            <View style={styles.cartBox}>
              {cart.map((c, i) => (
                <View key={i} style={[styles.cartRow, i < cart.length - 1 && styles.cartRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{c.item.name}</Text>
                    <Text style={styles.cartItemSub}>₹{c.item.pricePerGlass} per glass · {c.item.category}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.qtyBox}>
                      <TouchableOpacity onPress={() => removeFromCart(c.item.id)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{c.quantity}</Text>
                      <TouchableOpacity onPress={() => addToCart(c.item)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartItemTotal}>₹{c.quantity * c.item.pricePerGlass}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Billing Breakdown */}
          <View style={styles.billingBox}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Liquor Subtotal</Text>
              <Text style={styles.billingValue}>₹{liquorSubtotal.toFixed(2)}</Text>
            </View>
            {appliedDiscount > 0 && (
              <View style={styles.billingRow}>
                <Text style={[styles.billingLabel, { color: '#10B981' }]}>Guild Discount ({(appliedDiscount * 100).toFixed(0)}%)</Text>
                <Text style={[styles.billingValue, { color: '#10B981' }]}>- ₹{discountAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Service Charge (10%)</Text>
              <Text style={styles.billingValue}>₹{serviceCharge.toFixed(2)}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>CGST (9%)</Text>
              <Text style={styles.billingValue}>₹{cgst.toFixed(2)}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>SGST (9%)</Text>
              <Text style={styles.billingValue}>₹{sgst.toFixed(2)}</Text>
            </View>
            <View style={[styles.billingRow, styles.billingTotal]}>
              <Text style={styles.billingTotalLabel}>Total Due</Text>
              <Text style={styles.billingTotalValue}>₹{cartTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Discount Code */}
          <View style={styles.discountRow}>
            <TextInput
              style={styles.discountInput}
              placeholder="Guild Code (e.g. GUILD20)"
              placeholderTextColor="#94A3B8"
              value={discountCode}
              onChangeText={setDiscountCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.discountBtn} onPress={handleApplyDiscount}>
              <Text style={styles.discountBtnText}>APPLY</Text>
            </TouchableOpacity>
          </View>

          {/* Table / Seating Selection */}
          <Text style={styles.sectionLabel}>Lounge / Seating Table</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setTargetTable('')}
              style={[styles.tableChip, targetTable === '' && styles.tableChipActive]}
            >
              <Text style={[styles.tableChipText, targetTable === '' && styles.tableChipTextActive]}>
                Mixologist Desk (Counter)
              </Text>
            </TouchableOpacity>
            {tables.map(t => (
              <TouchableOpacity
                key={t._id}
                onPress={() => setTargetTable(t._id)}
                style={[styles.tableChip, targetTable === t._id && styles.tableChipActive]}
              >
                <Text style={[styles.tableChipText, targetTable === t._id && styles.tableChipTextActive]}>
                  Table {t.number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* If table selected → Send to Master Bill. Else → Direct Checkout with Invoice */}
          {targetTable !== '' ? (
            <View style={styles.actionBox}>
              <Text style={styles.actionNote}>
                Items will be added to Table {tables.find(t => t._id === targetTable)?.number || ''}'s master bill. Payment handled at table.
              </Text>
              <TouchableOpacity
                style={[styles.sendTableBtn, (cart.length === 0 || isProcessing) && { opacity: 0.5 }]}
                onPress={handleSendToTable}
                disabled={cart.length === 0 || isProcessing}
              >
                <Text style={styles.sendTableBtnText}>{isProcessing ? 'SENDING...' : 'SEND TO MASTER BILL'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionBox}>
              <Text style={styles.sectionLabel}>Guest Details <Text style={{ color: '#EF4444' }}>*</Text></Text>

              <TextInput
                style={[styles.guestInput, customerName.length > 0 && customerName.trim() === '' && { borderColor: '#EF4444' }]}
                placeholder="Guest Name (Required)"
                placeholderTextColor="#94A3B8"
                value={customerName}
                onChangeText={setCustomerName}
              />
              {customerName.length > 0 && customerName.trim() === '' && (
                <Text style={styles.fieldError}>Guest name cannot be blank.</Text>
              )}

              <TextInput
                style={[styles.guestInput, customerPhone.length > 0 && customerPhone.length !== 10 && { borderColor: '#EF4444' }]}
                placeholder="10-digit Mobile Number (Required)"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
                value={customerPhone}
                onChangeText={v => setCustomerPhone(v.replace(/[^0-9]/g, ''))}
              />
              {customerPhone.length > 0 && customerPhone.length !== 10 && (
                <Text style={styles.fieldError}>{customerPhone.length}/10 digits</Text>
              )}

              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Payment Method</Text>
              <View style={styles.payMethodsRow}>
                {['Cash', 'UPI', 'Card', 'Amex'].map(m => (
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
                style={[
                  styles.checkoutBtn,
                  (!customerName.trim() || customerPhone.length !== 10 || !paymentMethod || cart.length === 0) && { opacity: 0.4 }
                ]}
                onPress={handleCheckout}
                disabled={!customerName.trim() || customerPhone.length !== 10 || !paymentMethod || cart.length === 0 || isProcessing}
              >
                <Text style={styles.checkoutBtnText}>{isProcessing ? 'PROCESSING...' : 'COMPLETE CHECKOUT & INVOICE'}</Text>
              </TouchableOpacity>
              <Text style={styles.mandatoryNote}>★ All fields required. Invoice generated on confirmation.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Liquor CRUD Modal ── */}
      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Liquor' : 'New Liquor / Cocktail'}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody}>
            <Text style={styles.formLabel}>Item Name *</Text>
            <TextInput style={styles.formInput} value={liqName} onChangeText={setLiqName} placeholder="e.g. Macallan 18" />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput style={styles.formInput} value={liqCategory} onChangeText={setLiqCategory} placeholder="Single Malt" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Vintage</Text>
                <TextInput style={styles.formInput} value={liqVintage} onChangeText={setLiqVintage} placeholder="18 Years Aged" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Price/Glass (₹) *</Text>
                <TextInput style={styles.formInput} value={liqPrice} onChangeText={setLiqPrice} keyboardType="numeric" placeholder="1850" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>ABV %</Text>
                <TextInput style={styles.formInput} value={liqAbv} onChangeText={setLiqAbv} placeholder="43%" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Stock (Bottles)</Text>
                <TextInput style={styles.formInput} value={liqStock} onChangeText={setLiqStock} keyboardType="numeric" placeholder="10" />
              </View>
              <View style={{ flex: 1 }}>
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

      {/* ── Imperial Bar Receipt Modal ── */}
      <Modal visible={!!checkoutReceipt} transparent animationType="fade">
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptBox}>
            <ScrollView>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptStoreName}>THE SOMMELIER LOUNGE</Text>
                <Text style={styles.receiptSub}>Bar Cellar & Mixology Suite</Text>
                <Text style={styles.receiptDate}>{checkoutReceipt?.timestamp}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>Invoice #</Text>
                  <Text style={styles.receiptMetaValue}>{checkoutReceipt?.invoiceNumber}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>Guest</Text>
                  <Text style={styles.receiptMetaValue}>{checkoutReceipt?.customerName}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>Mobile</Text>
                  <Text style={styles.receiptMetaValue}>{checkoutReceipt?.customerPhone}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>Table/Counter</Text>
                  <Text style={styles.receiptMetaValue}>{checkoutReceipt?.table}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>Sommelier</Text>
                  <Text style={styles.receiptMetaValue}>{checkoutReceipt?.mixologist}</Text>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={styles.receiptSectionTitle}>ITEMS POURED</Text>
                {checkoutReceipt?.items?.map((c: any, i: number) => (
                  <View key={i} style={styles.receiptItemRow}>
                    <Text style={styles.receiptItemName}>{c.item.name}</Text>
                    <Text style={styles.receiptItemQty}>x{c.quantity}</Text>
                    <Text style={styles.receiptItemAmt}>₹{c.quantity * c.item.pricePerGlass}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.receiptDivider} />

              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>Liquor Subtotal</Text>
                  <Text style={styles.receiptMetaValue}>₹{checkoutReceipt?.liquorSubtotal?.toFixed(2)}</Text>
                </View>
                {checkoutReceipt?.discountAmount > 0 && (
                  <View style={styles.receiptMetaRow}>
                    <Text style={[styles.receiptMetaLabel, { color: '#10B981' }]}>Guild Discount</Text>
                    <Text style={[styles.receiptMetaValue, { color: '#10B981' }]}>- ₹{checkoutReceipt?.discountAmount?.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>Service Charge (10%)</Text>
                  <Text style={styles.receiptMetaValue}>₹{checkoutReceipt?.serviceCharge?.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>CGST (9%)</Text>
                  <Text style={styles.receiptMetaValue}>₹{checkoutReceipt?.cgst?.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaLabel}>SGST (9%)</Text>
                  <Text style={styles.receiptMetaValue}>₹{checkoutReceipt?.sgst?.toFixed(2)}</Text>
                </View>
                <View style={[styles.receiptMetaRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E7E5E4' }]}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: '#1C1917' }}>TOTAL PAID ({checkoutReceipt?.paymentMethod})</Text>
                  <Text style={{ fontWeight: '900', fontSize: 18, color: '#8B5CF6' }}>₹{checkoutReceipt?.total?.toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setCheckoutReceipt(null)}>
                <Text style={styles.receiptCloseBtnText}>Close Receipt</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 999, elevation: 8 },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#8B5CF6' },
  tabText: { fontWeight: '700', fontSize: 13, color: '#94A3B8' },
  tabTextActive: { color: '#8B5CF6' },

  topBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 14, color: '#0F172A' },
  catBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  catBadgeActive: { backgroundColor: '#8B5CF6' },
  catText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  catTextActive: { color: '#fff' },

  addNewBtn: { backgroundColor: '#F3E8FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#8B5CF6', borderStyle: 'dashed', marginBottom: 16 },
  addNewBtnText: { color: '#7E22CE', fontSize: 14, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  cardImage: { width: '100%', height: 120, resizeMode: 'cover' },
  cardInfo: { padding: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catTag: { backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catTagText: { color: '#7E22CE', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  cardName: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  cardVintage: { fontSize: 10, color: '#64748B', marginBottom: 6 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardStat: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  cardPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  addBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  billingTitle: { fontSize: 16, fontWeight: '800', color: '#1C1917', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F4', paddingBottom: 12 },

  emptyCart: { padding: 32, alignItems: 'center', backgroundColor: '#F5F5F4', borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', borderStyle: 'dashed', marginBottom: 16 },
  emptyCartTitle: { color: '#A8A29E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  emptyCartSub: { color: '#A8A29E', fontSize: 12, textAlign: 'center' },

  cartBox: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E7E5E4', marginBottom: 16 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  cartRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F4' },
  cartItemName: { fontWeight: '700', color: '#1C1917', fontSize: 13 },
  cartItemSub: { fontSize: 11, color: '#A8A29E', marginTop: 2 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAF9', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4' },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtyBtnText: { color: '#78716C', fontWeight: '700', fontSize: 14 },
  qtyVal: { fontSize: 13, fontWeight: '700', color: '#1C1917', paddingHorizontal: 4 },
  cartItemTotal: { fontSize: 13, fontWeight: '800', color: '#1C1917', minWidth: 55, textAlign: 'right' },

  billingBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', marginBottom: 16 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billingLabel: { fontSize: 13, color: '#78716C', fontWeight: '600' },
  billingValue: { fontSize: 13, color: '#1C1917', fontWeight: '600' },
  billingTotal: { borderTopWidth: 1, borderTopColor: '#E7E5E4', paddingTop: 12, marginTop: 4, marginBottom: 0 },
  billingTotalLabel: { fontSize: 16, color: '#1C1917', fontWeight: '800' },
  billingTotalValue: { fontSize: 18, color: '#8B5CF6', fontWeight: '900' },

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

  sendTableBtn: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 8, alignItems: 'center' },
  sendTableBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  guestInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 14, borderRadius: 10, fontSize: 14, marginBottom: 10, color: '#0F172A' },
  fieldError: { color: '#EF4444', fontSize: 11, fontWeight: '600', marginTop: -6, marginBottom: 8, marginLeft: 4 },

  payMethodsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  payMethodBtn: { flex: 1, minWidth: '22%', paddingVertical: 12, borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 8, alignItems: 'center', backgroundColor: '#FAFAF9' },
  payMethodBtnActive: { backgroundColor: '#1C1917', borderColor: '#1C1917' },
  payMethodText: { fontSize: 13, color: '#78716C', fontWeight: '600' },
  payMethodTextActive: { color: '#fff' },

  checkoutBtn: { backgroundColor: '#1C1917', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  checkoutBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  mandatoryNote: { color: '#A8A29E', fontSize: 10, textAlign: 'center', fontWeight: '600' },

  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  closeBtn: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  formBody: { padding: 20 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  formInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', padding: 14, borderRadius: 10, fontSize: 14, marginBottom: 16, color: '#0F172A' },
  saveBtn: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  receiptBox: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '90%', overflow: 'hidden' },
  receiptHeader: { backgroundColor: '#1C1917', padding: 20, alignItems: 'center' },
  receiptStoreName: { color: '#D97706', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  receiptSub: { color: '#A8A29E', fontSize: 11, marginTop: 4, letterSpacing: 1 },
  receiptDate: { color: '#78716C', fontSize: 10, marginTop: 6 },
  receiptDivider: { height: 1, backgroundColor: '#E7E5E4', marginVertical: 12 },
  receiptMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptMetaLabel: { fontSize: 12, color: '#78716C', fontWeight: '600' },
  receiptMetaValue: { fontSize: 12, color: '#1C1917', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  receiptSectionTitle: { fontSize: 10, fontWeight: '800', color: '#A8A29E', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  receiptItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  receiptItemName: { flex: 1, fontSize: 12, color: '#1C1917', fontWeight: '600' },
  receiptItemQty: { fontSize: 12, color: '#78716C', fontWeight: '600', marginHorizontal: 8 },
  receiptItemAmt: { fontSize: 12, color: '#1C1917', fontWeight: '700', minWidth: 60, textAlign: 'right' },
  receiptCloseBtn: { backgroundColor: '#8B5CF6', margin: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  receiptCloseBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
