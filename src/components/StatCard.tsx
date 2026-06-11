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
    <View style={styles.statCard}>
      <View style={[styles.iconWrap, { backgroundColor: isIncome ? theme.colors.incomeContainer : theme.colors.surfaceContainerHigh }]}>
        {isIncome ? (
          <TrendingUp size={18} color={theme.colors.income} />
        ) : (
          <TrendingDown size={18} color={theme.colors.onSurfaceVariant} />
        )}
      </View>
      <Text style={styles.statLabel}>{isIncome ? 'Income' : 'Expense'}</Text>
      <Text style={[styles.statValue, { color: isIncome ? theme.colors.income : theme.colors.onSurface }]}>
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
      borderRadius: 14,
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
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
      fontFamily: theme.fonts.regular,
    },
    statValue: {
      fontSize: 20,
      fontFamily: theme.fonts.semibold,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.3,
    },
  });
