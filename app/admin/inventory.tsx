import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import api from '../../utils/api';

interface InventoryItem {
  _id: string;
  name: string;
  unit: string;
  quantityInStock?: number;
  currentStock?: number;
  reorderThreshold?: number;
  minStock?: number;
  category: string;
}

export default function InventoryScreen() {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Form states for stock
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newStock, setNewStock] = useState('');
  const [newMinStock, setNewMinStock] = useState('');
  const [newCategory, setNewCategory] = useState('Essentials');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory');
      setInventoryList(res.data);
    } catch (e) {

    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(inventoryList.map(item => item.category)))];

  const filteredInventory = inventoryList.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleQuickAdd = async (id: string, current: number) => {
    try {
      await api.put(`/inventory/${id}`, { quantityInStock: current + 10 });
      Alert.alert('Success', 'Item successfully received (+10).');
      fetchInventory();
    } catch (e) {
      Alert.alert('Error', 'Failed to update stock');
    }
  };

  const handleQuickDispatch = async (id: string, current: number) => {
    try {
      await api.put(`/inventory/${id}`, { quantityInStock: Math.max(0, current - 5) });
      Alert.alert('Success', 'Item successfully dispatched (-5).');
      fetchInventory();
    } catch (e) {
      Alert.alert('Error', 'Failed to dispatch stock');
    }
  };

  const handleSave = async () => {
    if (!newName || !newStock || !newMinStock) {
      Alert.alert('Validation', 'Please fill required fields.');
      return;
    }
    setIsSaving(true);
    const payload = {
      name: newName,
      unit: newUnit,
      quantityInStock: Number(newStock),
      reorderThreshold: Number(newMinStock),
      category: newCategory,
      supplier: 'Local Vendor'
    };
    try {
      if (editingId) {
        await api.put(`/inventory/${editingId}`, payload);
        Alert.alert('Success', 'Details updated and saved.');
      } else {
        await api.post('/inventory', payload);
        Alert.alert('Success', 'New catalog item created.');
      }
      setShowAddModal(false);
      fetchInventory();
    } catch (e) {
      Alert.alert('Error', 'Failed to save inventory item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm', 'Are you sure you want to permanently discard this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/inventory/${id}`);
          fetchInventory();
          setShowAddModal(false);
        } catch (e) {
          Alert.alert('Error', 'Failed to delete item');
        }
      }}
    ]);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item._id);
    setNewName(item.name);
    setNewCategory(item.category);
    setNewUnit(item.unit);
    setNewStock(String(item.quantityInStock ?? item.currentStock ?? 0));
    setNewMinStock(String(item.reorderThreshold ?? item.minStock ?? 0));
    setShowAddModal(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setNewName('');
    setNewCategory('Essentials');
    setNewUnit('kg');
    setNewStock('');
    setNewMinStock('');
    setShowAddModal(true);
  };

  const totalSkuValue = inventoryList.length * 48500; 
  const lowStockCount = inventoryList.filter(item => (item.quantityInStock ?? item.currentStock ?? 0) <= (item.reorderThreshold ?? item.minStock ?? 0)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBox}><Text style={{fontSize: 24}}>📦</Text></View>
        <View style={{flex: 1}}>
          <Text style={styles.headerTitle}>Inventory Ledger</Text>
          <Text style={styles.headerSub}>Manage your cellar and ingredients</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Catalog</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 16 }}>
        {/* KPIs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total SKU Value</Text>
            <Text style={styles.kpiValue}>₹{(totalSkuValue / 100000).toFixed(2)}L</Text>
            <Text style={[styles.kpiSub, { color: '#10B981' }]}>Ledger synced: Just now</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#FECACA' }]}>
            <Text style={styles.kpiLabel}>Depleted Alerts</Text>
            <Text style={[styles.kpiValue, { color: '#991B1B' }]}>{lowStockCount} Items</Text>
            <Text style={[styles.kpiSub, { color: '#DC2626' }]}>REORDER PROTOCOL REQ.</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Active Consignments</Text>
            <Text style={styles.kpiValue}>03 Cargo</Text>
            <Text style={styles.kpiSub}>Verified luxury importers</Text>
          </View>
        </ScrollView>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity 
                key={cat} 
                style={[styles.tabBtn, isActive && styles.tabBtnActive]} 
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{cat}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* AI Banner */}
        <View style={styles.aiBanner}>
          <Text style={styles.aiBannerTitle}>✨ Pre-reordering intelligence predictions</Text>
          <Text style={styles.aiBannerText}>Automated supply forecasts predict exhaustion spikes in Basmati Rice and Paneer due to high booking loads.</Text>
          <TouchableOpacity style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>Approve Dispatch</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#C5A059" style={{ marginTop: 40 }} />
        ) : filteredInventory.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#94A3B8' }}>No inventory found.</Text>
        ) : (
          filteredInventory.map(item => {
            const currentStock = item.quantityInStock ?? item.currentStock ?? 0;
            const minStock = item.reorderThreshold ?? item.minStock ?? 0;
            const isLow = currentStock <= minStock;
            return (
              <View key={item._id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCat}>{item.category}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge, isLow ? styles.statusLow : styles.statusOk]}>
                      <Text style={[styles.statusText, isLow ? styles.statusTextLow : styles.statusTextOk]}>
                        {isLow ? 'Critical Limit' : 'Stocked'}
                      </Text>
                    </View>
                    <Text style={[styles.stockValue, isLow && { color: '#DC2626' }]}>{currentStock} {item.unit}</Text>
                    <Text style={styles.stockMin}>Min: {minStock}</Text>
                  </View>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleQuickAdd(item._id, currentStock)}>
                    <Text style={styles.actionBtnText}>Receive +10</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleQuickDispatch(item._id, currentStock)}>
                    <Text style={styles.actionBtnPrimaryText}>Dispatch -5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnIcon} onPress={() => openEdit(item)}>
                    <Text style={{fontSize: 16}}>✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
        <View style={{height: 100}} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Ledger Item' : 'Catalog Raw Ingredient'}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll}>
              <Text style={styles.label}>Raw Ingredient Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Saffron Pistils" value={newName} onChangeText={setNewName} />

              <Text style={styles.label}>Category</Text>
              <TextInput style={styles.input} placeholder="Essentials" value={newCategory} onChangeText={setNewCategory} />

              <Text style={styles.label}>Measuring Unit</Text>
              <TextInput style={styles.input} placeholder="kg, Ltr, g..." value={newUnit} onChangeText={setNewUnit} />

              <View style={{flexDirection: 'row', gap: 12}}>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Starting Stock</Text>
                  <TextInput style={styles.input} placeholder="100" keyboardType="numeric" value={newStock} onChangeText={setNewStock} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Minimum Limit</Text>
                  <TextInput style={styles.input} placeholder="15" keyboardType="numeric" value={newMinStock} onChangeText={setNewMinStock} />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              {editingId && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(editingId)}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#C5A059" /> : <Text style={styles.saveBtnText}>{editingId ? 'Update Secure' : 'Set Item Secure'}</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  iconBox: { width: 48, height: 48, backgroundColor: '#FFFBEB', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  addBtn: { backgroundColor: '#C5A059', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },

  kpiCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', width: 160, marginRight: 8 },
  kpiLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginVertical: 2 },
  kpiSub: { fontSize: 9, fontWeight: '700', color: '#64748B' },

  searchBox: { marginBottom: 16 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 14, color: '#0F172A' },

  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  tabBtnActive: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  tabLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  tabLabelActive: { color: '#D97706' },

  aiBanner: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
  aiBannerTitle: { fontSize: 12, fontWeight: '800', color: '#B45309', marginBottom: 4 },
  aiBannerText: { fontSize: 11, color: '#92400E', lineHeight: 16, marginBottom: 8 },
  aiBtn: { backgroundColor: '#F59E0B', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  aiBtnText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  itemCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  itemCat: { fontSize: 9, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginBottom: 4, alignSelf: 'flex-end' },
  statusLow: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  statusTextLow: { color: '#DC2626' },
  statusTextOk: { color: '#16A34A' },
  stockValue: { fontSize: 14, fontWeight: '800', color: '#0F172A', textAlign: 'right' },
  stockMin: { fontSize: 9, color: '#94A3B8', textAlign: 'right', fontWeight: '600' },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 8 },
  actionBtnOutline: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  actionBtnText: { fontSize: 9, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  actionBtnPrimary: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' },
  actionBtnPrimaryText: { fontSize: 9, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' },
  actionBtnIcon: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  formScroll: { padding: 20 },
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },

  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff' },
  deleteBtn: { padding: 14, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B' },
  saveBtnText: { color: '#B45309', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
});
