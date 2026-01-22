import { getCurrencySymbol } from '@/utils/_helpers';
import {
  Bell,
  Users
} from 'lucide-react-native';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Business, Transaction, UserProfile } from '../types';
import BusinessDetailView from './BusinessDetailView';

const { width } = Dimensions.get('window');





// --- Sub-components ---

function DashboardHome({ businesses, transactions, setCurrentBusiness, userProfile }: { businesses: Business[], transactions: Transaction[], setCurrentBusiness: (b: Business) => void, userProfile: UserProfile | null }) {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Decorative Header Background */}
      <View style={[styles.headerDecoration, { height: 240 + insets.top }]} />
      
      {/* Header */}
      <View style={[styles.modernHeader, { paddingTop: Math.max(insets.top, 40) }]}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.userNameText}>{userProfile?.name || 'John Doe'}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
           <Bell size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Manage{'\n'}your Cash Flow</Text>
            <Text style={styles.heroSubtitle}>Select a cashbook to track your daily business transactions effortlessly.</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Personal Assistant</Text>
            </View>
          </View>
      </View>

      {/* Businesses / Cashbooks List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Cashbooks</Text>
        <TouchableOpacity onPress={() => {}}>
           <Text style={styles.viewAllText}>Live Sync</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cashbooksListModern}>
        {businesses.map((business) => {
          const bizTransactions = transactions.filter(t => t.businessId === business.id);
          const balance = bizTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
          const symbol = getCurrencySymbol(business.currency);

          return (
            <TouchableOpacity
              key={business.id}
              style={styles.modernCashbookItem}
              onPress={() => setCurrentBusiness(business)}
            >
              <View style={[styles.cashbookIconModern, { backgroundColor: theme.colors.incomeBg }]}>
                <Users size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.cashbookInfoModern}>
                <Text style={styles.cashbookNameModern}>{business.name}</Text>
                <Text style={styles.cashbookMetaModern}>{business.memberCount || 1} Members · {business.currency || 'USD'}</Text>
              </View>
              <View style={styles.balanceContainerModern}>
                <Text style={[styles.cashbookBalanceModern, balance >= 0 ? { color: theme.colors.success } : { color: theme.colors.error }]}>
                  {balance >= 0 ? '+' : '-'}{symbol}{Math.abs(balance).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {businesses.length === 0 && (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Users size={40} color={theme.colors.placeholder} />
                </View>
                <Text style={styles.emptyText}>Go to Cashbooks tab to add your first business!</Text>
            </View>
        )}
      </View>
    </ScrollView>
  );
}


// --- Main Export ---

interface DashboardScreenProps {
  businesses: Business[];
  transactions: Transaction[];
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business | null) => void;
  saveTransactions: (transactions: Transaction[]) => void;
  userProfile: UserProfile | null;
}

export default function DashboardScreen({ businesses, transactions, currentBusiness, setCurrentBusiness, saveTransactions, userProfile }: DashboardScreenProps) {
  if (currentBusiness) {
    return (
      <BusinessDetailView 
        business={currentBusiness} 
        transactions={transactions.filter(t => t.businessId === currentBusiness.id)}
        allTransactions={transactions}
        onBack={() => setCurrentBusiness(null)}
        saveTransactions={saveTransactions}
      />
    );
  }

  return (
    <DashboardHome 
      businesses={businesses} 
      transactions={transactions} 
      setCurrentBusiness={setCurrentBusiness} 
      userProfile={userProfile}
    />
  );
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerDecoration: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: theme.colors.incomeBg, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, opacity: 0.6 },
  
  // Modern Header
  modernHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  greetingText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  userNameText: { fontSize: 26, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 },
  notificationBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },

  // Hero Section
  heroSection: { paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
  heroCard: { backgroundColor: theme.colors.primary, borderRadius: 32, padding: 24, elevation: 8, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  heroTitle: { fontSize: 30, fontWeight: 'bold', color: 'white', lineHeight: 38, marginBottom: 12 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 22, maxWidth: '85%' },
  heroBadge: { position: 'absolute', right: 20, top: 20, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroBadgeText: { fontSize: 10, color: 'white', fontWeight: 'bold' },

  // Balance Card
  modernBalanceCard: { backgroundColor: theme.colors.darkCard, marginHorizontal: 20, borderRadius: 24, padding: 24, height: 180, justifyContent: 'space-between', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, marginTop: 10 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceTitle: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  balanceSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: -15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNumber: { fontSize: 16, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  mastercardLogo: { flexDirection: 'row' },
  circle: { width: 20, height: 20, borderRadius: 10, opacity: 0.8 },

  // Stats Container
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginTop: 20 },
  statCardFixed: { flex: 1, padding: 16, borderRadius: 20, elevation: 1 },
  statIconContainer: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 2 },
  statValue: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text },

  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 32, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  viewAllText: { fontSize: 13, color: theme.colors.textSecondary },

  // Cashbooks List
  cashbooksListModern: { paddingHorizontal: 20, paddingBottom: 40 },
  modernCashbookItem: { backgroundColor: 'white', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cashbookIconModern: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  cashbookInfoModern: { flex: 1, marginLeft: 16 },
  cashbookNameModern: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cashbookMetaModern: { fontSize: 12, color: theme.colors.textSecondary },
  cashbookBalanceModern: { fontSize: 16, fontWeight: 'bold' },
  balanceContainerModern: { alignItems: 'flex-end', justifyContent: 'center' },

  // Detail View
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15 },
  detailBackBtn: { padding: 4 },
  detailTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  detailHeaderBtn: { padding: 4 },
  detailSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 20, paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, marginTop: 20 },
  detailSearchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  detailList: { paddingHorizontal: 20, marginTop: 24 },
  listLabel: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  modernTxItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  txIconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, marginLeft: 16 },
  txTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  txSubTitle: { fontSize: 12, color: theme.colors.textSecondary },
  txRight: { alignItems: 'flex-end' },
  txAmountModern: { fontSize: 16, fontWeight: 'bold' },

  // Bottom Actions
  modernBottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 20, gap: 12, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  bigActionBtnModern: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bigActionBtnTextModern: { fontSize: 15, fontWeight: 'bold' },

  // Modal Modern
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContentModern: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeaderModern: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitleModern: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  inputLabelModern: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 8 },
  modalInputLargeModern: { fontSize: 40, fontWeight: 'bold', color: theme.colors.text, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, paddingVertical: 8, marginBottom: 24 },
  categoryPicker: { flexDirection: 'row', marginBottom: 24 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.surface, marginRight: 8 },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryChipText: { fontSize: 14, color: theme.colors.textSecondary },
  categoryChipTextActive: { color: 'white', fontWeight: '500' },
  modalInputModern: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, paddingHorizontal: 16, fontSize: 15, marginBottom: 24 },
  submitBtnModern: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  submitBtnTextModern: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyState: { padding: 20, alignItems: 'center' },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center' },
});
