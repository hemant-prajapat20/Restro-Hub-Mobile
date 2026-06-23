import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
  TextInput,
  Image,
  FlatList,
  Vibration,
  Alert,
} from 'react-native';
import { useRouter, usePathname, Slot } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store';
import api from '../../utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

// ──────────────────────────────────────────────
// Notification Alert Helper (vibration)
// ──────────────────────────────────────────────
const playNotificationAlert = () => {
  Vibration.vibrate([0, 200, 100, 200]); // pattern: pause, buzz, pause, buzz
};

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

// Category icon mapping for notifications (same as web)
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'order': return '🛍️';
    case 'payment': return '💳';
    case 'inventory': return '📦';
    case 'reservation': return '📅';
    case 'staff': return '👥';
    case 'system': return '⚙️';
    default: return '🔔';
  }
};

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

  const filteredNavItems = businessNavItems.filter(item => {
    if (item.id === 'restro' && toggles.restaurant === false) return false;
    if (item.id === 'bar' && toggles.bar === false) return false;
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
              <Text style={styles.logoutIconText}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ──────────────────────────────────────────────
// Notification Dropdown Component
// ──────────────────────────────────────────────
interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  visible, onClose, notifications, onMarkAllRead, onMarkOneRead,
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.notifOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.notifDropdown}>
          {/* Header */}
          <View style={styles.notifHeader}>
            <Text style={styles.notifHeaderTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={onMarkAllRead}>
                <Text style={styles.notifMarkAll}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          {notifications.length === 0 ? (
            <View style={styles.notifEmpty}>
              <Text style={styles.notifEmptyText}>No new notifications</Text>
            </View>
          ) : (
            <FlatList
              data={notifications.slice(0, 20)}
              keyExtractor={(item, i) => item._id || String(i)}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
                  onPress={() => {
                    if (!item.isRead) onMarkOneRead(item._id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.notifItemIcon}>{getCategoryIcon(item.category)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemMsg, !item.isRead && styles.notifItemMsgBold]}>
                      {item.message}
                    </Text>
                    <Text style={styles.notifItemTime}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Footer */}
          <TouchableOpacity
            style={styles.notifFooter}
            onPress={() => {
              onClose();
              router.push('/admin/messages' as any);
            }}
          >
            <Text style={styles.notifFooterText}>View Message Center</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 'G';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchCache, setSearchCache] = useState<any>(null);

  const extractArray = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    // Look for any array value in the object
    const obj = res.data || res;
    if (typeof obj === 'object') {
      const vals = Object.values(obj);
      const arr = vals.find(v => Array.isArray(v));
      if (arr) return arr as any[];
    }
    return [];
  };

  const prefetchSearchData = async () => {
    if (searchCache) return;
    setLoading(true);
    try {
      const [menuRes, custRes, staffRes, invRes, orderRes, barRes, cafeRes, sigRes, pdrRes] = await Promise.all([
        api.get(`/menu`).catch(() => ({ data: [] })),
        api.get(`/customers`).catch(() => ({ data: [] })),
        api.get('/staff').catch(() => ({ data: [] })),
        api.get('/inventory').catch(() => ({ data: [] })),
        api.get('/orders').catch(() => ({ data: [] })),
        api.get('/barlounge/liquor').catch(() => ({ data: [] })),
        api.get('/cafebakery/items').catch(() => ({ data: [] })),
        api.get('/restro/signatures').catch(() => ({ data: [] })),
        api.get('/restro/pdrs').catch(() => ({ data: [] }))
      ]);

      setSearchCache({
        menu: extractArray(menuRes),
        cust: extractArray(custRes),
        staff: extractArray(staffRes),
        inv: extractArray(invRes),
        orders: extractArray(orderRes),
        bar: extractArray(barRes),
        cafe: extractArray(cafeRes),
        sig: extractArray(sigRes),
        pdr: extractArray(pdrRes)
      });
    } catch (err) {
      console.log('Search prefetch error:', err);
    } finally {
      if (query.length < 2) setLoading(false);
    }
  };

  const executeLocalSearch = (text: string, data: any) => {
    const lowerQuery = text.toLowerCase();
    const searchTerms = lowerQuery.split(/\s+/).filter(Boolean);
    const matchesSearch = (...fields: (string | undefined | null)[]) => {
      return searchTerms.every(term => fields.some(f => (f || '').toLowerCase().includes(term)));
    };

    const menuItems = data.menu
      .filter((i: any) => matchesSearch(i.name, i.category))
      .map((item: any) => ({ ...item, _type: 'menu', title: item.name, sub: `₹${item.price || 0} · ${item.category || 'Menu'}` }));
    
    const customers = data.cust
      .filter((i: any) => matchesSearch(i.firstName, i.lastName, i.name, i.email, i.phone))
      .map((item: any) => ({
        ...item, _type: 'customer', title: item.firstName ? `${item.firstName} ${item.lastName}` : item.name || 'Unknown', sub: item.email || item.phone || 'Customer'
      }));
    
    const staff = data.staff
      .filter((s: any) => matchesSearch(s.name, s.role))
      .map((item: any) => ({ ...item, _type: 'staff', title: item.name, sub: `${item.role} · ${item.shift}` }));
    
    const inventory = data.inv
      .filter((i: any) => matchesSearch(i.name, i.category))
      .map((item: any) => ({ ...item, _type: 'inventory', title: item.name, sub: `${item.quantity || 0} in stock · ${item.category || 'Item'}` }));
    
    const orders = data.orders
      .filter((o: any) => matchesSearch(o.orderId, o._id, o.id, o.customerDetails?.name, o.type))
      .map((item: any) => {
        const oId = item.orderId || item._id || item.id || '';
        const shortId = oId.slice(-8).toUpperCase();
        const amt = item.totalAmount || item.total || item.amount || 0;
        const isOnline = item.type === 'Delivery' || item.type === 'Takeaway';
        return { ...item, _type: isOnline ? 'order' : 'transaction', title: `Order ${shortId}`, sub: `${item.customerDetails?.name || 'Guest'} · ₹${amt} · ${item.type || 'POS'}` };
      });
    
    const barItems = data.bar
      .filter((i: any) => matchesSearch(i.name, i.category))
      .map((item: any) => ({ ...item, _type: 'bar', title: item.name, sub: `₹${item.pricePerGlass || 0} · ${item.category || 'Bar'}` }));
    
    const cafeItems = data.cafe
      .filter((i: any) => matchesSearch(i.name, i.category))
      .map((item: any) => ({ ...item, _type: 'cafe', title: item.name, sub: `₹${item.price || 0} · ${item.category || 'Cafe'}` }));
    
    const restroItems = [
      ...(data.sig || [])
        .filter((i: any) => matchesSearch(i.name, i.course))
        .map((item: any) => ({ ...item, _type: 'restro', title: item.name, sub: `₹${item.price || 0} · ${item.course || 'Restro Signature'}` })),
      ...(data.pdr || [])
        .filter((i: any) => matchesSearch(i.name, i.status))
        .map((item: any) => ({ ...item, _type: 'restro', title: item.name, sub: `${item.capacity || 0} pax · ${item.status || 'PDR Suite'}` }))
    ];

    setResults([
      ...menuItems.slice(0, 3),
      ...customers.slice(0, 3),
      ...staff.slice(0, 3),
      ...inventory.slice(0, 3),
      ...orders.filter((o:any) => o._type === 'transaction').slice(0, 3),
      ...orders.filter((o:any) => o._type === 'order').slice(0, 3),
      ...barItems.slice(0, 3),
      ...cafeItems.slice(0, 3),
      ...restroItems.slice(0, 3)
    ]);
    setLoading(false);
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    if (!searchCache) {
      setLoading(true);
      return;
    }

    executeLocalSearch(text, searchCache);
  };

  useEffect(() => {
    if (searchCache && query.length >= 2) {
      executeLocalSearch(query, searchCache);
    }
  }, [searchCache]);
  // Filter code replaced above

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'menu': return '🍽️';
      case 'customer': return '👤';
      case 'staff': return '👥';
      case 'inventory': return '📦';
      case 'order': return '🛍️';
      case 'transaction': return '📄';
      case 'bar': return '🍷';
      case 'cafe': return '☕';
      case 'restro': return '🍽️';
      default: return '🔍';
    }
  };

  const handleResultPress = (item: any) => {
    setIsSearchFocused(false);
    setQuery('');
    setResults([]);
    switch (item._type) {
      case 'menu': router.push('/admin/menu'); break;
      case 'customer': router.push('/admin/customers'); break;
      case 'staff': router.push('/admin/staff'); break;
      case 'inventory': router.push('/admin/inventory'); break;
      case 'order': router.push('/admin/delivery'); break;
      case 'transaction': router.push('/admin/transactions'); break;
      case 'bar': router.push('/admin/bar'); break;
      case 'cafe': router.push('/admin/cafe'); break;
      case 'restro': router.push('/admin/restro'); break;
      default: break;
    }
  };

  // Fetch notifications on mount (same logic as web Header)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/messages');
        if (res.data.status === 'success') {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.log('Failed to load notifications', err);
      }
    };
    fetchNotifications();

    // Poll every 30 seconds for new notifications (mobile-safe alternative to socket.io)
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/messages');
        if (res.data.status === 'success') {
          const newData = res.data.data;
          // Check for new unread messages
          const prevUnread = notifications.filter(n => !n.isRead).length;
          const newUnread = newData.filter((n: any) => !n.isRead).length;
          if (newUnread > prevUnread) {
            playNotificationAlert();
            Vibration.vibrate(300);
          }
          setNotifications(newData);
        }
      } catch (err) {
        // Silently fail for polling
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await api.put('/messages/read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markOneRead = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
    try {
      await api.put('/messages/read', { messageId: notifId });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.header}>
      {/* Search Overlay to catch outside clicks */}
      {isSearchFocused && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.searchOverlay}
          onPress={() => {
            setIsSearchFocused(false);
            import('react-native').then(rn => rn.Keyboard.dismiss());
          }}
        />
      )}

      {/* Hamburger */}
      <TouchableOpacity onPress={onOpenSidebar} style={styles.hamburger} activeOpacity={0.7}>
        <Text style={styles.hamburgerIcon}>☰</Text>
      </TouchableOpacity>

      {/* Inline Search bar */}
      <View style={[styles.searchBar, isSearchFocused && { borderColor: '#D4AF37', borderWidth: 1, backgroundColor: '#FFFFFF' }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInputInline}
          placeholder="Search menu, orders..."
          placeholderTextColor="#94A3B8"
          value={query}
          numberOfLines={1}
          multiline={false}
          onChangeText={handleSearch}
          onFocus={() => {
            setIsSearchFocused(true);
            prefetchSearchData();
          }}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Text style={styles.searchClearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Right side: bell + avatar */}
      <View style={styles.headerRight}>
        {/* Bell with notification badge */}
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => setShowNotifications(true)}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Profile avatar with actual image */}
        <TouchableOpacity 
          style={styles.avatar}
          onPress={() => router.push('/admin/settings')}
          activeOpacity={0.8}
        >
          {user?.profilePhoto ? (
            <Image
              source={{ uri: user.profilePhoto }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Notification Dropdown */}
      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAllRead={markAllRead}
        onMarkOneRead={markOneRead}
      />

      {/* Inline Dropdown mapped to an absolute positioned View */}
      {isSearchFocused && query.length >= 2 && (
        <View style={styles.inlineSearchDropdown}>
          {loading ? (
            <View style={styles.searchLoading}>
              <Text style={styles.searchLoadingText}>Searching the entire panel...</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item, i) => `${item._type}_${item._id || item.id || i}`}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.searchResultItem} 
                  activeOpacity={0.7}
                  onPress={() => handleResultPress(item)}
                >
                  <Text style={styles.searchResultIcon}>{getTypeIcon(item._type)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchResultName}>{item.title}</Text>
                    <Text style={styles.searchResultSub}>{item.sub}</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: '#CBD5E1' }}>›</Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.searchLoading}>
              <Text style={styles.searchLoadingText}>No results found. Search something else.</Text>
            </View>
          )}
        </View>
      )}
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
    zIndex: 100, // ensure dropdown sits on top
  },
  searchOverlay: {
    position: 'absolute',
    top: 50 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 4 : 48),
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'transparent',
    zIndex: 90,
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
  searchInputInline: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    padding: 0,
    margin: 0,
  },
  searchClearIcon: {
    fontSize: 12,
    color: '#94A3B8',
    padding: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D4AF37',
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
    height: '100%',
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
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
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
    color: '#D4AF37',
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
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37',
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
  logoutIconText: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // ── Notification Dropdown ──
  notifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 58 : 100,
    paddingHorizontal: 12,
  },
  notifDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  notifHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifMarkAll: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
  },
  notifEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  notifEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  notifItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
    alignItems: 'flex-start',
  },
  notifItemUnread: {
    backgroundColor: '#FFFBEB',
  },
  notifItemIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  notifItemMsg: {
    fontSize: 12,
    color: '#475569',
  },
  notifItemMsgBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  notifItemTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  notifFooter: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notifFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D4AF37',
  },

  // ── Inline Search Dropdown ──
  inlineSearchDropdown: {
    position: 'absolute',
    top: 50 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 4 : 48) + 2,
    left: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 101, // Must be higher than searchOverlay
  },
  searchModalHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchModalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchModalIcon: {
    fontSize: 16,
  },
  searchModalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  searchModalClose: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '600',
    padding: 4,
  },
  searchLoading: {
    padding: 24,
    alignItems: 'center',
  },
  searchLoadingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
    alignItems: 'center',
  },
  searchResultIcon: {
    fontSize: 20,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchResultSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
