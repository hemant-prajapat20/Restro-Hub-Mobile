import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import api from '../../utils/api';
import { io, Socket } from 'socket.io-client';

const TABS = [
  { id: 'all', label: 'All', icon: '🔔' },
  { id: 'order', label: 'Orders', icon: '🛍️' },
  { id: 'payment', label: 'Payments', icon: '💳' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'reservation', label: 'Reservations', icon: '📅' },
  { id: 'staff', label: 'Staff', icon: '👥' },
  { id: 'system', label: 'System', icon: '⚙️' },
];

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

export default function MessageCenterScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchMessages = async () => {
    try {
      const response = await api.get('/messages');
      setMessages(response.data.data || []);
    } catch (err) {
      console.log('Failed to fetch messages', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Use environment variable or default
    const socketUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://192.168.1.100:5000';
    const socket: Socket = io(socketUrl);

    socket.on('newMessage', () => {
      fetchMessages();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDoubleClick = async (messageId: string, isRead: boolean) => {
    if (!isRead) {
      try {
        await api.put('/messages/read', { messageId });
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isRead: true } : m));
      } catch (e) {
        console.log('Failed to mark as read', e);
      }
    }
  };

  const filteredMessages = messages.filter((msg: any) => {
    const matchesSearch = 
      (msg.message || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (msg.action || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || msg.category === activeTab || (!msg.category && activeTab === 'system');
    return matchesSearch && matchesTab;
  });

  return (
    <View style={styles.container}>
      {/* Header & Search */}
      <View style={styles.headerCard}>
        <View style={styles.headerInfo}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>🔔</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Message Center</Text>
            <Text style={styles.headerSub}>System alerts, updates, and notifications</Text>
          </View>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : filteredMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>📭</Text>
            <Text style={styles.emptyText}>No messages found in this category.</Text>
          </View>
        ) : (
          <View style={styles.messagesCard}>
            {filteredMessages.map((msg: any) => (
              <TouchableOpacity
                key={msg._id}
                style={[styles.msgRow, !msg.isRead && styles.msgRowUnread]}
                onPress={() => handleDoubleClick(msg._id, msg.isRead)}
                activeOpacity={0.7}
              >
                <View style={styles.msgIconCol}>
                  {!msg.isRead && <View style={styles.unreadDot} />}
                  <Text style={{ fontSize: 20 }}>{getCategoryIcon(msg.category)}</Text>
                </View>
                <View style={styles.msgBody}>
                  <View style={styles.msgTitleRow}>
                    <Text style={[styles.msgAction, msg.isRead ? styles.textDim : styles.textBold]}>{msg.action}</Text>
                    <View style={styles.timePill}>
                      <Text style={styles.timeText}>{new Date(msg.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.msgText, msg.isRead ? styles.textDim : styles.textBold]}>{msg.message}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  iconBox: { width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  searchInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 14, color: '#0F172A' },

  tabsWrapper: { marginBottom: 8 },
  tabsScroll: { paddingHorizontal: 16, gap: 8 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  tabBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  tabIcon: { fontSize: 14, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  tabLabelActive: { color: '#fff' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#64748B' },

  messagesCard: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  msgRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  msgRowUnread: { backgroundColor: '#EEF2FF', borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  msgIconCol: { marginRight: 12, position: 'relative', marginTop: 2 },
  unreadDot: { position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366F1', borderWidth: 2, borderColor: '#EEF2FF', zIndex: 2 },
  msgBody: { flex: 1 },
  msgTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  msgAction: { flex: 1, fontSize: 14, marginRight: 8 },
  timePill: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  timeText: { fontSize: 9, fontWeight: '700', color: '#64748B' },
  msgText: { fontSize: 13, lineHeight: 18 },
  textBold: { fontWeight: '800', color: '#0F172A' },
  textDim: { fontWeight: '500', color: '#64748B' },
});
