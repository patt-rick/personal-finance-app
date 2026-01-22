import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styles } from '../styles/globalStyles';
import BusinessChip from '../components/BusinessChip';
import StatCard from '../components/StatCard';
import TransactionItem from '../components/TransactionItem';
import { Business, Transaction } from '../types';

interface DashboardScreenProps {
  businesses: Business[];
  transactions: Transaction[];
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business | null) => void;
}

export default function DashboardScreen({ businesses, transactions, currentBusiness, setCurrentBusiness }: DashboardScreenProps) {
  const filteredTransactions = currentBusiness
    ? transactions.filter(t => t.businessId === currentBusiness.id)
    : transactions;

  const income = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;

  return (
    <ScrollView style={styles.container}>
      {/* Business Selector */}
      <View style={styles.businessSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BusinessChip
            business={null}
            isActive={!currentBusiness}
            onPress={() => setCurrentBusiness(null)}
          />
          {businesses.map(business => (
            <BusinessChip
              key={business.id}
              business={business}
              isActive={currentBusiness?.id === business.id}
              onPress={() => setCurrentBusiness(business)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Balance Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Balance</Text>
        <Text style={[styles.summaryValue, balance >= 0 ? styles.positive : styles.negative]}>
          ${balance.toFixed(2)}
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard type="income" amount={income} />
        <StatCard type="expense" amount={expense} />
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {filteredTransactions.slice(-5).reverse().map(transaction => {
          const business = businesses.find(b => b.id === transaction.businessId);
          return (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              business={business}
            />
          );
        })}
        {filteredTransactions.length === 0 && (
          <Text style={styles.emptyText}>No transactions yet</Text>
        )}
      </View>
    </ScrollView>
  );
}
