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
  Image,
  Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../utils/api';

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    name: '', category: '', price: '', description: '', isVeg: true, isAvailable: true, taxRate: '5', variants: [], addons: [], isCombo: false, comboItems: []
  });

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/menu');
      setMenuItems(res.data.data || res.data);
    } catch (e) {
      console.log('Error fetching menu', e);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
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

  const handleVariantChange = (index: number, field: string, value: string | number) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };
  const addVariant = () => setFormData({ ...formData, variants: [...formData.variants, { name: '', price: '' }] });
  const removeVariant = (index: number) => setFormData({ ...formData, variants: formData.variants.filter((_: any, i: number) => i !== index) });

  const handleAddonChange = (index: number, field: string, value: string | number) => {
    const newAddons = [...formData.addons];
    newAddons[index] = { ...newAddons[index], [field]: value };
    setFormData({ ...formData, addons: newAddons });
  };
  const addAddon = () => setFormData({ ...formData, addons: [...formData.addons, { name: '', price: '' }] });
  const removeAddon = (index: number) => setFormData({ ...formData, addons: formData.addons.filter((_: any, i: number) => i !== index) });

  const toggleComboItem = (itemId: string) => {
    const current = formData.comboItems;
    if (current.includes(itemId)) {
      setFormData({ ...formData, comboItems: current.filter((id: string) => id !== itemId) });
    } else {
      setFormData({ ...formData, comboItems: [...current, itemId] });
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category) {
      Alert.alert('Error', 'Name, price, and category are required');
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
      if (imageUri && !imageUri.startsWith('http')) {
        finalImageUrl = await uploadImage(imageUri);
      } else if (imageUri) {
        finalImageUrl = imageUri;
      }

      const payload = {
        ...formData,
        price: Number(formData.price),
        taxRate: Number(formData.taxRate),
        variants: formData.variants.map((v: any) => ({...v, price: Number(v.price)})),
        addons: formData.addons.map((a: any) => ({...a, price: Number(a.price)})),
        image: finalImageUrl
      };

      if (editingId) {
        await api.put(`/menu/${editingId}`, payload);
        Alert.alert('Success', 'Dish updated');
      } else {
        await api.post('/menu', payload);
        Alert.alert('Success', 'Dish added');
      }

      setIsModalOpen(false);
      fetchMenu();
    } catch (e) {
      Alert.alert('Error', 'Failed to save dish');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this dish?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/menu/${id}`);
          fetchMenu();
          Alert.alert('Deleted', 'Dish removed successfully');
        } catch (e) {
          Alert.alert('Error', 'Failed to delete dish');
        }
      }}
    ]);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', price: '', description: '', isVeg: true, isAvailable: true, taxRate: '5', variants: [], addons: [], isCombo: false, comboItems: [] });
    setImageUri(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item._id || item.id);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      description: item.description,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      taxRate: item.taxRate ? item.taxRate.toString() : '5',
      variants: item.variants ? item.variants.map((v:any)=>({...v, price: v.price.toString()})) : [],
      addons: item.addons ? item.addons.map((a:any)=>({...a, price: a.price.toString()})) : [],
      isCombo: item.isCombo || false,
      comboItems: item.comboItems || []
    });
    setImageUri(item.image);
    setIsModalOpen(true);
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map(i => i.category)))];

  const filteredItems = menuItems.filter(i => {
    const mCat = selectedCategory === 'All' || i.category === selectedCategory;
    const mQuery = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return mCat && mQuery;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 24 }}>🍔</Text>
          <View>
            <Text style={styles.headerTitle}>Menu Catalog</Text>
            <Text style={styles.headerSub}>Manage dishes & pricing</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnTxt}>+ New Dish</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TextInput 
          style={styles.searchBar} 
          placeholder="Search menu..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat as string} 
              style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
              onPress={() => setSelectedCategory(cat as string)}
            >
              <Text style={[styles.catBtnTxt, selectedCategory === cat && styles.catBtnTxtActive]}>{cat as string}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#C5A059" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {filteredItems.map(item => (
            <View key={item._id} style={styles.card}>
              <View style={styles.cardImgContainer}>
                <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.cardImg} />
                <View style={[styles.vegBadge, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                  <Text style={styles.vegBadgeTxt}>{item.isVeg ? 'VEG' : 'NON-VEG'}</Text>
                </View>
                {!item.isAvailable && (
                  <View style={styles.unavailBadge}>
                    <Text style={styles.unavailBadgeTxt}>Unavailable</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemCat}>{item.category}</Text>
                  </View>
                </View>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                
                <View style={styles.cardActions}>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                      <Text style={{fontSize: 16}}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item._id)}>
                      <Text style={{fontSize: 16}}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
          <View style={{height: 100}} />
        </ScrollView>
      )}

      {/* Dish Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Dish' : 'Add New Dish'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ padding: 20 }}>
              <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImg} />
                ) : (
                  <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Tap to upload image</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Dish Name</Text>
              <TextInput style={styles.input} placeholder="Butter Chicken" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput style={styles.input} placeholder="Mains" value={formData.category} onChangeText={t => setFormData({...formData, category: t})} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (₹)</Text>
                  <TextInput style={styles.input} placeholder="250" keyboardType="numeric" value={formData.price} onChangeText={t => setFormData({...formData, price: t})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Tax Rate (%)</Text>
                  <TextInput style={styles.input} placeholder="5" keyboardType="numeric" value={formData.taxRate} onChangeText={t => setFormData({...formData, taxRate: t})} />
                </View>
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Delicious description..." multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Vegetarian</Text>
                <Switch value={formData.isVeg} onValueChange={v => setFormData({...formData, isVeg: v})} trackColor={{ true: '#10B981', false: '#CBD5E1' }} />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Available</Text>
                <Switch value={formData.isAvailable} onValueChange={v => setFormData({...formData, isAvailable: v})} trackColor={{ true: '#C5A059', false: '#CBD5E1' }} />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Is Combo Meal</Text>
                <Switch value={formData.isCombo} onValueChange={v => setFormData({...formData, isCombo: v})} trackColor={{ true: '#C5A059', false: '#CBD5E1' }} />
              </View>

              {formData.isCombo && (
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={styles.label}>Select Combo Items</Text>
                  {menuItems.filter(i => !i.isCombo && (i._id || i.id) !== editingId).map((item: any) => {
                    const itemId = item._id || item.id;
                    const isSelected = formData.comboItems.includes(itemId);
                    return (
                      <TouchableOpacity key={itemId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }} onPress={() => toggleComboItem(itemId)}>
                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? '#C5A059' : '#CBD5E1', backgroundColor: isSelected ? '#C5A059' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                        </View>
                        <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600' }}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Variants Section */}
              <View style={{ marginTop: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.label, {marginTop: 0, marginBottom: 0}]}>Variants</Text>
                  <TouchableOpacity onPress={addVariant} style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: '#0F172A', fontSize: 10, fontWeight: '800' }}>+ ADD VARIANT</Text>
                  </TouchableOpacity>
                </View>
                {formData.variants.map((variant: any, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <TextInput style={[styles.input, {flex: 2, paddingVertical: 8}]} placeholder="Name" value={variant.name} onChangeText={t => handleVariantChange(idx, 'name', t)} />
                    <TextInput style={[styles.input, {flex: 1, paddingVertical: 8}]} placeholder="Price" keyboardType="numeric" value={variant.price} onChangeText={t => handleVariantChange(idx, 'price', t)} />
                    <TouchableOpacity onPress={() => removeVariant(idx)} style={{ padding: 8 }}>
                      <Text style={{ color: '#EF4444', fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Addons Section */}
              <View style={{ marginTop: 24, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.label, {marginTop: 0, marginBottom: 0}]}>Add-ons</Text>
                  <TouchableOpacity onPress={addAddon} style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: '#0F172A', fontSize: 10, fontWeight: '800' }}>+ ADD ADD-ON</Text>
                  </TouchableOpacity>
                </View>
                {formData.addons.map((addon: any, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <TextInput style={[styles.input, {flex: 2, paddingVertical: 8}]} placeholder="Name" value={addon.name} onChangeText={t => handleAddonChange(idx, 'name', t)} />
                    <TextInput style={[styles.input, {flex: 1, paddingVertical: 8}]} placeholder="Price" keyboardType="numeric" value={addon.price} onChangeText={t => handleAddonChange(idx, 'price', t)} />
                    <TouchableOpacity onPress={() => removeAddon(idx)} style={{ padding: 8 }}>
                      <Text style={{ color: '#EF4444', fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnTxt}>Save Dish</Text>}
              </TouchableOpacity>
              <View style={{height: 40}} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  addBtn: { backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  filters: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchBar: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  catBtnActive: { backgroundColor: '#C5A059', borderColor: '#C5A059' },
  catBtnTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  catBtnTxtActive: { color: '#fff' },

  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  cardImgContainer: { height: 120, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  vegBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  vegBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '900' },
  unavailBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  unavailBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },

  cardBody: { padding: 12 },
  itemName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  itemCat: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  itemPrice: { fontSize: 16, fontWeight: '900', color: '#C5A059' },
  itemDesc: { fontSize: 10, color: '#64748B', marginTop: 6, height: 28 },
  
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  iconBtn: { padding: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  
  imgPicker: { height: 160, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  previewImg: { width: '100%', height: '100%' },
  
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },

  saveBtn: { backgroundColor: '#C5A059', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' }
});
