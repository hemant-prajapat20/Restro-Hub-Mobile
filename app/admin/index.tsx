import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const statCards = [
  { label: 'Active Orders',   value: '—', icon: '📦', color: '#6366F1', bg: '#EEF2FF' },
  { label: "Today's Revenue", value: '—', icon: '💰', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Customers',       value: '—', icon: '👥', color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Menu Items',      value: '—', icon: '🍽️', color: '#EC4899', bg: '#FDF2F8' },
];

export default function AdminDashboard() {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeGreeting}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},
            </Text>
            <Text style={styles.welcomeName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.welcomeRole}>
              {user?.businessData?.businessName || 'Business Admin'}
            </Text>
          </View>
          <View style={styles.welcomeAvatar}>
            <Text style={styles.welcomeAvatarText}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: card.bg }]}>
              <Text style={styles.statIcon}>{card.icon}</Text>
            </View>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {[
          { label: 'New Order',    icon: '➕' },
          { label: 'Menu',         icon: '📋' },
          { label: 'Tables',       icon: '🪑' },
          { label: 'Reports',      icon: '📈' },
        ].map((action, i) => (
          <TouchableOpacity key={i} style={styles.quickAction} activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity Placeholder */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        <Text style={styles.activityEmpty}>No recent activity yet.</Text>
        <Text style={styles.activitySub}>Orders and events will appear here in real-time.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Welcome Card
  welcomeCard: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  welcomeRole: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginTop: 4,
  },
  welcomeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  welcomeAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%' as any,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },

  // Activity
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityEmpty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  activitySub: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 4,
  },
});
