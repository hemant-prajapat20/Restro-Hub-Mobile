import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import { RootState } from '../../store';

interface Address {
  _id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export default function SavedAddresses() {
  const user = useSelector((state: RootState) => state.auth.user);
  const queryClient = useQueryClient();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false
  });

  const { data, isLoading } = useQuery({
    queryKey: ['customerAddresses'],
    queryFn: () => api.get('/customer-orders/addresses').then(res => res.data),
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: (newAddr: any) => api.post('/customer-orders/addresses', newAddr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerAddresses'] });
      setShowAddForm(false);
      setNewAddress({ label: 'Home', street: '', city: '', state: '', zipCode: '', isDefault: false });
      Alert.alert('Success', 'Address saved successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save address');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customer-orders/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerAddresses'] });
      Alert.alert('Success', 'Address deleted');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete address');
    }
  });

  const addresses: Address[] = data?.data || [];

  const getIconForLabel = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home': return 'home';
      case 'work': return 'briefcase';
      default: return 'map';
    }
  };

  const handleSave = () => {
    if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      Alert.alert('Validation Error', 'Please fill in all address fields');
      return;
    }
    saveMutation.mutate(newAddress);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="location" size={28} color="#D4AF37" />
          <Text style={styles.headerTitle}>Saved Addresses</Text>
        </View>
        {!showAddForm && (
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => setShowAddForm(true)}
          >
            <Ionicons name="add" size={20} color="#1E293B" />
            <Text style={styles.addBtnText}>Add New</Text>
          </TouchableOpacity>
        )}
      </View>

      {showAddForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Add a new delivery address</Text>
          
          <View style={styles.labelRow}>
            {['Home', 'Work', 'Other'].map(lbl => (
              <TouchableOpacity
                key={lbl}
                style={[styles.labelBtn, newAddress.label === lbl && styles.labelBtnActive]}
                onPress={() => setNewAddress({ ...newAddress, label: lbl })}
              >
                <Ionicons 
                  name={getIconForLabel(lbl) as any} 
                  size={16} 
                  color={newAddress.label === lbl ? '#FFFFFF' : '#64748B'} 
                />
                <Text style={[styles.labelBtnText, newAddress.label === lbl && styles.labelBtnTextActive]}>
                  {lbl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 123 Main St, Apt 4B"
              value={newAddress.street}
              onChangeText={text => setNewAddress({ ...newAddress, street: text })}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                value={newAddress.city}
                onChangeText={text => setNewAddress({ ...newAddress, city: text })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                value={newAddress.state}
                onChangeText={text => setNewAddress({ ...newAddress, state: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP / Postal Code</Text>
            <TextInput
              style={styles.input}
              placeholder="ZIP Code"
              keyboardType="numeric"
              value={newAddress.zipCode}
              onChangeText={text => setNewAddress({ ...newAddress, zipCode: text })}
            />
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setShowAddForm(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Address</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.listContainer}>
        {addresses.length === 0 && !showAddForm ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No addresses saved</Text>
            <Text style={styles.emptySubtitle}>Add a delivery address to make checkout faster.</Text>
          </View>
        ) : (
          addresses.map(address => (
            <View key={address._id} style={styles.addressCard}>
              <View style={styles.addressIconContainer}>
                <Ionicons name={getIconForLabel(address.label) as any} size={24} color="#D4AF37" />
              </View>
              <View style={styles.addressDetails}>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText}>{address.street}</Text>
                <Text style={styles.addressText}>{address.city}, {address.state} {address.zipCode}</Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => {
                  Alert.alert(
                    'Delete Address',
                    'Are you sure you want to remove this address?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(address._id) }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E293B',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  formContainer: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  labelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  labelBtnActive: {
    backgroundColor: '#1E293B',
  },
  labelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  labelBtnTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  addressDetails: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  defaultBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 20,
  },
  deleteBtn: {
    padding: 8,
  },
});
