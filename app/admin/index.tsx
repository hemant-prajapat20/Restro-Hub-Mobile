import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState } from '../../store';
import api from '../../utils/api';

// ──────────────────────────────────────────────
// Stat Card Component (matches web's StatCard)
// ──────────────────────────────────────────────
const StatCard = ({ title, value, subValue, trend, icon, bgColor, trendColor }: any) => (
  <View style={styles.statCard}>
    <View style={{ flex: 1 }}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statTrendRow}>
        <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={{ fontSize: 10, color: trend > 0 ? '#16A34A' : '#DC2626', fontWeight: '700' }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </Text>
        </View>
        <Text style={styles.statSub}>{subValue}</Text>
      </View>
    </View>
    <View style={[styles.statIconBox, { backgroundColor: bgColor }]}>
      <Text style={styles.statIcon}>{icon}</Text>
    </View>
  </View>
);

// ──────────────────────────────────────────────
// Progress Bar Component
// ──────────────────────────────────────────────
const ProgressBar = ({ progress, color }: { progress: number; color: string }) => (
  <View style={styles.progressBg}>
    <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` as any, backgroundColor: color }]} />
  </View>
);

// ──────────────────────────────────────────────
// Dashboard Screen
// ──────────────────────────────────────────────
export default function AdminDashboard() {
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      // Fetch all data in parallel — same endpoints as web
      const [analyticsRes, ordersRes, staffRes] = await Promise.all([
        api.get('/analytics/business'),
        api.get('/orders'),
        api.get('/staff'),
      ]);

      setAnalytics(analyticsRes.data.data);
      setRecentOrders((ordersRes.data || []).slice(0, 6));
      setStaff(
        (staffRes.data || [])
          .filter((s: any) => s.status === 'Clocked In' || s.status === 'On Break')
          .slice(0, 5)
      );
    } catch (err) {
      console.log('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const {
    dailyRevenue = 0,
    totalRevenue = 0,
    totalOrders = 0,
    activeTotalStaff = 0,
    categoryData = [],
    topItems = [],
    aiInsights = [],
    moduleAnalytics = [],
  } = analytics || {};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
    >
      {/* ── KPI Stat Cards (same 4 as web) ── */}
      <View style={styles.statsRow}>
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue?.toLocaleString()}`}
          subValue="all time"
          trend={4.2}
          icon="🛍️"
          bgColor="#FFF7ED"
        />
        <StatCard
          title="Today Revenue"
          value={`₹${dailyRevenue?.toLocaleString()}`}
          subValue="vs yesterday"
          trend={12.5}
          icon="💳"
          bgColor="#EFF6FF"
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Today Orders"
          value={totalOrders}
          subValue="today's count"
          trend={5.4}
          icon="⏱️"
          bgColor="#FFFBEB"
        />
        <StatCard
          title="Total Staff"
          value={activeTotalStaff}
          subValue="currently active"
          trend={2.1}
          icon="👥"
          bgColor="#ECFDF5"
        />
      </View>

      {/* ── AI Business Insights (dark card, same as web) ── */}
      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiHeaderIcon}>⚡</Text>
          <Text style={styles.aiHeaderTitle}>AI BUSINESS INSIGHTS</Text>
        </View>
        {aiInsights && aiInsights.length > 0 ? (
          aiInsights.map((insight: any, i: number) => (
            <View key={i} style={styles.aiInsightBox}>
              <Text style={styles.aiInsightTitle}>{insight.title}</Text>
              <Text style={styles.aiInsightDesc}>{insight.description}</Text>
              {insight.action && (
                <Text style={styles.aiInsightAction}>{insight.action}</Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.aiInsightBox}>
            <Text style={styles.aiInsightDesc}>Not enough data to generate insights yet.</Text>
          </View>
        )}
      </View>

      {/* ── Sales Mix by Category ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sales Mix by Category</Text>
        {categoryData.length > 0 ? (
          categoryData.slice(0, 5).map((cat: any, i: number) => (
            <View key={i} style={styles.categoryRow}>
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text style={styles.categoryName}>{cat.name}</Text>
              </View>
              <Text style={styles.categoryValue}>{cat.value}%</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No category data available yet.</Text>
        )}
      </View>

      {/* ── Top Performing Items ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Top Performing Items</Text>
        {topItems && topItems.length > 0 ? (
          topItems.slice(0, 5).map((item: any, i: number) => (
            <View key={i} style={styles.topItemRow}>
              <View style={styles.topItemInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.topItemName}>{item.name}</Text>
                  <Text style={styles.topItemSales}>{item.sales} units sold</Text>
                </View>
                <Text style={styles.topItemRevenue}>{item.revenue}</Text>
              </View>
              <ProgressBar progress={item.progress || 0} color="#6366F1" />
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No sales data available yet.</Text>
        )}
      </View>

      {/* ── Department Analytics ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Department Analytics</Text>
        {moduleAnalytics && moduleAnalytics.length > 0 ? (
          moduleAnalytics.slice(0, 5).map((mod: any, i: number) => {
            const totalRev = moduleAnalytics.reduce((sum: number, m: any) => sum + m.revenue, 0) || 1;
            const progress = Math.round((mod.revenue / totalRev) * 100);
            return (
              <View key={i} style={styles.topItemRow}>
                <View style={styles.topItemInfo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topItemName}>{mod.name}</Text>
                    <Text style={styles.topItemSales}>{mod.count} orders processed</Text>
                  </View>
                  <Text style={[styles.topItemRevenue, { color: '#10B981' }]}>₹{mod.revenue?.toLocaleString()}</Text>
                </View>
                <ProgressBar progress={progress} color="#10B981" />
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No department data available yet.</Text>
        )}
      </View>

      {/* ── Recent Transactions ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Text style={styles.sectionSubtitle}>Last 6 platform transactions</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/admin/transactions' as any)}>
            <Text style={styles.viewAllBtn}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>BILL ID</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>MODULE</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>AMOUNT</Text>
        </View>

        {recentOrders.length > 0 ? (
          recentOrders.map((order: any, i: number) => {
            const invId = order._id || order.id || '';
            const shortId = order.transactionId || (invId ? invId.slice(-8).toUpperCase() : 'N/A');
            return (
              <View key={i} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.billId}>#{shortId}</Text>
                  <Text style={styles.billDate}>
                    {new Date(order.createdAt || order.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={styles.moduleBadge}>
                    <Text style={styles.moduleBadgeText}>{order.type}</Text>
                  </View>
                </View>
                <Text style={[styles.orderAmount, { flex: 1, textAlign: 'right' }]}>
                  ₹{order.total?.toLocaleString() || order.amount?.toLocaleString()}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No recent transactions</Text>
        )}
      </View>

      {/* ── Live Staff Activity ── */}
      <View style={[styles.sectionCard, { marginBottom: 40 }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Live Staff Activity</Text>
            <Text style={styles.sectionSubtitle}>Currently clocked in members</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/admin/staff' as any)}>
            <Text style={styles.viewAllBtn}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {staff.length > 0 ? (
          staff.map((member: any, i: number) => (
            <View key={i} style={styles.staffRow}>
              <View style={styles.staffLeft}>
                <Image
                  source={{ uri: member.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}` }}
                  style={styles.staffAvatar}
                />
                <View>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffRole}>{member.role}</Text>
                </View>
              </View>
              <View style={[
                styles.staffStatusBadge,
                { backgroundColor: member.status === 'Clocked In' ? '#DCFCE7' : '#FEF3C7' }
              ]}>
                <Text style={[
                  styles.staffStatusText,
                  { color: member.status === 'Clocked In' ? '#15803D' : '#B45309' }
                ]}>
                  {member.status}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No staff currently clocked in</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16 },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B', fontWeight: '600' },

  // Stat Cards
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  statTitle: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  statSub: { fontSize: 9, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statIcon: { fontSize: 20 },

  // AI Insights Card
  aiCard: {
    backgroundColor: '#0F172A', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  aiHeaderIcon: { fontSize: 16 },
  aiHeaderTitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 2, textTransform: 'uppercase' },
  aiInsightBox: {
    backgroundColor: 'rgba(255,255,255,0.1)', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10,
  },
  aiInsightTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  aiInsightDesc: { fontSize: 12, color: '#94A3B8' },
  aiInsightAction: { fontSize: 12, fontWeight: '700', color: '#6366F1', marginTop: 8 },

  // Section Cards
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  sectionSubtitle: { fontSize: 12, color: '#64748B', marginTop: -12, marginBottom: 16 },
  viewAllBtn: { fontSize: 10, fontWeight: '700', color: '#6366F1', letterSpacing: 1.5 },

  // Category
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 13, fontWeight: '500', color: '#475569' },
  categoryValue: { fontSize: 13, fontWeight: '700', color: '#0F172A' },

  // Top Items & Module Analytics
  topItemRow: { marginBottom: 16 },
  topItemInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  topItemName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  topItemSales: { fontSize: 11, color: '#64748B', marginTop: 2 },
  topItemRevenue: { fontSize: 13, fontWeight: '700', color: '#0F172A' },

  // Progress Bar
  progressBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  // Transactions Table
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8,
  },
  tableHeaderText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  billId: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  billDate: { fontSize: 9, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  moduleBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  moduleBadgeText: { fontSize: 9, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', letterSpacing: 1 },
  orderAmount: { fontSize: 13, fontWeight: '800', color: '#10B981' },

  // Staff Activity
  staffRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FAFAF9', borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#F5F5F4',
  },
  staffLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  staffAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF',
    borderWidth: 2, borderColor: '#fff',
  },
  staffName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  staffRole: { fontSize: 11, color: '#64748B' },
  staffStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  staffStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  // Empty
  emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
});
