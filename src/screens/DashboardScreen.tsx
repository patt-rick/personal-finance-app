import { getCurrencySymbol } from '../utils/_helpers';
import {
  Bell,
  Users
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { Business, Transaction, UserProfile } from '../types';
import BusinessDetailView from './BusinessDetailView';
import { createDashboardStyles } from '../styles/dashboardStyles';

const { width } = Dimensions.get('window');

// --- Sub-components ---

function DashboardHome({ businesses, transactions, setCurrentBusiness, userProfile }: { businesses: Business[], transactions: Transaction[], setCurrentBusiness: (b: Business) => void, userProfile: UserProfile | null }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createDashboardStyles(theme), [theme]);
  
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
              <View style={styles.cashbookIconModern}>
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
