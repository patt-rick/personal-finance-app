import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '../theme/theme';

interface StatCardProps {
  type: 'income' | 'expense';
  amount: number;
}

export default function StatCard({ type, amount }: StatCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isIncome = type === 'income';

  return (
    <View style={[styles.statCard, isIncome ? styles.incomeCard : styles.expenseCard]}>
      <View style={[styles.iconWrap, { backgroundColor: isIncome ? theme.colors.incomeContainer : theme.colors.expenseContainer }]}>
        {isIncome ? (
          <TrendingUp size={18} color={theme.colors.onIncomeContainer} />
        ) : (
          <TrendingDown size={18} color={theme.colors.onExpenseContainer} />
        )}
      </View>
      <Text style={styles.statLabel}>{isIncome ? 'Income' : 'Expense'}</Text>
      <Text style={[styles.statValue, { color: isIncome ? theme.colors.income : theme.colors.expense }]}>
        ${amount.toFixed(2)}
      </Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    statCard: {
      flex: 1,
      padding: theme.spacing.l,
      borderRadius: theme.shape.large,
      backgroundColor: theme.colors.surfaceContainerLow,
      ...theme.elevation.level1,
      shadowColor: theme.colors.shadow,
    },
    incomeCard: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.income,
    },
    expenseCard: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.expense,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.shape.medium,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.s,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
      fontWeight: '500',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
  });
