import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import api from '../../utils/api';

const INITIAL_SIGNATURES = [
  { id: 'S1', name: 'Truffle-Infused Tandoori Malai Lobster', description: 'Fresh lobster tails slow-charcoaled in clay tandoor, drizzled with white truffle oil & edible gold leaf spec.', course: 'Starter', price: 3200, chefName: 'Chef Ranveer', isVeg: false, image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=400&fit=crop' },
  { id: 'S2', name: 'Mughlai Saffron Dum Biryani (Royal Case)', description: 'Aged Long Grain Basmati slow-steamed under purdah dough crust with organic saffron, rosewater & 24hr marinated baby goat.', course: 'Main Course', price: 1850, chefName: 'Chef Rajesh', isVeg: false, image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=400&h=400&fit=crop' },
  { id: 'S3', name: 'Smoked Saffron Pistachio Kulfi Dome', description: 'Slow evaporated thickened whole milk ice-cream flavored with saffron, cardamom and pistachio, encapsulated in a hot sugar dome.', course: 'Dessert', price: 850, chefName: 'Chef Ranveer', isVeg: true, image: 'https://images.unsplash.com/photo-1589119908995-c6837fa14848?w=400&h=400&fit=crop' }
];

const INITIAL_PDRS = [
  { id: 'P1', name: 'Maharani Suite (PDR 1)', capacity: 12, status: 'Reserved', minSpend: 25000 },
  { id: 'P2', name: 'Chamber of Nawabs (PDR 2)', capacity: 8, status: 'Occupied', minSpend: 15000 },
  { id: 'P3', name: 'Maison Glass Gazebo (PDR 3)', capacity: 6, status: 'Available', minSpend: 10000 }
];

export default function RestroSignatureScreen() {
  const [activeTab, setActiveTab] = useState<'Menu' | 'PDR'>('Menu');
  
  const [signatures, setSignatures] = useState<any[]>([]);
  const [pdrs, setPdrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Billing states
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [orderState, setOrderState] = useState<'idle' | 'sending' | 'submitted'>('idle');

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
      description: sigDesc,
      course: sigCourse,
      price: Number(sigPrice),
      chefName: sigChef,
      isVeg: sigIsVeg,
      image: sigImage || 'https://images.unsplash.com/photo-1544025162-83162fb1658b?w=400&h=400&fit=crop'
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

  const handleDeleteSig = async (id: string) => {
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
      notes: pdrNotes
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
      Alert.alert('Error', 'Failed to save PDR');
    }
  };

  const handleDeletePdr = async (id: string) => {
    Alert.alert('Delete PDR', 'Are you sure?', [
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
            Alert.alert('Error', 'Failed to delete PDR');
          }
        }
      }
    ]);
  };

  // --- Billing & Cart ---
  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
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

  const handleProcessPayment = async () => {
    if (!paymentMethod || !customerName.trim() || customerPhone.length !== 10) {
      Alert.alert('Error', 'Please fill all customer details and select a payment method.');
      return;
    }
    
    setOrderState('sending');
    
    try {
      await api.post('/orders', {
        type: 'Signature',
        items: cart.map(c => ({
          menuItem: c.itemId,
          name: c.name,
          category: 'Signature',
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
      
      Alert.alert('Payment Successful!', 'Signature order completed.', [
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
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setPaymentMethod(null);
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <View style={styles.container}>
      {/* ── Tabs ── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Menu' && styles.activeTab]} onPress={() => setActiveTab('Menu')}>
          <Text style={[styles.tabText, activeTab === 'Menu' && styles.activeTabText]}>Signature Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'PDR' && styles.activeTab]} onPress={() => setActiveTab('PDR')}>
          <Text style={[styles.tabText, activeTab === 'PDR' && styles.activeTabText]}>PDR Management</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'Menu' ? (
          <View style={styles.listContainer}>
            <TouchableOpacity style={styles.addNewBtn} onPress={handleOpenAddSig}>
              <Text style={styles.addNewBtnText}>+ Add New Signature Dish</Text>
            </TouchableOpacity>

            {signatures.map((item, i) => (
              <View key={i} style={styles.card}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <View style={styles.rowSpaceBetween}>
                    <View style={styles.courseBadge}>
                      <Text style={styles.courseBadgeText}>{item.course}</Text>
                    </View>
                    <View style={styles.actionIconsRow}>
                      <TouchableOpacity onPress={() => handleOpenEditSig(item)} style={styles.iconBtn}>
                        <Text style={styles.iconBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteSig(item.id)} style={styles.iconBtn}>
                        <Text style={styles.iconBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDesc}>{item.description}</Text>
                  <View style={styles.rowSpaceBetween}>
                    <Text style={styles.cardPrice}>₹{item.price}</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
                      <Text style={styles.addButtonText}>Add to Order</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            <TouchableOpacity style={styles.addNewBtn} onPress={handleOpenAddPdr}>
              <Text style={styles.addNewBtnText}>+ Add New PDR Room</Text>
            </TouchableOpacity>

            {pdrs.map((pdr, i) => (
              <View key={i} style={[styles.card, { padding: 16 }]}>
                <View style={styles.rowSpaceBetween}>
                  <Text style={styles.cardTitle}>{pdr.name}</Text>
                  <View style={styles.actionIconsRow}>
                    <TouchableOpacity onPress={() => handleOpenEditPdr(pdr)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletePdr(pdr.id)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: pdr.status === 'Available' ? '#DCFCE7' : pdr.status === 'Occupied' ? '#FEE2E2' : '#FEF3C7', alignSelf: 'flex-start', marginVertical: 8 }]}>
                  <Text style={[styles.statusText, { color: pdr.status === 'Available' ? '#16A34A' : pdr.status === 'Occupied' ? '#DC2626' : '#D97706' }]}>
                    {pdr.status}
                  </Text>
                </View>
                <Text style={styles.cardDesc}>Capacity: {pdr.capacity} Guests | Min Spend: ₹{pdr.minSpend}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{height: 100}} /> {/* Spacer for bottom bar */}
      </ScrollView>

      {/* ── Bottom Cart Summary Bar ── */}
      {cart.length > 0 && !isCartOpen && !isCheckoutOpen && (
        <TouchableOpacity style={styles.bottomSummary} onPress={() => setIsCartOpen(true)}>
          <View>
            <Text style={styles.bottomSummaryText}>{cart.length} Items</Text>
            <Text style={styles.bottomSummarySub}>View Cart</Text>
          </View>
          <Text style={styles.bottomSummaryTotal}>₹{total.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* ── Signature Modal ── */}
      <Modal visible={isSigModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsSigModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSig ? 'Edit Signature' : 'New Signature'}</Text>
            <TouchableOpacity onPress={() => setIsSigModalOpen(false)}><Text style={styles.closeBtn}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody}>
            <Text style={styles.formLabel}>Dish Name *</Text>
            <TextInput style={styles.formInput} value={sigName} onChangeText={setSigName} placeholder="e.g. Truffle Lobster" />
            
            <Text style={styles.formLabel}>Description</Text>
            <TextInput style={[styles.formInput, { height: 80 }]} value={sigDesc} onChangeText={setSigDesc} placeholder="Dish details..." multiline />
            
            <View style={{flexDirection:'row', gap: 16}}>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Price (₹) *</Text>
                <TextInput style={styles.formInput} value={sigPrice} onChangeText={setSigPrice} keyboardType="numeric" placeholder="1000" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Course</Text>
                <TextInput style={styles.formInput} value={sigCourse} onChangeText={setSigCourse} placeholder="Starter / Main" />
              </View>
            </View>

            <Text style={styles.formLabel}>Chef Name</Text>
            <TextInput style={styles.formInput} value={sigChef} onChangeText={setSigChef} placeholder="e.g. Chef Ranveer" />
            
            <Text style={styles.formLabel}>Image URL</Text>
            <TextInput style={styles.formInput} value={sigImage} onChangeText={setSigImage} placeholder="https://..." />
            
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 24}}>
              <Switch value={sigIsVeg} onValueChange={setSigIsVeg} trackColor={{ true: '#F59E0B' }} />
              <Text style={{marginLeft: 12, fontSize: 16, color: '#333', fontWeight: '600'}}>Is Vegetarian?</Text>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSig}>
              <Text style={styles.saveBtnText}>Save Dish</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── PDR Modal ── */}
      <Modal visible={isPdrModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsPdrModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingPdr ? 'Edit PDR' : 'New PDR'}</Text>
            <TouchableOpacity onPress={() => setIsPdrModalOpen(false)}><Text style={styles.closeBtn}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody}>
            <Text style={styles.formLabel}>Room Name *</Text>
            <TextInput style={styles.formInput} value={pdrName} onChangeText={setPdrName} placeholder="e.g. Maharani Suite" />
            
            <View style={{flexDirection:'row', gap: 16}}>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Capacity *</Text>
                <TextInput style={styles.formInput} value={pdrCapacity} onChangeText={setPdrCapacity} keyboardType="numeric" placeholder="10" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Min Spend (₹)</Text>
                <TextInput style={styles.formInput} value={pdrMinSpend} onChangeText={setPdrMinSpend} keyboardType="numeric" placeholder="10000" />
              </View>
            </View>

            <Text style={styles.formLabel}>Status</Text>
            <TextInput style={styles.formInput} value={pdrStatus} onChangeText={setPdrStatus} placeholder="Available / Occupied" />

            <Text style={styles.formLabel}>Notes / Benefits</Text>
            <TextInput style={[styles.formInput, { height: 80 }]} value={pdrNotes} onChangeText={setPdrNotes} placeholder="Golden decor..." multiline />
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePdr}>
              <Text style={styles.saveBtnText}>Save Room</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Cart Modal ── */}
      <Modal visible={isCartOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCartOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Signature Order ({cart.length})</Text>
            <TouchableOpacity onPress={() => setIsCartOpen(false)}><Text style={styles.closeBtn}>Close</Text></TouchableOpacity>
          </View>

          <ScrollView style={styles.cartList}>
            {cart.map((item, i) => (
              <View key={i} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>₹{item.price} each</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity onPress={() => removeFromCart(item.itemId)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => addToCart({ id: item.itemId })} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.cartFooter}>
            <View style={styles.cartTotalsRow}>
              <Text style={styles.cartTotalsText}>Subtotal</Text>
              <Text style={styles.cartTotalsText}>₹{subTotal}</Text>
            </View>
            <View style={styles.cartTotalsRow}>
              <Text style={styles.cartTotalsText}>Total Due</Text>
              <Text style={styles.cartGrandTotal}>₹{total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.payBtn} onPress={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}>
              <Text style={styles.payBtnText}>PROCEED TO PAYMENT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Checkout Modal ── */}
      <Modal visible={isCheckoutOpen} animationType="fade" transparent={true}>
        <View style={styles.checkoutOverlay}>
          <View style={styles.checkoutCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setIsCheckoutOpen(false)}><Text style={styles.closeBtn}>X</Text></TouchableOpacity>
            </View>

            <View style={styles.checkoutBody}>
              <Text style={styles.checkoutLabel}>Customer Details (Required)</Text>
              <TextInput style={styles.checkoutInput} placeholder="Customer Name" value={customerName} onChangeText={setCustomerName} />
              <TextInput style={[styles.checkoutInput, customerPhone.length > 0 && customerPhone.length !== 10 && styles.inputError]} placeholder="Mobile Number (10 digits)" keyboardType="numeric" maxLength={10} value={customerPhone} onChangeText={(val) => setCustomerPhone(val.replace(/[^0-9]/g, ''))} />

              <Text style={styles.checkoutLabel}>Payment Method</Text>
              <View style={styles.paymentMethodsRow}>
                {['Cash', 'UPI', 'Card'].map(method => (
                  <TouchableOpacity key={method} style={[styles.paymentMethodBtn, paymentMethod === method && styles.paymentMethodBtnActive]} onPress={() => setPaymentMethod(method)}>
                    <Text style={[styles.paymentMethodText, paymentMethod === method && styles.paymentMethodTextActive]}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.checkoutSummary}>
                <Text style={styles.cartTotalsText}>Grand Total</Text>
                <Text style={styles.cartGrandTotal}>₹{total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity style={[styles.completePayBtn, (!paymentMethod || !customerName || customerPhone.length !== 10) && styles.disabledBtn]} onPress={handleProcessPayment} disabled={!paymentMethod || !customerName || customerPhone.length !== 10 || orderState === 'sending'}>
                <Text style={styles.payBtnText}>{orderState === 'sending' ? 'Processing...' : 'COMPLETE PAYMENT'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#F59E0B' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#fff' },

  scrollContent: { padding: 16 },

  listContainer: { gap: 16 },
  addNewBtn: { backgroundColor: '#FEF3C7', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B', borderStyle: 'dashed' },
  addNewBtnText: { color: '#D97706', fontSize: 15, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardInfo: { padding: 16 },
  rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  courseBadgeText: { color: '#D97706', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: '#F59E0B' },
  
  actionIconsRow: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  iconBtnText: { fontSize: 18 },

  addButton: { backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  bottomSummary: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#0F172A', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  bottomSummaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSummarySub: { color: '#94A3B8', fontSize: 12 },
  bottomSummaryTotal: { color: '#F59E0B', fontSize: 20, fontWeight: '800' },

  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  closeBtn: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  
  formBody: { padding: 20 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  formInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', padding: 14, borderRadius: 10, fontSize: 15, marginBottom: 16, color: '#0F172A' },
  saveBtn: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
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
  cartGrandTotal: { fontSize: 20, fontWeight: '800', color: '#F59E0B' },
  payBtn: { backgroundColor: '#F59E0B', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  checkoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  checkoutCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  checkoutBody: { padding: 20 },
  checkoutLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  checkoutInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 14 },
  inputError: { borderColor: '#EF4444' },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  paymentMethodBtn: { flex: 1, minWidth: '30%', paddingVertical: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center' },
  paymentMethodBtnActive: { borderColor: '#F59E0B', backgroundColor: '#FEF3C7' },
  paymentMethodText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  paymentMethodTextActive: { color: '#F59E0B' },
  checkoutSummary: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  completePayBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
});
