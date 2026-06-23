import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Linking
} from 'react-native';
import api from '../../utils/api';

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedModule, setSelectedModule] = useState('All');
  const modules = ['All', 'Cafe', 'Bar', 'Restro', 'Online', 'Delivery', 'Signature'];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/customers');
      setTransactions(res.data);
    } catch (e) {

    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.phone?.includes(searchQuery) ||
                          t._id?.includes(searchQuery);
    
    let matchesModule = true;
    if (selectedModule !== 'All') {
      matchesModule = t.type === selectedModule || (selectedModule === 'Online' && t.type === 'Online/Delivery');
    }

    return matchesSearch && matchesModule;
  });

  const customerSpends: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.phone && t.phone !== 'N/A') {
      customerSpends[t.phone] = (customerSpends[t.phone] || 0) + t.total;
    }
  });
  const vvipCustomers = Object.values(customerSpends).filter(total => total > 20000).length;
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);

  const openWhatsApp = (phone: string, name: string) => {
    if (!phone || phone === 'N/A') return;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${cleanPhone}&text=Hello ${name}, thank you for visiting Restrohub!`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://wa.me/${cleanPhone}?text=Hello ${name}, thank you for visiting Restrohub!`;
        Linking.openURL(webUrl);
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 24 }}>📇</Text>
          <View>
            <Text style={styles.headerTitle}>Customer CRM</Text>
            <Text style={styles.headerSub}>Track global transactions and customer details</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Text style={{ fontSize: 20 }}>⭐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kpiLabel} numberOfLines={2}>VVIP Customers</Text>
              <Text style={styles.kpiValue} numberOfLines={1}>{vvipCustomers}</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Text style={{ fontSize: 20 }}>🧾</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kpiLabel} numberOfLines={2}>Total Transactions</Text>
              <Text style={styles.kpiValue} numberOfLines={1}>{transactions.length}</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Text style={{ fontSize: 20 }}>📈</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kpiLabel} numberOfLines={2}>Total Revenue</Text>
              <Text style={styles.kpiValue} numberOfLines={1}>₹{totalRevenue.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          <TextInput 
            style={styles.searchBar} 
            placeholder="Search name, phone, or ID..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {modules.map(mod => (
              <TouchableOpacity 
                key={mod} 
                style={[styles.filterBtn, selectedModule === mod && styles.filterBtnActive]}
                onPress={() => setSelectedModule(mod)}
              >
                <Text style={[styles.filterBtnTxt, selectedModule === mod && styles.filterBtnTxtActive]}>{mod}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#C5A059" style={{ marginTop: 40 }} />
        ) : filteredTransactions.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#94A3B8', fontWeight: '700' }}>No transactions found.</Text>
        ) : (
          <View style={styles.listContainer}>
            {filteredTransactions.map((tx) => (
              <View key={tx._id} style={styles.txCard}>
                <View style={styles.txTop}>
                  <View style={styles.txAvatar}>
                    <Text style={styles.txAvatarTxt}>{tx.name ? tx.name.charAt(0).toUpperCase() : '?'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.txName}>{tx.name}</Text>
                    <Text style={styles.txPhone}>📞 {tx.phone}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.txTotal}>₹{tx.total?.toLocaleString()}</Text>
                    <View style={styles.txTypeBadge}>
                      <Text style={styles.txTypeTxt}>{tx.type}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.txBottom}>
                  <View>
                    <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()} at {new Date(tx.date).toLocaleTimeString()}</Text>
                    <Text style={styles.txId}>ID: {tx._id.slice(-8).toUpperCase()}</Text>
                  </View>
                  {tx.phone && tx.phone !== 'N/A' && (
                    <TouchableOpacity 
                      style={styles.waBtn} 
                      onPress={() => openWhatsApp(tx.phone, tx.name)}
                    >
                      <Text style={styles.waBtnTxt}>Message on WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  kpiContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  kpiValue: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 2 },

  filters: { backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  searchBar: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  filterBtnActive: { backgroundColor: '#C5A059', borderColor: '#C5A059' },
  filterBtnTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filterBtnTxtActive: { color: '#fff' },

  listContainer: { gap: 8, paddingBottom: 100 },
  txCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  txTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  txAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  txAvatarTxt: { fontSize: 16, fontWeight: '900', color: '#D97706' },
  txName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  txPhone: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 4 },
  txTotal: { fontSize: 16, fontWeight: '900', color: '#10B981', textAlign: 'right' },
  txTypeBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  txTypeTxt: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },

  txBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  txDate: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  txId: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 2, fontFamily: 'monospace' },
  
  waBtn: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  waBtnTxt: { color: '#059669', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }
});
