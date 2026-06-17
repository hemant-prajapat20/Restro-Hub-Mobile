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
  Image,
  Alert
} from 'react-native';
import api from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';

interface StaffMember {
  _id: string;
  name: string;
  role: string;
  shift: string;
  status: 'Clocked In' | 'On Break' | 'Off-Duty';
  salary: number;
  contact: string;
  email: string;
  score: number;
  image: string;
  dynamicStatus?: string;
}

const isStaffActiveIST = (shift: string): boolean => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  const currentHour = istDate.getHours() + (istDate.getMinutes() / 60);

  switch (shift) {
    case 'Morning (6 AM - 2 PM)': return currentHour >= 6 && currentHour < 14;
    case 'Evening (2 PM - 10 PM)': return currentHour >= 14 && currentHour < 22;
    case 'Night (10 PM - 6 AM)': return currentHour >= 22 || currentHour < 6;
    case 'General (10 AM - 7 PM)': return currentHour >= 10 && currentHour < 19;
    default: return false;
  }
};

export default function StaffScreen() {
  const [crew, setCrew] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newShift, setNewShift] = useState('General (10 AM - 7 PM)');
  const [newSalary, setNewSalary] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newScore, setNewScore] = useState('5.0');
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, catRes] = await Promise.all([
        api.get('/staff'),
        api.get('/staff/categories')
      ]);
      const mapped = staffRes.data.map((item: any) => ({
        ...item,
        dynamicStatus: isStaffActiveIST(item.shift) ? 'ACTIVE' : 'INACTIVE'
      }));
      setCrew(mapped);
      setCategories(catRes.data || []);
      if (!newRole && catRes.data?.length > 0) setNewRole(catRes.data[0]);
    } catch (e) {
      console.log('Error fetching staff data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    try {
      await api.put(`/staff/${id}`, { status: nextStatus });
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadedImageUri(result.assets[0].uri);
      setExistingImage(null);
    }
  };

  const handleSave = async () => {
    if (!newName || !newSalary || !newContact) {
      Alert.alert('Validation Error', 'Please fill in Name, Salary, and Contact.');
      return;
    }
    setIsSaving(true);
    try {
      let finalImageUrl = existingImage;

      if (uploadedImageUri) {
        const formData = new FormData();
        formData.append('image', {
          uri: uploadedImageUri,
          name: 'staff.jpg',
          type: 'image/jpeg'
        } as any);

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.url;
      }

      const seedName = `Felix-${newName}`;
      const fallbackImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seedName}&hair=shortHairShortFlat,shortHairShortRound,shortHairFrizzle&facialHairProbability=20&clothing=hoodie,shirtCrewNeck`;

      const payload = {
        name: newName,
        role: newRole || categories[0] || 'Staff',
        shift: newShift,
        salary: Number(newSalary),
        contact: newContact,
        email: newEmail,
        score: Number(newScore) || 5.0,
        image: finalImageUrl || fallbackImage
      };

      if (editingStaffId) {
        await api.put(`/staff/${editingStaffId}`, payload);
      } else {
        await api.post('/staff', { ...payload, status: 'Off-Duty' });
      }

      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to save staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm', 'Remove this staff member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/staff/${id}`);
          fetchData();
        } catch (e) {
          Alert.alert('Error', 'Failed to delete staff');
        }
      }}
    ]);
  };

  const resetForm = () => {
    setEditingStaffId(null);
    setNewName('');
    setNewRole(categories[0] || 'Staff');
    setNewShift('General (10 AM - 7 PM)');
    setNewSalary('');
    setNewContact('');
    setNewEmail('');
    setNewScore('5.0');
    setExistingImage(null);
    setUploadedImageUri(null);
  };

  const openEdit = (staff: StaffMember) => {
    setEditingStaffId(staff._id);
    setNewName(staff.name);
    setNewRole(staff.role);
    setNewShift(staff.shift);
    setNewSalary(String(staff.salary));
    setNewContact(staff.contact);
    setNewEmail(staff.email || '');
    setNewScore(String(staff.score || 5.0));
    setExistingImage(staff.image);
    setUploadedImageUri(null);
    setShowAddModal(true);
  };

  const filteredCrew = crew.filter(m => {
    const matchCat = activeTab === 'All' || m.role === activeTab;
    const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBox}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>👥</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Staff Directory</Text>
          <Text style={styles.headerSub}>Manage your team, schedules, and payroll</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => { resetForm(); setShowAddModal(true); }}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or role..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {['All', ...categories].map(cat => {
            const isActive = activeTab === cat;
            return (
              <TouchableOpacity key={cat} style={[styles.tabBtn, isActive && styles.tabBtnActive]} onPress={() => setActiveTab(cat)}>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : filteredCrew.length === 0 ? (
          <Text style={styles.emptyText}>No staff members found.</Text>
        ) : (
          filteredCrew.map((member) => (
            <View key={member._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.profileRow}>
                  {member.image ? (
                    // React Native Image doesn't support SVGs out of the box without react-native-svg
                    // so we use a fallback if it's an svg, or if it errors
                    member.image.includes('.svg') ? (
                      <View style={styles.avatarFallback}><Text>👤</Text></View>
                    ) : (
                      <Image source={{ uri: member.image }} style={styles.avatar} />
                    )
                  ) : (
                    <View style={styles.avatarFallback}><Text>👤</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{member.name}</Text>
                    <Text style={styles.staffRole}>{member.role}</Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Text style={styles.scoreText}>★ {member.score}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📞 Contact</Text>
                  <Text style={styles.detailValue}>{member.contact}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>⏰ Shift</Text>
                  <Text style={styles.detailValue}>{member.shift}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>💰 Salary</Text>
                  <Text style={styles.detailValue}>₹{member.salary.toLocaleString()}/mo</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusDot, { backgroundColor: member.dynamicStatus === 'ACTIVE' ? '#10B981' : '#94A3B8' }]} />
                  <Text style={styles.statusText}>{member.dynamicStatus === 'ACTIVE' ? 'Active Shift' : 'Off Shift'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openEdit(member)}>
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: '#FECACA' }]} onPress={() => handleDelete(member._id)}>
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingStaffId ? 'Edit Staff' : 'Add New Staff'}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll}>
              <View style={styles.imagePickerRow}>
                <View style={styles.imgPreviewBox}>
                  {uploadedImageUri ? (
                    <Image source={{ uri: uploadedImageUri }} style={styles.previewImg} />
                  ) : existingImage && !existingImage.includes('.svg') ? (
                    <Image source={{ uri: existingImage }} style={styles.previewImg} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>📷</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                  <Text style={styles.imgBtnText}>Upload Photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Full Name *</Text>
              <TextInput style={styles.input} placeholder="John Doe" value={newName} onChangeText={setNewName} />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput style={styles.input} placeholder="9876543210" keyboardType="phone-pad" value={newContact} onChangeText={setNewContact} />

              <Text style={styles.label}>Salary (₹) *</Text>
              <TextInput style={styles.input} placeholder="25000" keyboardType="number-pad" value={newSalary} onChangeText={setNewSalary} />

              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput style={styles.input} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" value={newEmail} onChangeText={setNewEmail} />

              {/* Just text inputs for Role/Shift to save time, ideally they are pickers */}
              <Text style={styles.label}>Role</Text>
              <TextInput style={styles.input} placeholder="e.g. Manager" value={newRole} onChangeText={setNewRole} />

              <Text style={styles.label}>Shift</Text>
              <TextInput style={styles.input} placeholder="Morning (6 AM - 2 PM)" value={newShift} onChangeText={setNewShift} />

            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Staff</Text>}
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
  headerBox: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  iconBox: { width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  addBtn: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  searchBox: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 14, color: '#0F172A' },

  tabsWrapper: { marginBottom: 16 },
  tabsScroll: { paddingHorizontal: 20, gap: 8 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  tabBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  tabLabelActive: { color: '#fff' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 40, fontWeight: '600' },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  staffName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  staffRole: { fontSize: 12, color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  scorePill: { backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  scoreText: { color: '#D97706', fontSize: 12, fontWeight: '800' },

  cardBody: { padding: 16, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  detailValue: { fontSize: 13, color: '#0F172A', fontWeight: '700' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  actionBtnOutline: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  formScroll: { padding: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },
  
  imagePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  imgPreviewBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  imgBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  imgBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: '800', fontSize: 14 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
