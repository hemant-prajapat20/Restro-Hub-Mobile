import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter, usePathname, Slot } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.78;

// ──────────────────────────────────────────────
// Navigation items — exactly matching the web
// ──────────────────────────────────────────────
const businessNavItems = [
  { id: 'index',        label: 'Dashboard',         icon: '📊' },
  { id: 'pos',          label: 'Point of Sale',     icon: '🏪' },
  { id: 'restro',       label: 'Restro Signature',  icon: '🍽️', platform: 'Restaurant' },
  { id: 'bar',          label: 'Bar Lounge',        icon: '🍷', platform: 'Bar' },
  { id: 'cafe',         label: 'Cafe & Patisserie', icon: '☕', platform: 'Cafeteria' },
  { id: 'menu',         label: 'Menu Catalog',      icon: '📋' },
  { id: 'tables',       label: 'Tables',            icon: '🪑' },
  { id: 'kds',          label: 'Kitchen (KDS)',     icon: '👨‍🍳' },
  { id: 'delivery',     label: 'Online Orders',     icon: '🛍️' },
  { id: 'inventory',    label: 'Inventory',         icon: '📦' },
  { id: 'staff',        label: 'Staff Directory',   icon: '👥' },
  { id: 'customers',    label: 'Customer CRM',      icon: '📇' },
  { id: 'reports',      label: 'Reports & GST',     icon: '📈' },
  { id: 'transactions', label: 'Transactions',      icon: '📄' },
  { id: 'messages',     label: 'Message Center',    icon: '🔔' },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// ──────────────────────────────────────────────
// Sidebar Component
// ──────────────────────────────────────────────
interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const userPlatforms = user?.businessData?.platforms || [];
  const toggles = user?.businessData?.featureToggles || {};

  // Filter nav items based on user's purchased platforms & feature toggles
  const filteredNavItems = businessNavItems.filter(item => {
    if (item.platform && !userPlatforms.includes(item.platform)) return false;
    if (item.id === 'restro' && toggles.restaurant === false) return false;
    if (item.id === 'cafe' && toggles.cafe === false) return false;
    if (item.id === 'delivery' && toggles.onlineOrders === false) return false;
    if (item.id === 'tables' && toggles.reservations === false) return false;
    return true;
  });

  const currentSegment = pathname.split('/').pop();

  const navigateTo = (id: string) => {
    if (id === 'index') {
      router.push('/admin');
    } else {
      router.push(`/admin/${id}` as any);
    }
    onClose();
  };

  const handleLogout = () => {
    onClose();
    dispatch(logout());
    router.replace('/login');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={onClose} />
        <View style={styles.sidebar}>
          {/* Logo Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoIcon}>👑</Text>
              </View>
              <View>
                <Text style={styles.logoText}>
                  Restro<Text style={styles.logoAccent}>Hub</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Items */}
          <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
            {filteredNavItems.map((item) => {
              const isActive =
                currentSegment === item.id ||
                (currentSegment === 'admin' && item.id === 'index');
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => navigateTo(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navIcon}>{item.icon}</Text>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activePill} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bottom Section: Settings + Logout */}
          <View style={styles.sidebarFooter}>
            {bottomItems.map((item) => {
              const isActive = currentSegment === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => navigateTo(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navIcon}>{item.icon}</Text>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activePill} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ──────────────────────────────────────────────
// Header / Navbar Component
// ──────────────────────────────────────────────
interface HeaderProps {
  onOpenSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
  const roleDisplay = user ? user.role.replace('_', ' ') : 'Admin';
  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 'G';

  return (
    <View style={styles.header}>
      {/* Hamburger */}
      <TouchableOpacity onPress={onOpenSidebar} style={styles.hamburger} activeOpacity={0.7}>
        <Text style={styles.hamburgerIcon}>☰</Text>
      </TouchableOpacity>

      {/* Search placeholder */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>Search orders, menu...</Text>
      </View>

      {/* Right side: bell + avatar */}
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
      </View>
    </View>
  );
};

// ──────────────────────────────────────────────
// Admin Layout — wraps all /admin/* screens
// ──────────────────────────────────────────────
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },

  // ── Header / Navbar ──
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 4 : 48,
    paddingBottom: 6,
    height: 50 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 4 : 48),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  hamburger: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerIcon: {
    fontSize: 22,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 18,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileInfo: {
    alignItems: 'flex-end',
    maxWidth: 100,
  },
  profileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileRole: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366F1',
  },

  // ── Sidebar Overlay ──
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 50,
    flex: 1,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 38,
    height: 38,
    backgroundColor: '#6366F1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 18,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logoAccent: {
    color: '#6366F1',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.15)',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Navigation Items ──
  navList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  navIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
  },
  navLabelActive: {
    color: '#FFFFFF',
  },
  activePill: {
    width: 3,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },

  // ── Sidebar Footer ──
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    gap: 12,
    marginTop: 4,
  },
  logoutIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
