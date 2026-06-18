import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import api from '../../utils/api';
import { useRouter } from 'expo-router';

const INITIAL_SIGNATURES = [
  { id: 'S1', name: 'Truffle-Infused Tandoori Malai Lobster', description: 'Fresh lobster tails slow-charcoaled in clay tandoor, drizzled with white truffle oil & edible gold leaf spec.', course: 'Starter', price: 3200, chefName: 'Chef Ranveer', isVeg: false, isAvailable: true, image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=400&fit=crop' },
  { id: 'S2', name: 'Mughlai Saffron Dum Biryani (Royal Case)', description: 'Aged Long Grain Basmati slow-steamed under purdah dough crust with organic saffron, rosewater & 24hr marinated baby goat.', course: 'Main Course', price: 1850, chefName: 'Chef Rajesh', isVeg: false, isAvailable: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=400&h=400&fit=crop' },
  { id: 'S3', name: 'Smoked Saffron Pistachio Kulfi Dome', description: 'Slow evaporated thickened whole milk ice-cream flavored with saffron, cardamom and pistachio, encapsulated in a hot sugar dome.', course: 'Dessert', price: 850, chefName: 'Chef Ranveer', isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1589119908995-c6837fa14848?w=400&h=400&fit=crop' }
];

const INITIAL_PDRS = [
  { id: 'P1', name: 'Maharani Suite (PDR 1)', capacity: 12, status: 'Reserved', activeBill: 0, minSpend: 25000, notes: 'Golden decor canopy, personal premium soundbar' },
  { id: 'P2', name: 'Chamber of Nawabs (PDR 2)', capacity: 8, status: 'Occupied', activeBill: 18450, minSpend: 15000, notes: 'Authentic royal low-sitting divan experience' },
  { id: 'P3', name: 'Maison Glass Gazebo (PDR 3)', capacity: 6, status: 'Available', activeBill: 0, minSpend: 10000, notes: 'Panoramic sky-view with personal sommelier service' }
];

// Global state cache to persist POS Draft across tab navigations
let globalCart: any[] = [];
let globalTargetRoomId = '';
let globalDiscountCode = '';
let globalCustomerName = '';
let globalCustomerPhone = '';
let globalAppliedDiscount = 0;

export default function RestroSignatureScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'display' | 'billing'>('display');
  
  const [signatures, setSignatures] = useState<any[]>([]);
  const [pdrs, setPdrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Billing & Cart
  const [cart, setCart] = useState<any[]>(globalCart);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<string>(globalTargetRoomId);
  
  const [customerName, setCustomerName] = useState(globalCustomerName);
  const [customerPhone, setCustomerPhone] = useState(globalCustomerPhone);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState(globalDiscountCode);
  const [appliedDiscount, setAppliedDiscount] = useState(globalAppliedDiscount);
  const [orderState, setOrderState] = useState<'idle' | 'sending' | 'submitted'>('idle');

  // Sync state to global cache on change
  useEffect(() => { globalCart = cart; }, [cart]);
  useEffect(() => { globalTargetRoomId = targetRoomId; }, [targetRoomId]);
  useEffect(() => { globalDiscountCode = discountCode; }, [discountCode]);
  useEffect(() => { globalCustomerName = customerName; }, [customerName]);
  useEffect(() => { globalCustomerPhone = customerPhone; }, [customerPhone]);
  useEffect(() => { globalAppliedDiscount = appliedDiscount; }, [appliedDiscount]);

  // Modals for CRUD
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [isPdrModalOpen, setIsPdrModalOpen] = useState(false);
  const [editingSig, setEditingSig] = useState<any>(null);
  const [editingPdr, setEditingPdr] = useState<any>(null);

  // Signature Form
  const [sigName, setSigName] = useState('');
  const [sigDesc, setSigDesc] = useState('');
  const [sigCourse, setSigCourse] = useState('Main Course');
  const [sigPrice, setSigPrice] = useState('');
  const [sigChef, setSigChef] = useState('');
  const [sigIsVeg, setSigIsVeg] = useState(false);
  const [sigImage, setSigImage] = useState('');

  // PDR Form
  const [pdrName, setPdrName] = useState('');
  const [pdrCapacity, setPdrCapacity] = useState('');
  const [pdrStatus, setPdrStatus] = useState('Available');
  const [pdrMinSpend, setPdrMinSpend] = useState('');
  const [pdrNotes, setPdrNotes] = useState('');

  // Billing sub-tab for mobile POS
  const [posTab, setPosTab] = useState<'menu' | 'cart'>('menu');
  const [checkoutReceipt, setCheckoutReceipt] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const sigRes = await api.get('/restro/signatures');
      if (sigRes.data && sigRes.data.length > 0) {
        setSignatures(sigRes.data.map((item: any) => ({ ...item, id: item._id })));
      } else {
        setSignatures(INITIAL_SIGNATURES);
      }
      const pdrRes = await api.get('/restro/pdrs');
      if (pdrRes.data && pdrRes.data.length > 0) {
        setPdrs(pdrRes.data.map((item: any) => ({ ...item, id: item._id })));
      } else {
        setPdrs(INITIAL_PDRS);
      }
    } catch (err) {
      console.error('Failed to fetch restro data', err);
      setSignatures(INITIAL_SIGNATURES);
      setPdrs(INITIAL_PDRS);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CRUD Signatures ---
  const handleOpenAddSig = () => {
    setEditingSig(null);
    setSigName('');
    setSigDesc('');
    setSigCourse('Main Course');
    setSigPrice('');
    setSigChef('');
    setSigIsVeg(false);
    setSigImage('');
    setIsSigModalOpen(true);
  };

  const handleOpenEditSig = (item: any) => {
    setEditingSig(item);
    setSigName(item.name || '');
    setSigDesc(item.description || '');
    setSigCourse(item.course || 'Main Course');
    setSigPrice(item.price ? String(item.price) : '');
    setSigChef(item.chefName || '');
    setSigIsVeg(!!item.isVeg);
    setSigImage(item.image || '');
    setIsSigModalOpen(true);
  };

  const handleSaveSig = async () => {
    if (!sigName.trim() || !sigPrice) {
      Alert.alert('Validation Error', 'Name and price are required.');
      return;
    }
    const payload = {
      name: sigName,
      description: sigDesc || 'Premium Chef Signature Masterpiece',
      course: sigCourse,
      price: Number(sigPrice),
      chefName: sigChef,
      isVeg: sigIsVeg,
      isAvailable: true,
      image: sigImage || (sigIsVeg ? 'https://images.unsplash.com/photo-1567184109171-9bfe3957eb05?w=400&h=400&fit=crop' : 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=400&fit=crop')
    };

    try {
      if (editingSig && !editingSig.id.startsWith('S')) {
        await api.put(`/restro/signatures/${editingSig.id}`, payload);
      } else {
        await api.post('/restro/signatures', payload);
      }
      setIsSigModalOpen(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save signature dish');
    }
  };

  const handleDeleteSig = (id: string) => {
    Alert.alert('Delete Dish', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (!id.startsWith('S')) {
              await api.delete(`/restro/signatures/${id}`);
              fetchData();
            } else {
              setSignatures(prev => prev.filter(s => s.id !== id));
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to delete dish');
          }
        }
      }
    ]);
  };

  // --- CRUD PDRs ---
  const handleOpenAddPdr = () => {
    setEditingPdr(null);
    setPdrName('');
    setPdrCapacity('');
    setPdrStatus('Available');
    setPdrMinSpend('');
    setPdrNotes('');
    setIsPdrModalOpen(true);
  };

  const handleOpenEditPdr = (item: any) => {
    setEditingPdr(item);
    setPdrName(item.name || '');
    setPdrCapacity(item.capacity ? String(item.capacity) : '');
    setPdrStatus(item.status || 'Available');
    setPdrMinSpend(item.minSpend ? String(item.minSpend) : '');
    setPdrNotes(item.notes || '');
    setIsPdrModalOpen(true);
  };

  const handleSavePdr = async () => {
    if (!pdrName.trim() || !pdrCapacity) {
      Alert.alert('Validation Error', 'Name and capacity are required.');
      return;
    }
    const payload = {
      name: pdrName,
      capacity: Number(pdrCapacity),
      status: pdrStatus,
      minSpend: Number(pdrMinSpend),
      notes: pdrNotes,
      activeBill: editingPdr ? editingPdr.activeBill : 0
    };

    try {
      if (editingPdr && !editingPdr.id.startsWith('P')) {
        await api.put(`/restro/pdrs/${editingPdr.id}`, payload);
      } else {
        await api.post('/restro/pdrs', payload);
      }
      setIsPdrModalOpen(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save suite details');
    }
  };

  const handleDeletePdr = (id: string) => {
    Alert.alert('Delete Suite', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (!id.startsWith('P')) {
              await api.delete(`/restro/pdrs/${id}`);
              fetchData();
            } else {
              setPdrs(prev => prev.filter(p => p.id !== id));
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to delete suite');
          }
        }
      }
    ]);
  };

  const handleTogglePdrStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Available' ? 'Occupied' : 'Available';
    try {
      if (!id.startsWith('P')) {
        await api.put(`/restro/pdrs/${id}/status`, { status: newStatus, activeBill: newStatus === 'Available' ? 0 : undefined });
        fetchData();
      } else {
        setPdrs(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, activeBill: newStatus === 'Available' ? 0 : p.activeBill } : p));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update suite status');
    }
  };

  // --- Billing Logic ---
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
  };

  const addToCart = (dish: any) => {
    setCart(prev => {
      const currentId = dish.id;
      const existing = prev.find(i => i.id === currentId);
      if (existing) {
        return prev.map(i => i.id === currentId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
    showToast(`✓ ${dish.name} added`);
  };

  const removeFromCart = (dishId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.id === dishId);
      if (item && item.quantity > 1) {
        return prev.map(i => i.id === dishId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== dishId);
    });
  };

  const applyRestroDiscount = () => {
    const code = discountCode.toUpperCase().trim();
    if (code === 'AMEXCENTURION') setAppliedDiscount(30);
    else if (code === 'VIPROYAL') setAppliedDiscount(20);
    else if (code === 'FINE10') setAppliedDiscount(10);
    else {
      setAppliedDiscount(0);
      Alert.alert('Invalid Code', 'The discount code is invalid or expired.');
    }
  };

  const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const selectedSuiteObj = pdrs.find(p => p.id === targetRoomId);
  const suiteFee = selectedSuiteObj ? selectedSuiteObj.minSpend : 0;
  const totalSubtotal = subTotal + suiteFee;
  
  const discountAmount = totalSubtotal * (appliedDiscount / 100);
  const afterDiscount = totalSubtotal - discountAmount;
  const sgst = afterDiscount * 0.025;
  const cgst = afterDiscount * 0.025;
  const total = afterDiscount + sgst + cgst;

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    if (!targetRoomId) {
      Alert.alert('Suite Required', 'Please select a Suite before sending KOT.');
      return;
    }

    const roomName = pdrs.find(p => p.id === targetRoomId)?.name || targetRoomId;

    try {
      // POST to /orders with status 'In Kitchen' so it appears on the Kitchen Display.
      // This is NOT a completed transaction — no invoice is generated here.
      // Cart is intentionally KEPT intact so Checkout can process and generate the invoice.
      await api.post('/orders', {
        type: 'Restro',
        tableId: targetRoomId,
        items: cart.map(c => ({
          menuItem: c.id,
          name: c.name,
          category: c.course || 'Signature',
          quantity: c.quantity,
          price: c.price,
          status: 'In Kitchen',
        })),
        subtotal: subTotal,
        tax: sgst + cgst,
        total: total,
        status: 'In Kitchen',
        customerDetails: { name: 'KOT - ' + roomName, phone: 'KOT' },
      });

      const itemList = cart.map(c => `• ${c.name} x${c.quantity}`).join('\n');
      Alert.alert(
        '✓ KOT Sent to Kitchen',
        `Suite: ${roomName}\n\n${itemList}\n\nItems routed to Kitchen Display. Come back here to Checkout & generate invoice when ready.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      // Even if API fails, show confirmation — kitchen may be on local network
      const itemList = cart.map(c => `• ${c.name} x${c.quantity}`).join('\n');
      Alert.alert(
        '⚠ KOT Queued Locally',
        `Suite: ${roomName}\n\n${itemList}\n\nKitchen server unreachable — please reconfirm with kitchen staff directly.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleProcessCheckout = async () => {
    // Strict validation — no fallbacks, no empty guests allowed
    if (!targetRoomId) {
      Alert.alert('Suite Required', 'Please select a Royal Suite before checking out.');
      return;
    }
    if (!customerName.trim()) {
      Alert.alert('Guest Name Required', 'A real guest name is required to generate an invoice. Empty or placeholder names are not allowed.');
      return;
    }
    if (customerPhone.length !== 10) {
      Alert.alert('Phone Required', 'A valid 10-digit mobile number is required for billing.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method to proceed.');
      return;
    }
    
    setOrderState('sending');
    try {
      if (targetRoomId && !targetRoomId.startsWith('P')) {
        await api.post(`/restro/pdrs/${targetRoomId}/checkout`, { totalBill: total });
      }

      const res = await api.post('/orders', {
        type: 'Restro',
        items: cart.map(c => ({
          menuItem: c.id,
          name: c.name,
          category: c.course || 'Signature',
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
      
      const invoiceNum = 'ROYAL-POS-' + Math.floor(100000 + Math.random() * 900000);
      const roomObj = pdrs.find(p => p.id === targetRoomId);
      setCheckoutReceipt({
        invoiceNumber: invoiceNum,
        timestamp: new Date().toLocaleString(),
        customerName: customerName,
        customerPhone: customerPhone,
        paymentMethod: paymentMethod,
        total: total,
        roomName: roomObj ? roomObj.name : 'Walk-in VIP',
        items: cart
      });

      setOrderState('idle');
      setIsCheckoutOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod(null);
      setAppliedDiscount(0);
      setDiscountCode('');
      setTargetRoomId('');
      setPosTab('menu');
      setCart([]);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to process checkout.');
      setOrderState('idle');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Item Added Toast ── */}
      {toastVisible && (
        <View style={{ position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#D97706', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 999, elevation: 8 }} pointerEvents="none">
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{toastMsg}</Text>
        </View>
      )}
      {/* ── Imperial Header — hidden in POS mode to save screen space ── */}
      {activeTab === 'display' && (
        <View style={styles.headerBox}>
          <Text style={styles.headerSub}>MICHELIN-INSPIRED FINE DINING TERMINAL</Text>
          <Text style={styles.headerTitle}>Restro Signature & Suites</Text>
          <Text style={styles.headerDesc}>
            Settle royal VIP rooms, manage custom multi-course chef tasting menus, and showcase curated signature preparations.
          </Text>
        </View>
      )}

      {/* ── Compact POS header strip shown only in billing mode ── */}
      {activeTab === 'billing' && !isCheckoutOpen && (
        <View style={styles.posHeaderStrip}>
          <View>
            <Text style={styles.posHeaderTitle}>Royal POS Counter</Text>
            <Text style={styles.posHeaderSub}>MICHELIN-INSPIRED FINE DINING TERMINAL</Text>
          </View>
          {cart.length > 0 && (
            <View style={styles.posCartBadge}>
              <Text style={styles.posCartBadgeText}>{cart.reduce((a, c) => a + c.quantity, 0)} items · ₹{total.toFixed(0)}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Top Tabs ── */}
      <View style={styles.tabHeader}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'display' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('display')}
        >
          <Text style={[styles.tabText, activeTab === 'display' && styles.tabTextActive]}>Suites & Signatures</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'billing' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('billing')}
        >
          <Text style={[styles.tabText, activeTab === 'billing' && styles.tabTextActive]}>Royal POS Counter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Display Tab (Suites & Signatures) ── */}
      {activeTab === 'display' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Royal Suites (PDRs)</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddPdr}>
              <Text style={styles.addBtnText}>+ ADD SUITE</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {pdrs.map((pdr, i) => (
              <View key={i} style={styles.pdrCard}>
                <View style={styles.pdrTop}>
                  <Text style={styles.pdrName}>{pdr.name}</Text>
                  <TouchableOpacity onPress={() => handleOpenEditPdr(pdr)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.pdrDesc}>{pdr.notes}</Text>
                <View style={styles.pdrMetaRow}>
                  <Text style={styles.pdrMetaText}>Capacity: {pdr.capacity}</Text>
                  <Text style={styles.pdrMetaText}>Min Spend: ₹{pdr.minSpend}</Text>
                </View>
                <View style={styles.pdrStatusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: pdr.status === 'Available' ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.statusText, { color: pdr.status === 'Available' ? '#10B981' : '#EF4444' }]}>{pdr.status}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.toggleBtn}
                    onPress={() => handleTogglePdrStatus(pdr.id, pdr.status)}
                  >
                    <Text style={styles.toggleBtnText}>Toggle Status</Text>
                  </TouchableOpacity>
                </View>
                {pdr.status !== 'Available' && pdr.activeBill > 0 && (
                  <Text style={styles.pdrBillText}>Active Bill: ₹{pdr.activeBill.toFixed(2)}</Text>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Signature Dishes</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddSig}>
              <Text style={styles.addBtnText}>+ ADD DISH</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.gridContainer}>
            {signatures.map((sig, i) => (
              <View key={i} style={styles.sigCard}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: sig.image }} style={styles.sigImage} />
                  <View style={[styles.vegBadge, { backgroundColor: sig.isVeg ? '#10B981' : '#EF4444' }]}>
                    <Text style={styles.vegText}>{sig.isVeg ? 'VEG' : 'NON-VEG'}</Text>
                  </View>
                  <View style={styles.courseBadge}>
                    <Text style={styles.courseText}>{sig.course}</Text>
                  </View>
                </View>
                <View style={styles.sigInfo}>
                  <Text style={styles.sigName} numberOfLines={1}>{sig.name}</Text>
                  <Text style={styles.sigChef}>By {sig.chefName}</Text>
                  <Text style={styles.sigDesc} numberOfLines={2}>{sig.description}</Text>
                  <View style={styles.sigRow}>
                    <Text style={styles.sigPrice}>₹{sig.price.toFixed(2)}</Text>
                    <View style={styles.sigActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenEditSig(sig)}>
                        <Text style={styles.iconBtnText}>E</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#EF444420' }]} onPress={() => handleDeleteSig(sig.id)}>
                        <Text style={[styles.iconBtnText, { color: '#EF4444' }]}>X</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Royal POS Counter Tab ── */}
      {activeTab === 'billing' && !isCheckoutOpen && (
        <View style={{ flex: 1, backgroundColor: '#1C1917' }}>
          
          {/* Mobile POS Sub-Tabs */}
          <View style={{ flexDirection: 'row', backgroundColor: '#0C0A09', borderBottomWidth: 1, borderBottomColor: '#292524' }}>
            <TouchableOpacity 
              style={[styles.tabBtn, posTab === 'menu' && styles.tabBtnActive]} 
              onPress={() => setPosTab('menu')}
            >
              <Text style={[styles.tabText, posTab === 'menu' && styles.tabTextActive]}>Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, posTab === 'cart' && styles.tabBtnActive]} 
              onPress={() => setPosTab('cart')}
            >
              <Text style={[styles.tabText, posTab === 'cart' && styles.tabTextActive]}>
                Cart ({cart.reduce((a, c) => a + c.quantity, 0)})
              </Text>
            </TouchableOpacity>
          </View>

          {posTab === 'menu' && (
            <ScrollView style={{ flex: 1, padding: 16 }}>
              <View style={styles.gridContainer}>
                {signatures.map((sig, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.sigCard, { width: '48%' }]} 
                    onPress={() => addToCart(sig)}
                  >
                    <Image source={{ uri: sig.image }} style={{ width: '100%', height: 100 }} />
                    <View style={styles.sigInfo}>
                      <Text style={styles.sigName} numberOfLines={1}>{sig.name}</Text>
                      <Text style={styles.sigPrice}>₹{sig.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {posTab === 'cart' && (
            <View style={{ flex: 1 }}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartTitle}>Royal Order</Text>
                <TouchableOpacity onPress={() => setCart([])}>
                  <Text style={styles.clearText}>Clear Cart</Text>
                </TouchableOpacity>
              </View>

              {/* Suite Selection built right into Cart */}
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#292524' }}>
                <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Selected Suite (Required)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {pdrs.map(pdr => (
                    <TouchableOpacity 
                      key={pdr.id} 
                      onPress={() => setTargetRoomId(pdr.id)} 
                      style={[
                        { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#292524', marginRight: 8, borderWidth: 1, borderColor: '#44403C' },
                        targetRoomId === pdr.id && { backgroundColor: '#D9770620', borderColor: '#D97706' }
                      ]}
                    >
                      <Text style={[{ color: '#78716C', fontSize: 13, fontWeight: '700' }, targetRoomId === pdr.id && { color: '#D97706' }]}>{pdr.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <ScrollView style={styles.cartList}>
                {cart.length === 0 ? (
                  <Text style={{ color: '#78716C', textAlign: 'center', marginTop: 40 }}>Your cart is empty</Text>
                ) : (
                  cart.map((item, i) => (
                    <View key={i} style={styles.cartItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>₹{item.price.toFixed(2)} each</Text>
                      </View>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.cartFooter}>
                <View style={styles.discountRow}>
                  <TextInput
                    style={styles.discountInput}
                    placeholder="VIP Code (e.g. AMEXCENTURION)"
                    placeholderTextColor="#78716C"
                    value={discountCode}
                    onChangeText={setDiscountCode}
                  />
                  <TouchableOpacity style={styles.applyBtn} onPress={applyRestroDiscount}>
                    <Text style={styles.applyBtnText}>APPLY</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cartTotalsRow}>
                  <Text style={styles.cartTotalsText}>Items Subtotal</Text>
                  <Text style={styles.cartTotalsValue}>₹{subTotal.toFixed(2)}</Text>
                </View>
                {suiteFee > 0 && (
                  <View style={styles.cartTotalsRow}>
                    <Text style={styles.cartTotalsText}>Suite Min Spend</Text>
                    <Text style={styles.cartTotalsValue}>₹{suiteFee.toFixed(2)}</Text>
                  </View>
                )}
                {appliedDiscount > 0 && (
                  <View style={styles.cartTotalsRow}>
                    <Text style={[styles.cartTotalsText, { color: '#10B981' }]}>Discount ({appliedDiscount}%)</Text>
                    <Text style={[styles.cartTotalsValue, { color: '#10B981' }]}>- ₹{discountAmount.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.cartTotalsRow, { borderTopWidth: 1, borderTopColor: '#292524', paddingTop: 12 }]}>
                  <Text style={styles.cartGrandTotalLabel}>Total Due</Text>
                  <Text style={styles.cartGrandTotal}>₹{total.toFixed(2)}</Text>
                </View>

                <View style={styles.cartActions}>
                  <TouchableOpacity 
                    style={[styles.payBtn, { flex: 1 }, cart.length === 0 && { opacity: 0.5 }]}
                    onPress={() => setIsCheckoutOpen(true)}
                    disabled={cart.length === 0}
                  >
                    <Text style={styles.payBtnText}>CHECKOUT & GENERATE INVOICE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Checkout Process ── */}
      {isCheckoutOpen && (
        <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={styles.checkoutBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={styles.checkoutTitle}>Complete Royal Payment</Text>
              <TouchableOpacity onPress={() => setIsCheckoutOpen(false)}>
                <Text style={styles.closeText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Guest Details — Both REQUIRED, no placeholder allowed */}
            <Text style={styles.checkoutLabel}>
              Guest Name{' '}
              <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.checkoutInput,
                customerName.length > 0 && customerName.trim() === '' && { borderColor: '#EF4444' }
              ]}
              placeholder="e.g. Mr. Arjun Kapoor (Required)"
              placeholderTextColor="#78716C"
              value={customerName}
              onChangeText={setCustomerName}
              returnKeyType="next"
            />
            {customerName.length > 0 && customerName.trim() === '' && (
              <Text style={{ color: '#EF4444', fontSize: 11, marginTop: -8, marginBottom: 10, marginLeft: 4 }}>Guest name cannot be empty or blank spaces.</Text>
            )}

            <Text style={styles.checkoutLabel}>
              Mobile Number{' '}
              <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.checkoutInput,
                customerPhone.length > 0 && customerPhone.length !== 10 && { borderColor: '#EF4444' }
              ]}
              placeholder="10-digit mobile number (Required)"
              placeholderTextColor="#78716C"
              keyboardType="number-pad"
              maxLength={10}
              value={customerPhone}
              onChangeText={(val) => setCustomerPhone(val.replace(/[^0-9]/g, ''))}
            />
            {customerPhone.length > 0 && customerPhone.length !== 10 && (
              <Text style={{ color: '#EF4444', fontSize: 11, marginTop: -8, marginBottom: 10, marginLeft: 4 }}>{customerPhone.length}/10 digits entered.</Text>
            )}
            
            <Text style={styles.checkoutLabel}>Select Suite (Required)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {pdrs.map(pdr => (
                <TouchableOpacity key={pdr.id} onPress={() => setTargetRoomId(pdr.id)} style={[styles.suiteSelectBtn, targetRoomId === pdr.id && styles.suiteSelectBtnActive]}>
                  <Text style={[styles.suiteSelectText, targetRoomId === pdr.id && styles.suiteSelectTextActive]}>{pdr.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.checkoutLabel}>Payment Method</Text>
            <View style={styles.paymentMethodsRow}>
              {['Cash', 'UPI', 'Card', 'Amex'].map(method => (
                <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.paymentMethodBtn, paymentMethod === method && styles.paymentMethodBtnActive]}>
                  <Text style={[styles.paymentMethodText, paymentMethod === method && styles.paymentMethodTextActive]}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.checkoutSummaryBox}>
              <Text style={styles.checkoutSummaryLabel}>Grand Total</Text>
              <Text style={styles.checkoutSummaryValue}>₹{total.toFixed(2)}</Text>
            </View>

            {/* Button disabled until ALL fields valid */}
            <TouchableOpacity 
              style={[
                styles.completePayBtn,
                (!targetRoomId || !paymentMethod || customerPhone.length !== 10 || !customerName.trim()) && { opacity: 0.4 }
              ]}
              onPress={handleProcessCheckout}
              disabled={!targetRoomId || !paymentMethod || customerPhone.length !== 10 || !customerName.trim() || orderState === 'sending'}
            >
              <Text style={styles.completePayBtnText}>
                {orderState === 'sending' ? 'PROCESSING...' : 'CONFIRM TRANSACTION'}
              </Text>
            </TouchableOpacity>

            <Text style={{ color: '#57534E', fontSize: 10, textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
              ★ All fields required. No invoice will be generated without valid guest details.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Signature Dish Form Modal ── */}
      <Modal visible={isSigModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSig ? 'Edit Signature Dish' : 'Add Signature Dish'}</Text>
            <TouchableOpacity onPress={() => setIsSigModalOpen(false)}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <TextInput style={styles.input} placeholder="Dish Name" placeholderTextColor="#78716C" value={sigName} onChangeText={setSigName} />
            <TextInput style={styles.input} placeholder="Description (e.g. 24hr marinated...)" placeholderTextColor="#78716C" value={sigDesc} onChangeText={setSigDesc} multiline />
            <TextInput style={styles.input} placeholder="Price (₹)" placeholderTextColor="#78716C" keyboardType="numeric" value={sigPrice} onChangeText={setSigPrice} />
            <TextInput style={styles.input} placeholder="Chef Name (e.g. Chef Ranveer)" placeholderTextColor="#78716C" value={sigChef} onChangeText={setSigChef} />
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Is Vegetarian?</Text>
              <Switch value={sigIsVeg} onValueChange={setSigIsVeg} trackColor={{ false: '#444', true: '#D97706' }} />
            </View>
            
            <View style={styles.pickerRow}>
              {['Starter', 'Main Course', 'Dessert'].map(c => (
                <TouchableOpacity key={c} style={[styles.pickerBtn, sigCourse === c && styles.pickerBtnActive]} onPress={() => setSigCourse(c)}>
                  <Text style={[styles.pickerBtnText, sigCourse === c && styles.pickerBtnTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSig}>
              <Text style={styles.saveBtnText}>Save Dish</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Suite / PDR Form Modal ── */}
      <Modal visible={isPdrModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingPdr ? 'Edit Royal Suite' : 'Add Royal Suite'}</Text>
            <TouchableOpacity onPress={() => setIsPdrModalOpen(false)}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <TextInput style={styles.input} placeholder="Suite Name" placeholderTextColor="#78716C" value={pdrName} onChangeText={setPdrName} />
            <TextInput style={styles.input} placeholder="Capacity (Persons)" placeholderTextColor="#78716C" keyboardType="numeric" value={pdrCapacity} onChangeText={setPdrCapacity} />
            <TextInput style={styles.input} placeholder="Minimum Spend (₹)" placeholderTextColor="#78716C" keyboardType="numeric" value={pdrMinSpend} onChangeText={setPdrMinSpend} />
            <TextInput style={styles.input} placeholder="Notes / Benefits" placeholderTextColor="#78716C" value={pdrNotes} onChangeText={setPdrNotes} multiline />
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePdr}>
              <Text style={styles.saveBtnText}>Save Suite</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Imperial Thermal Receipt Modal ── */}
      <Modal visible={!!checkoutReceipt} transparent animationType="fade">
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptBox}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptStoreName}>THE IMPERIAL CHAMBERS</Text>
              <Text style={styles.receiptSubtitle}>Elite Signature Tasting Lounge</Text>
              <Text style={styles.receiptLocation}>Taj-Maison Cellar Wing #03</Text>
            </View>

            <View style={styles.receiptMeta}>
              <View style={styles.receiptMetaRow}>
                <Text style={styles.receiptMetaKey}>Docket Id:</Text>
                <Text style={styles.receiptMetaVal}>{checkoutReceipt?.invoiceNumber}</Text>
              </View>
              <View style={styles.receiptMetaRow}>
                <Text style={styles.receiptMetaKey}>Timestamp:</Text>
                <Text style={styles.receiptMetaVal}>{checkoutReceipt?.timestamp}</Text>
              </View>
              <View style={styles.receiptMetaRow}>
                <Text style={styles.receiptMetaKey}>Guest:</Text>
                <Text style={styles.receiptMetaVal}>{checkoutReceipt?.customerName}</Text>
              </View>
              <View style={styles.receiptMetaRow}>
                <Text style={styles.receiptMetaKey}>Assigned Cabin:</Text>
                <Text style={styles.receiptMetaVal}>{checkoutReceipt?.roomName}</Text>
              </View>
            </View>

            <View style={styles.receiptItems}>
              {checkoutReceipt?.items?.map((item: any, i: number) => (
                <View key={i} style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemQty}>{item.quantity}x</Text>
                  <Text style={styles.receiptItemName}>{item.name}</Text>
                  <Text style={styles.receiptItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.receiptTotals}>
              <Text style={styles.receiptTotalLabel}>TOTAL PAID ({checkoutReceipt?.paymentMethod})</Text>
              <Text style={styles.receiptTotalValue}>₹{checkoutReceipt?.total?.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setCheckoutReceipt(null)}>
              <Text style={styles.receiptCloseText}>Close Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1917' }, // stone-900 background
  
  headerBox: { padding: 24, backgroundColor: '#0C0A09', borderBottomWidth: 1, borderBottomColor: '#78350F' }, // stone-950, amber-900
  headerSub: { color: '#D97706', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }, // brand-accent
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  headerDesc: { color: '#A8A29E', fontSize: 13, lineHeight: 20 },

  // Compact strip shown instead of big header when POS tab is active
  posHeaderStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0C0A09', borderBottomWidth: 1, borderBottomColor: '#78350F' },
  posHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  posHeaderSub: { color: '#D97706', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  posCartBadge: { backgroundColor: '#D9770625', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#D97706' },
  posCartBadgeText: { color: '#D97706', fontSize: 11, fontWeight: '800' },

  tabHeader: { flexDirection: 'row', backgroundColor: '#1C1917', borderBottomWidth: 1, borderBottomColor: '#292524' },
  tabBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#D97706' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 },
  tabTextActive: { color: '#D97706', fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { backgroundColor: '#D9770620', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#D97706' },
  addBtnText: { color: '#D97706', fontSize: 12, fontWeight: '800' },

  pdrCard: { width: 260, backgroundColor: '#292524', padding: 16, borderRadius: 16, marginRight: 16, borderWidth: 1, borderColor: '#44403C' },
  pdrTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pdrName: { fontSize: 15, fontWeight: '800', color: '#fff', flex: 1 },
  editText: { color: '#D97706', fontSize: 12, fontWeight: '700' },
  pdrDesc: { fontSize: 12, color: '#A8A29E', marginBottom: 12, height: 34 },
  pdrMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pdrMetaText: { fontSize: 12, color: '#D97706', fontWeight: '600' },
  pdrStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  toggleBtn: { padding: 6 },
  toggleBtnText: { color: '#78716C', fontSize: 11, fontWeight: '600' },
  pdrBillText: { marginTop: 12, fontSize: 14, color: '#fff', fontWeight: '800', backgroundColor: '#000', padding: 8, borderRadius: 8, textAlign: 'center' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 24 },
  sigCard: { width: '48%', backgroundColor: '#292524', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#44403C' },
  imageContainer: { position: 'relative', width: '100%', height: 140 },
  sigImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  vegBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vegText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  courseBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  courseText: { color: '#D97706', fontSize: 10, fontWeight: '700' },
  sigInfo: { padding: 12 },
  sigName: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 },
  sigChef: { fontSize: 11, color: '#D97706', fontWeight: '600', marginBottom: 6 },
  sigDesc: { fontSize: 11, color: '#A8A29E', marginBottom: 8, height: 30 },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sigPrice: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sigActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { backgroundColor: '#44403C', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  cartContainer: { flex: 2, backgroundColor: '#0C0A09', borderLeftWidth: 1, borderLeftColor: '#292524' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#292524' },
  cartTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  clearText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  cartList: { flex: 1, padding: 16 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1917', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#292524' },
  cartItemName: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cartItemPrice: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#292524', borderRadius: 6 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  qtyBtnText: { fontSize: 14, fontWeight: '700', color: '#A8A29E' },
  qtyText: { fontSize: 13, fontWeight: '800', width: 20, textAlign: 'center', color: '#fff' },

  cartFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#292524', backgroundColor: '#1C1917' },
  discountRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  discountInput: { flex: 1, backgroundColor: '#292524', borderRadius: 8, paddingHorizontal: 12, color: '#fff', fontSize: 13 },
  applyBtn: { backgroundColor: '#D97706', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  cartTotalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cartTotalsText: { fontSize: 13, color: '#A8A29E', fontWeight: '600' },
  cartTotalsValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  cartGrandTotalLabel: { fontSize: 15, color: '#fff', fontWeight: '800' },
  cartGrandTotal: { fontSize: 20, color: '#D97706', fontWeight: '800' },
  cartActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  kotBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#D97706', alignItems: 'center' },
  kotBtnText: { color: '#D97706', fontSize: 14, fontWeight: '800' },
  payBtn: { flex: 1, backgroundColor: '#D97706', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  checkoutBox: { backgroundColor: '#0C0A09', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#292524' },
  checkoutTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  checkoutLabel: { fontSize: 11, fontWeight: '800', color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  checkoutInput: { backgroundColor: '#1C1917', borderWidth: 1, borderColor: '#292524', padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 14, color: '#fff' },
  suiteSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1C1917', borderWidth: 1, borderColor: '#292524', marginRight: 8 },
  suiteSelectBtnActive: { borderColor: '#D97706', backgroundColor: '#D9770620' },
  suiteSelectText: { color: '#78716C', fontSize: 13, fontWeight: '700' },
  suiteSelectTextActive: { color: '#D97706' },
  paymentMethodsRow: { flexDirection: 'row', gap: 8 },
  paymentMethodBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#1C1917', borderWidth: 1, borderColor: '#292524', alignItems: 'center' },
  paymentMethodBtnActive: { borderColor: '#D97706', backgroundColor: '#D9770620' },
  paymentMethodText: { color: '#78716C', fontSize: 13, fontWeight: '700' },
  paymentMethodTextActive: { color: '#D97706' },
  checkoutSummaryBox: { backgroundColor: '#1C1917', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 24, borderWidth: 1, borderColor: '#292524' },
  checkoutSummaryLabel: { fontSize: 14, color: '#A8A29E', fontWeight: '700' },
  checkoutSummaryValue: { fontSize: 24, color: '#D97706', fontWeight: '800' },
  completePayBtn: { backgroundColor: '#D97706', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  completePayBtnText: { color: '#0C0A09', fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  modalContainer: { flex: 1, backgroundColor: '#0C0A09' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#292524' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  closeText: { fontSize: 14, color: '#EF4444', fontWeight: '700' },
  modalBody: { padding: 20 },
  input: { backgroundColor: '#1C1917', borderWidth: 1, borderColor: '#292524', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 14, color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: '#1C1917', padding: 14, borderRadius: 12 },
  switchLabel: { color: '#A8A29E', fontSize: 14, fontWeight: '700' },
  pickerRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  pickerBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#1C1917', borderWidth: 1, borderColor: '#292524', alignItems: 'center' },
  pickerBtnActive: { borderColor: '#D97706', backgroundColor: '#D9770620' },
  pickerBtnText: { color: '#78716C', fontSize: 12, fontWeight: '700' },
  pickerBtnTextActive: { color: '#D97706' },
  saveBtn: { backgroundColor: '#D97706', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#0C0A09', fontSize: 15, fontWeight: '800' },
});
