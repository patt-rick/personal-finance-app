import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { styles } from '../styles/globalStyles';
import { theme } from '../theme/theme';

interface StatCardProps {
  type: 'income' | 'expense';
  amount: number;
}

export default function StatCard({ type, amount }: StatCardProps) {
  const isIncome = type === 'income';
  
  return (
    <View style={[styles.statCard, isIncome ? styles.incomeCard : styles.expenseCard]}>
      {isIncome ? (
        <TrendingUp size={20} color={theme.colors.text} />
      ) : (
        <TrendingDown size={20} color={theme.colors.text} />
      )}
      <Text style={styles.statLabel}>{isIncome ? 'Income' : 'Expense'}</Text>
      <Text style={styles.statValue}>${amount.toFixed(2)}</Text>
    </View>
  );
}
