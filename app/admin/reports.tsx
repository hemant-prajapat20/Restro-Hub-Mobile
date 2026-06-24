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
  Modal,
  Platform,
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
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const generatedMonths = React.useMemo(() => {
    const months = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      d.setMonth(d.getMonth() - 1);
    }
    return months.reverse(); // chronological order
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const scrollViewRef = React.useRef<ScrollView>(null);

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
        <ActivityIndicator size="large" color="#D4AF37" />
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
    <>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D4AF37']} />}
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

      {/* ── Month Selector ── */}
      <View style={{ marginBottom: 20 }}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {generatedMonths.map((m) => {
            const isSelected = month === m;
            const date = new Date(`${m}-01`);
            const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            return (
              <TouchableOpacity 
                key={m}
                onPress={() => setMonth(m)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor: isSelected ? '#D4AF37' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: isSelected ? '#D4AF37' : '#E2E8F0'
                }}
              >
                <Text style={{ 
                  color: isSelected ? '#FFFFFF' : '#475569', 
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: 13
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
            <TouchableOpacity key={i} style={styles.invoiceRow} onPress={() => setSelectedInvoice(inv)}>
              <View>
                <Text style={styles.invId}>#{inv.transactionId || inv._id?.slice(-8).toUpperCase() || inv.id?.slice(-8).toUpperCase()}</Text>
                <Text style={styles.invDate}>{new Date(inv.date || inv.createdAt).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.invAmount}>₹{inv.amount?.toLocaleString() || inv.total?.toLocaleString()}</Text>
                <Text style={styles.invGst}>GST: ₹{inv.tax?.toLocaleString() || 0}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>

    {/* Transaction Details Modal */}
    <Modal visible={!!selectedInvoice} animationType="slide" transparent={true} onRequestClose={() => setSelectedInvoice(null)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedInvoice && (
            <>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>🧾 Transaction Details</Text>
                  <Text style={styles.modalSub}>ID: {selectedInvoice.transactionId || selectedInvoice._id?.slice(-8).toUpperCase() || selectedInvoice.id?.slice(-8).toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedInvoice(null)} style={styles.closeBtn}>
                  <Text style={{ fontSize: 20, color: '#94A3B8' }}>×</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                <View style={styles.customerBox}>
                  <Text style={styles.sectionLabel}>Customer Details</Text>
                  <Text style={styles.customerName}>{selectedInvoice.customerDetails?.name || 'Walk-in Customer'}</Text>
                  <Text style={styles.customerPhone}>{selectedInvoice.customerDetails?.phone || '+91 - Not Provided'}</Text>
                </View>

                <View style={styles.itemsBox}>
                  <Text style={styles.sectionLabel}>Order Items</Text>
                  {selectedInvoice.items?.length > 0 ? selectedInvoice.items.map((item: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemText}>{item.quantity}x {item.name}</Text>
                      <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                    </View>
                  )) : <Text style={styles.noDataText}>No items detailed.</Text>}
                </View>

                <View style={styles.totalsBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>₹{(selectedInvoice.subtotal || (selectedInvoice.amount - selectedInvoice.tax))?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>GST Applied</Text>
                    <Text style={styles.totalValue}>₹{selectedInvoice.tax?.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.totalRow, styles.grandTotalRow]}>
                    <Text style={styles.grandTotalLabel}>Grand Total ({selectedInvoice.paymentMethod})</Text>
                    <Text style={styles.grandTotalValue}>₹{(selectedInvoice.amount || selectedInvoice.total)?.toLocaleString()}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedInvoice(null)}>
                  <Text style={styles.backBtnText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  </>
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
  exportBtn: { backgroundColor: '#D4AF37', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
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
  invId: { fontWeight: '700', color: '#D4AF37' },
  invDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  invAmount: { fontWeight: '700', color: '#1E293B' },
  invGst: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 },
  closeBtn: { padding: 4, backgroundColor: '#F8FAFC', borderRadius: 20 },
  modalScroll: { marginBottom: 16 },
  customerBox: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, borderColor: '#FEF3C7', borderWidth: 1, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  customerPhone: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
  itemsBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderColor: '#F1F5F9', borderWidth: 1, marginBottom: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  itemPrice: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#0F172A' },
  totalsBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderColor: '#F1F5F9', borderWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  totalValue: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#0F172A', fontWeight: '700' },
  grandTotalRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4 },
  grandTotalLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  grandTotalValue: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#D4AF37', fontWeight: '800' },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  backBtn: { padding: 14, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center' },
  backBtnText: { color: '#64748B', fontWeight: '700', fontSize: 12, letterSpacing: 1 }
});
