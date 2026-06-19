import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ──────────────────────────────────────────────
// Stat Card Component
// ──────────────────────────────────────────────
const StatCard = ({ title, value, subValue, trend, icon, bgColor }: any) => (
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

export default function ReportsScreen() {
  const [month, setMonth] = useState('2026-04'); // default for demo
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socketUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://192.168.1.100:5000';
    const socket = io(socketUrl);
    socket.on('newOrder', () => {
      queryClient.invalidateQueries({ queryKey: ['businessReports', month] });
    });
    return () => {
      socket.disconnect();
    };
  }, [queryClient, month]);

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['businessReports', month],
    queryFn: async () => {
      const response = await api.get('/analytics/business/reports', { params: { month } });
      return response.data.data;
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !reports) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading Reports & GST...</Text>
      </View>
    );
  }

  const { 
    netRevenue = 0, 
    totalGst = 0, 
    operatingCost = 0, 
    netProfit = 0, 
    inventoryValue = 0,
    paymentMethodData = [],
    topFoodItems = [],
    yearlySalesData = [],
    inventoryAlerts = [],
    recentInvoices = []
  } = reports || {};

  // Formatter for PieChart
  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const formattedPieData = paymentMethodData.map((item: any, idx: number) => ({
    name: item.name,
    population: item.value,
    color: pieColors[idx % pieColors.length],
    legendFontColor: '#64748B',
    legendFontSize: 12,
  }));

  // Formatter for BarChart
  const barData = {
    labels: topFoodItems.slice(0, 5).map((i: any) => i.name.substring(0, 8)),
    datasets: [{ data: topFoodItems.slice(0, 5).map((i: any) => i.sales || 0) }]
  };

  // Formatter for Yearly Sales Chart
  const lineData = {
    labels: yearlySalesData.slice(-6).map((i: any) => i.name.substring(0, 3)),
    datasets: [{ data: yearlySalesData.slice(-6).map((i: any) => i.sales || 0) }]
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#4F46E5' }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit>Financial Audit & GST</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Enterprise compliance & profit analysis</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn}>
          <Text style={styles.exportBtnText}>📥 Export</Text>
        </TouchableOpacity>
      </View>

      {/* ── KPI Stat Cards ── */}
      <View style={styles.statsRow}>
        <StatCard title="Net Revenue" value={`₹${netRevenue.toLocaleString()}`} subValue="vs last month" trend={15.2} icon="📊" bgColor="#EFF6FF" />
        <StatCard title="Total GST (5%)" value={`₹${totalGst.toLocaleString()}`} subValue="vs last month" trend={12.8} icon="🧾" bgColor="#ECFDF5" />
      </View>
      <View style={styles.statsRow}>
        <StatCard title="Operating Cost" value={`₹${operatingCost.toLocaleString()}`} subValue="vs last month" trend={-4.2} icon="📉" bgColor="#FFF7ED" />
        <StatCard title="Net Profit" value={`₹${netProfit.toLocaleString()}`} subValue="vs last month" trend={22.4} icon="💰" bgColor="#F5F3FF" />
      </View>
      <View style={styles.statsRow}>
        <StatCard title="Inventory Value" value={`₹${inventoryValue.toLocaleString()}`} subValue="current holding" trend={5.1} icon="📦" bgColor="#FEF2F2" />
      </View>

      {/* ── Charts ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Revenue by Payment Method</Text>
        {formattedPieData.length > 0 ? (
          <PieChart
            data={formattedPieData}
            width={SCREEN_WIDTH - 64}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[0, 0]}
          />
        ) : (
          <Text style={styles.noDataText}>No payment data available</Text>
        )}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Most Purchased Food Items</Text>
        {barData.labels.length > 0 ? (
          <BarChart
            data={barData}
            width={SCREEN_WIDTH - 64}
            height={220}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={{...chartConfig, color: (o = 1) => `rgba(16, 185, 129, ${o})`}}
            verticalLabelRotation={30}
          />
        ) : (
          <Text style={styles.noDataText}>No food sales data</Text>
        )}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Yearly Sales Trend (Last 6 Mos)</Text>
        {lineData.labels.length > 0 ? (
          <LineChart
            data={lineData}
            width={SCREEN_WIDTH - 64}
            height={220}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={{...chartConfig, color: (o = 1) => `rgba(139, 92, 246, ${o})`}}
            bezier
          />
        ) : (
          <Text style={styles.noDataText}>No yearly trend data</Text>
        )}
      </View>

      {/* ── Inventory Alerts ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>⚠️ Low Stock Alerts</Text>
        {inventoryAlerts.length === 0 ? (
          <View style={styles.noAlertsBox}>
            <Text style={styles.noAlertsText}>All items well-stocked.</Text>
          </View>
        ) : (
          inventoryAlerts.map((item: any, i: number) => (
            <View key={i} style={styles.alertRow}>
              <Text style={styles.alertName}>{item.name}</Text>
              <Text style={styles.alertQty}>Remaining: {item.quantityInStock} {item.unit}</Text>
            </View>
          ))
        )}
      </View>

      {/* ── Recent Invoices ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Recent Invoices</Text>
        {recentInvoices.length === 0 ? (
          <Text style={styles.noDataText}>No recent invoices.</Text>
        ) : (
          recentInvoices.map((inv: any, i: number) => (
            <View key={i} style={styles.invoiceRow}>
              <View>
                <Text style={styles.invId}>#{inv.transactionId || inv._id?.slice(-8).toUpperCase() || inv.id?.slice(-8).toUpperCase()}</Text>
                <Text style={styles.invDate}>{new Date(inv.date || inv.createdAt).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.invAmount}>₹{inv.total?.toLocaleString()}</Text>
                <Text style={styles.invGst}>GST: ₹{inv.tax?.toLocaleString() || 0}</Text>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B', fontWeight: '500' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  headerSub: { fontSize: 14, color: '#64748B', marginTop: 2, fontWeight: '500' },
  exportBtn: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  exportBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 24,
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  statTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statIcon: { fontSize: 20 },

  chartCard: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  noDataText: { textAlign: 'center', color: '#94A3B8', padding: 20 },
  
  noAlertsBox: { backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12 },
  noAlertsText: { color: '#059669', fontWeight: '600' },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 8 },
  alertName: { color: '#1E293B', fontWeight: 'bold' },
  alertQty: { color: '#EF4444', fontWeight: '600', fontSize: 12 },

  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 12 },
  invId: { fontWeight: '700', color: '#6366F1' },
  invDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  invAmount: { fontWeight: '700', color: '#1E293B' },
  invGst: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '600' },
});
