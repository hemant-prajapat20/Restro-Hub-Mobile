import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setCredentials } from '../../store/slices/authSlice';
import api from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();

  const [isStoreOpen, setIsStoreOpen] = useState(user?.businessData?.isStoreOpen ?? true);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingHotel, setIsUploadingHotel] = useState(false);

  // Local feature states simulating backend toggles
  const [features, setFeatures] = useState(() => {
    const backendToggles = user?.businessData?.featureToggles || {};
    return {
      notifications: backendToggles.notifications ?? true,
      onlineOrders: backendToggles.onlineOrders ?? true,
      vip: backendToggles.vip ?? true,
      cafe: backendToggles.cafe ?? true,
      restaurant: backendToggles.restaurant ?? true,
      bar: backendToggles.bar ?? true,
      reservations: backendToggles.reservations ?? true
    };
  });

  const toggleFeature = async (key: keyof typeof features) => {
    const newValue = !features[key];
    setFeatures(prev => ({ ...prev, [key]: newValue }));
    
    try {
      await api.put('/businesses/me/features', { featureToggles: { [key]: newValue } });
      const updatedUser = { 
        ...user, 
        businessData: { 
          ...user?.businessData, 
          featureToggles: { ...user?.businessData?.featureToggles, [key]: newValue } 
        } 
      } as any;
      dispatch(setCredentials({ user: updatedUser, token: token || '' }));
    } catch (error) {
      setFeatures(prev => ({ ...prev, [key]: !newValue })); // revert on failure
      Alert.alert('Error', 'Failed to save feature setting');
    }
  };

  const pickImage = async (type: 'profile' | 'hotel') => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'profile') {
        uploadProfileImage(result.assets[0].uri);
      } else {
        uploadHotelImage(result.assets[0].uri);
      }
    }
  };

  const uploadProfileImage = async (uri: string) => {
    setIsUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri,
        name: 'profile.jpg',
        type: 'image/jpeg'
      } as any);

      // Assume /upload endpoint returns { url: '...' }
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = uploadRes.data.url;
      const updateRes = await api.put('/auth/profile/photo', { profilePhoto: imageUrl });
      
      dispatch(setCredentials({
        user: { ...user, profilePhoto: updateRes.data.data.profilePhoto } as any,
        token: token || ''
      }));
      Alert.alert('Success', 'Profile photo updated');
    } catch (err) {
      console.log('Profile upload error', err);
      Alert.alert('Error', 'Failed to upload profile photo');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const uploadHotelImage = async (uri: string) => {
    setIsUploadingHotel(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri,
        name: 'hotel.jpg',
        type: 'image/jpeg'
      } as any);

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = uploadRes.data.url;
      const currentImages = user?.businessData?.hotelImages || [];
      const newImages = [...currentImages, imageUrl];
      
      await api.put('/businesses/me/hotel-images', { hotelImages: newImages });
      
      const updatedUser = { ...user, businessData: { ...user?.businessData, hotelImages: newImages } };
      dispatch(setCredentials({
        user: updatedUser as any,
        token: token || '' 
      }));
      Alert.alert('Success', 'Hotel picture added');
    } catch (err) {
      console.log('Hotel upload error', err);
      Alert.alert('Error', 'Failed to upload hotel picture');
    } finally {
      setIsUploadingHotel(false);
    }
  };

  const handleRemoveProfile = async () => {
    try {
      await api.put('/auth/profile/photo', { profilePhoto: null });
      dispatch(setCredentials({ user: { ...user, profilePhoto: null } as any, token: token || '' }));
      Alert.alert('Success', 'Profile photo removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove photo');
    }
  };

  const handleRemoveHotelImage = async (urlToRemove: string) => {
    try {
      const currentImages = user?.businessData?.hotelImages || [];
      const newImages = currentImages.filter((url: string) => url !== urlToRemove);
      await api.put('/businesses/me/hotel-images', { hotelImages: newImages });
      const updatedUser = { ...user, businessData: { ...user?.businessData, hotelImages: newImages } } as any;
      dispatch(setCredentials({ user: updatedUser, token: token || '' }));
      Alert.alert('Success', 'Picture removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove picture');
    }
  };

  const handleToggleStore = async (val: boolean) => {
    setIsStoreOpen(val);
    try {
      await api.put('/businesses/me/store-status', { isStoreOpen: val });
      const updatedUser = { ...user, businessData: { ...user?.businessData, isStoreOpen: val } } as any;
      dispatch(setCredentials({ user: updatedUser, token: token || '' }));
    } catch (err) {
      setIsStoreOpen(!val);
      Alert.alert('Error', 'Could not update store status');
    }
  };

  const hotelImages = user?.businessData?.hotelImages || [];

  return (
    <ScrollView style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerBox}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>⚙️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Business Settings</Text>
          <Text style={styles.headerSub}>Manage your profile, store hours, and feature toggles</Text>
        </View>
      </View>

      <View style={styles.contentPad}>
        
        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatarBox}>
              {user?.profilePhoto ? (
                <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarFallback}>👤</Text>
              )}
              {isUploadingProfile && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileRole}>{user?.role}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => pickImage('profile')}>
              <Text style={styles.outlineBtnText}>Change Photo</Text>
            </TouchableOpacity>
            {user?.profilePhoto && (
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]} onPress={handleRemoveProfile}>
                <Text style={[styles.outlineBtnText, { color: '#DC2626' }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Store Operations */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Store Operations</Text>
          
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Store Open Status</Text>
              <Text style={styles.settingDesc}>
                {isStoreOpen ? 'Accepting new orders' : 'Currently not accepting orders'}
              </Text>
            </View>
            <Switch
              value={isStoreOpen}
              onValueChange={handleToggleStore}
              trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
              thumbColor={'#ffffff'}
            />
          </View>
        </View>

        {/* Feature Toggles */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Active Modules & Features</Text>
          <Text style={styles.settingDesc}>Enable or disable specific features for your business based on your current plan.</Text>
          <View style={{ marginTop: 12 }}>
            {[
              { key: 'notifications', title: 'Push Notifications', desc: 'Receive instant alerts for new orders and reservations.', condition: true },
              { key: 'onlineOrders', title: 'Online Orders (Delivery)', desc: 'Accept delivery and takeaway orders from customers online.', condition: true },
              { key: 'vip', title: 'VIP Management', desc: 'Track and reward high-value customers with loyalty points.', condition: true },
              { key: 'restaurant', title: 'Restaurant Dining', desc: 'Full dining experience with KDS and POS billing.', condition: user?.businessData?.platforms?.includes('Restaurant') },
              { key: 'cafe', title: 'Cafe & Patisserie', desc: 'Quick service mode for cafes, bakeries, and coffee shops.', condition: user?.businessData?.platforms?.includes('Cafeteria') },
              { key: 'bar', title: 'Bar Lounge', desc: 'Manage bar inventory, drink menus, and tabs.', condition: user?.businessData?.platforms?.includes('Bar') },
              { key: 'cafeteria', title: 'Cafeteria', desc: 'Token-based ordering for corporate cafeterias and canteens.', condition: user?.businessData?.platforms?.includes('GenericCafeteria') },
              { key: 'reservations', title: 'Table Booking', desc: 'Allow customers to pre-book tables or event slots.', condition: true },
            ]
              .filter(item => item.condition)
              .map((item) => (
              <View key={item.key} style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.settingLabel}>{item.title}</Text>
                  <Text style={styles.settingDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={features[item.key as keyof typeof features]}
                  onValueChange={() => toggleFeature(item.key as keyof typeof features)}
                  trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
                  thumbColor={'#ffffff'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Hotel Media */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hotel Gallery</Text>
          <Text style={styles.settingDesc}>Upload images for your digital storefront and QR menus.</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <TouchableOpacity style={styles.addMediaBtn} onPress={() => pickImage('hotel')}>
              {isUploadingHotel ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Text style={styles.addMediaIcon}>+</Text>
              )}
            </TouchableOpacity>
            
            {hotelImages.map((uri: string, i: number) => (
              <View key={i} style={styles.hotelImageWrapper}>
                <Image source={{ uri }} style={styles.hotelImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => handleRemoveHotelImage(uri)}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBox: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  iconBox: { width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  contentPad: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },

  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16, letterSpacing: -0.2 },
  
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatarBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 28 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  profileEmail: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  profileRole: { fontSize: 11, color: '#6366F1', fontWeight: '800', textTransform: 'uppercase', marginTop: 4, backgroundColor: '#EEF2FF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  
  outlineBtn: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  outlineBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  settingLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  settingDesc: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  addMediaBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#F8FAFC' },
  addMediaIcon: { fontSize: 24, color: '#94A3B8' },
  hotelImageWrapper: { position: 'relative', marginRight: 12 },
  hotelImage: { width: 100, height: 100, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
