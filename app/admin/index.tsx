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
  Dimensions,
  Modal
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState } from '../../store';
import api from '../../utils/api';
import { LineChart, PieChart } from 'react-native-chart-kit';

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
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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
          value={`₹${(totalRevenue || 0).toLocaleString()}`}
          subValue="all time"
          trend={4.2}
          icon="🛍️"
          bgColor="#FFF7ED"
        />
        <StatCard
          title="Today Revenue"
          value={`₹${(dailyRevenue || 0).toLocaleString()}`}
          subValue="vs yesterday"
          trend={12.5}
          icon="💳"
          bgColor="#EFF6FF"
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Today Total Order"
          value={totalOrders || 0}
          subValue="today's count"
          trend={5.4}
          icon="⏱️"
          bgColor="#FFFBEB"
        />
        <StatCard
          title="Total Staff"
          value={activeTotalStaff || 0}
          subValue="currently active"
          trend={2.1}
          icon="👥"
          bgColor="#ECFDF5"
        />
      </View>

      {/* ── Revenue Velocity Chart ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Revenue Velocity</Text>
        <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Live sales performance across day parts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: ["8am", "12pm", "4pm", "8pm", "12am"],
              datasets: [{ data: [1200, 5500, 3200, 9800, 3100] }]
            }}
            width={Dimensions.get("window").width - 48}
            height={220}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#4F46E5" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </ScrollView>
      </View>

      {/* ── Live Staff Activity ── */}
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={styles.sectionTitle}>Live Staff Activity</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Currently clocked in members</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/admin/staff')}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#6366F1', textTransform: 'uppercase', letterSpacing: 1 }}>View All</Text>
          </TouchableOpacity>
        </View>

        {staff.length > 0 ? (
          staff.map((member: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>{member.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{member.name}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{member.role}</Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: member.status === 'Clocked In' ? '#DCFCE7' : '#FEF3C7' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: member.status === 'Clocked In' ? '#16A34A' : '#D97706' }}>{member.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No staff currently clocked in.</Text>
        )}
      </View>

      {/* ── Sales Mix by Category ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sales Mix by Category</Text>
        {categoryData.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative', height: 180 }}>
              <PieChart
                data={categoryData.slice(0, 5).map((c: any) => ({
                  name: c.name,
                  population: c.value,
                  color: c.color || '#' + Math.floor(Math.random() * 16777215).toString(16),
                  legendFontColor: '#64748B',
                  legendFontSize: 12
                }))}
                width={Dimensions.get("window").width - 48}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"0"}
                center={[((Dimensions.get("window").width - 48) / 4), 0]}
                hasLegend={false}
              />
              {/* Fake Donut Hole */}
              <View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFFFFF' }} />
            </View>

            {/* Custom Legend */}
            <View style={{ marginTop: 24, gap: 16 }}>
              {categoryData.slice(0, 5).map((cat: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color || '#D4AF37' }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>{cat.name}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{cat.value}%</Text>
                </View>
              ))}
            </View>
          </View>
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
              <TouchableOpacity key={i} style={styles.tableRow} onPress={() => setSelectedInvoice(order)}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.billId, { color: '#4F46E5' }]}>#{shortId}</Text>
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
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No recent transactions</Text>
        )}
      </View>

      {/* ── Invoice Modal ── */}
      <Modal visible={!!selectedInvoice} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E293B' }}>Invoice Details</Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                <Text style={{ fontSize: 16, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedInvoice && (
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>Bill ID</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>#{selectedInvoice.transactionId || (selectedInvoice._id || '').slice(-8).toUpperCase()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                    <View>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Date</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Module</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#4F46E5' }}>{selectedInvoice.type}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>Items</Text>
                  {(selectedInvoice.items || []).map((item: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: '#334155' }}>{item.item?.name || item.name}</Text>
                        <Text style={{ fontSize: 12, color: '#94A3B8' }}>{item.quantity} x ₹{item.price || item.item?.price}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>₹{(item.quantity * (item.price || item.item?.price || 0)).toLocaleString()}</Text>
                    </View>
                  ))}

                  <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: '#64748B' }}>Subtotal</Text>
                      <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}>₹{(selectedInvoice.subtotal || 0).toLocaleString()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: '#64748B' }}>Tax (10%)</Text>
                      <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}>₹{(selectedInvoice.tax || 0).toLocaleString()}</Text>
                    </View>
                    {selectedInvoice.discount > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, color: '#10B981' }}>Discount</Text>
                        <Text style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>-₹{(selectedInvoice.discount || 0).toLocaleString()}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Total Paid</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#4F46E5' }}>₹{(selectedInvoice.total || selectedInvoice.amount || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
