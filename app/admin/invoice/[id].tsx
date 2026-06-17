import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import api from '../../../utils/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const toWords = (num: number): string => {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    let result = '';
    if (n >= 100) {
      result += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += a[n];
    }
    return result;
  };

  let result = '';
  let wholeNumber = Math.floor(num);
  
  if (wholeNumber >= 1000000) {
    result += convertLessThanOneThousand(Math.floor(wholeNumber / 1000000)) + 'Million ';
    wholeNumber %= 1000000;
  }
  if (wholeNumber >= 1000) {
    result += convertLessThanOneThousand(Math.floor(wholeNumber / 1000)) + 'Thousand ';
    wholeNumber %= 1000;
  }
  if (wholeNumber > 0) {
    result += convertLessThanOneThousand(wholeNumber);
  }

  return result.trim() + ' Rupees Only';
};

export default function InvoiceViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const businessData = user?.businessData;

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await api.get('/orders');
        const found = res.data.find((order: any) => order._id === id || order.id === id);
        setInvoice(found);
      } catch (err) {
        console.log('Error fetching invoice', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchInvoice();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C5A059" />
        <Text style={{ marginTop: 10 }}>Loading Invoice Data...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>Invoice not found!</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#0F172A' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const grandTotal = invoice.total || invoice.amount || 0;
  const subtotal = invoice.subtotal || (grandTotal - (invoice.tax || 0));
  const tax = invoice.tax || 0;
  
  const invoiceIdStr = String(invoice._id || invoice.id || '');
  const invoiceId = invoice.transactionId ? invoice.transactionId : invoiceIdStr.slice(-8).toUpperCase();
  const dateFormatted = new Date(invoice.createdAt || invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const handleWhatsApp = () => {
    const phone = invoice.customerDetails?.phone || '';
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const url = `whatsapp://send?phone=${finalPhone}&text=Hello! Here is your invoice link for RestroHub transaction ${invoiceId}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'WhatsApp is not installed on this device.');
        }
      });
    } else {
      Alert.alert('Error', 'No mobile number available for this customer');
    }
  };

  const generateHtml = () => {
    const itemsHtml = invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any, idx: number) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <p style="margin: 0; font-weight: bold; text-transform: uppercase;">${item.name}</p>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${(item.quantity || 1).toString().padStart(2, '0')}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${(item.price || (item.price * item.quantity)).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('') : `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; text-transform: uppercase;">Historical Order Data</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">01</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${subtotal.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${subtotal.toFixed(2)}</td>
      </tr>
    `;

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            .header { background-color: #C5A059; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 4px 0 0 0; font-size: 12px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .details > div { width: 48%; background: #f8f9fc; padding: 15px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f8f9fc; padding: 12px; text-transform: uppercase; font-size: 12px; color: #666; border-bottom: 2px solid #eee; text-align: left; }
            .totals { text-align: right; margin-top: 20px; }
            .totals p { margin: 5px 0; }
            .grand-total { font-size: 18px; font-weight: bold; color: #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="float: right; text-align: right;">
              <h2 style="margin:0;">INV/2026/${invoiceId}</h2>
              <p>Dated: ${dateFormatted}</p>
            </div>
            <h1>RESTROHUB</h1>
            <p>Premium Dining Solutions</p>
            <div style="clear: both;"></div>
          </div>
          
          <div class="details">
            <div>
              <p style="font-size: 10px; color: #666; text-transform: uppercase; margin-top: 0;">Customer Details</p>
              <h3 style="margin: 5px 0;">${invoice.customerDetails?.name || 'Walk-in Customer'}</h3>
              <p style="margin: 2px 0; font-size: 12px;">${invoice.customerDetails?.phone || 'N/A'}</p>
            </div>
            <div>
              <p style="font-size: 10px; color: #666; text-transform: uppercase; margin-top: 0;">Provider Information</p>
              <h3 style="margin: 5px 0;">${businessData?.name || 'RestroHub Center'}</h3>
              <p style="margin: 2px 0; font-size: 12px;">${businessData ? `${businessData.address}, ${businessData.district}` : 'Mumbai, Maharashtra'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
            <p>Tax: ₹${tax.toFixed(2)}</p>
            <p class="grand-total">Total: ₹${grandTotal.toFixed(2)}</p>
          </div>

          <div style="margin-top: 30px; background: #f8f9fc; padding: 15px; border-radius: 8px;">
            <p style="font-size: 10px; color: #666; text-transform: uppercase; margin-top: 0;">Amount In Words</p>
            <p style="margin: 5px 0; font-weight: bold; font-style: italic;">${toWords(grandTotal)}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const html = generateHtml();
      await Print.printAsync({
        html,
      });
    } catch (err) {
      Alert.alert('Error', 'Could not print invoice');
    }
  };

  return (
    <View style={styles.container}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.actionsRight}>
          <TouchableOpacity onPress={handleWhatsApp} style={styles.waBtn}>
            <Text style={styles.waBtnText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
            <Text style={styles.printBtnText}>Print</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.invoiceCard}>
          {/* Golden Header */}
          <View style={styles.goldenHeader}>
            <View>
              <Text style={styles.brandTitle}>RESTROHUB</Text>
              <Text style={styles.brandSub}>Premium Dining Solutions</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.invoiceLabel}>Tax Invoice</Text>
              <Text style={styles.invoiceNumber}>INV/2026/{invoiceId}</Text>
              <Text style={styles.invoiceDate}>Dated: {dateFormatted}</Text>
            </View>
          </View>

          <View style={styles.bodyPad}>
            {/* Grids */}
            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Customer Details</Text>
                <Text style={styles.infoName}>{invoice.customerDetails?.name || 'Walk-in Customer'}</Text>
                <Text style={styles.infoDetail}>{invoice.customerDetails?.phone || 'N/A'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Provider Information</Text>
                <Text style={styles.infoName}>{businessData?.name || 'RestroHub Center'}</Text>
                <Text style={styles.infoDetail}>{businessData?.contactPhone || 'N/A'}</Text>
              </View>
            </View>

            {/* Table */}
            <View style={styles.table}>
              <View style={styles.thRow}>
                <Text style={[styles.thText, { flex: 2 }]}>Service</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>Rate</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>Total</Text>
              </View>
              
              {invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any, idx: number) => (
                <View key={idx} style={styles.tdRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tdTextName}>{item.name}</Text>
                  </View>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{(item.quantity || 1).toString().padStart(2, '0')}</Text>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'right' }]}>₹{(item.price || (item.price * item.quantity)).toFixed(2)}</Text>
                  <Text style={[styles.tdTextBold, { flex: 1, textAlign: 'right' }]}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              )) : (
                <View style={styles.tdRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tdTextName}>Historical Order Data</Text>
                  </View>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>01</Text>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'right' }]}>₹{subtotal.toFixed(2)}</Text>
                  <Text style={[styles.tdTextBold, { flex: 1, textAlign: 'right' }]}>₹{subtotal.toFixed(2)}</Text>
                </View>
              )}
            </View>

            {/* Totals */}
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>₹{tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
                <Text style={[styles.totalLabel, { color: '#0F172A', fontWeight: '800' }]}>Grand Total</Text>
                <Text style={[styles.totalValue, { color: '#0F172A', fontSize: 18, fontWeight: '900' }]}>₹{grandTotal.toFixed(2)}</Text>
              </View>
            </View>

            {/* Bottom Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Amount In Words</Text>
              <Text style={styles.amountWords}>{toWords(grandTotal)}</Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800', textAlign: 'center' }}>
                ✓ E-Invoice Verified • No Signature Required
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 8 },
  backText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  actionsRight: { flexDirection: 'row', gap: 8 },
  waBtn: { backgroundColor: '#25D366', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  waBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  printBtn: { backgroundColor: '#C5A059', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  printBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  scrollContent: { padding: 16 },
  invoiceCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 40 },
  
  goldenHeader: { backgroundColor: '#C5A059', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  brandSub: { color: '#FFEDD5', fontSize: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  invoiceLabel: { color: '#FED7AA', fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  invoiceNumber: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  invoiceDate: { color: '#FFEDD5', fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

  bodyPad: { padding: 20 },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  infoTitle: { fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 4 },
  infoName: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  infoDetail: { fontSize: 11, fontWeight: '600', color: '#64748B' },

  table: { borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  thRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  thText: { fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
  tdRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  tdTextName: { fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' },
  tdText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tdTextBold: { fontSize: 12, fontWeight: '900', color: '#0F172A' },

  totalsBox: { alignSelf: 'flex-end', minWidth: '60%', marginBottom: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  totalValue: { fontSize: 12, fontWeight: '800', color: '#475569' },

  amountWords: { fontSize: 12, fontWeight: '900', fontStyle: 'italic', color: '#0F172A', textTransform: 'uppercase', marginTop: 4 },
});
