import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction, Business } from '../types';
import { useTheme } from '../theme/theme';

interface TransactionItemProps {
  transaction: Transaction;
  business?: Business;
}

export default function TransactionItem({ transaction, business }: TransactionItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isIncome = transaction.type === 'income';

  return (
    <View style={styles.transactionItem}>
      <View
        style={[
          styles.iconAvatar,
          {
            backgroundColor: isIncome
              ? theme.colors.incomeContainer
              : theme.colors.expenseContainer,
          },
        ]}
      >
        <Text
          style={[
            styles.iconInitial,
            {
              color: isIncome
                ? theme.colors.onIncomeContainer
                : theme.colors.onExpenseContainer,
            },
          ]}
        >
          {(transaction.category || transaction.description).charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.transactionLeft}>
        <View style={styles.titleRow}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          {transaction.autoLogged ? (
            <View style={styles.autoChip}>
              <Text style={styles.autoChipText}>Auto</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.transactionMeta}>
          {business?.name} • {new Date(transaction.date).toLocaleDateString()}
        </Text>
      </View>

      <Text
        style={[
          styles.transactionAmount,
          { color: isIncome ? theme.colors.income : theme.colors.expense },
        ]}
      >
        {isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}
      </Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.m,
      paddingHorizontal: theme.spacing.l,
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: theme.shape.large,
      marginBottom: theme.spacing.s,
      gap: 12,
      ...theme.elevation.level1,
      shadowColor: theme.colors.shadow,
    },
    iconAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconInitial: {
      fontSize: 16,
      fontWeight: '700',
    },
    transactionLeft: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    transactionDescription: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
      flexShrink: 1,
    },
    transactionMeta: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    autoChip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.shape.small,
      backgroundColor: theme.colors.primaryContainer,
    },
    autoChipText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
      color: theme.colors.onPrimaryContainer,
    },
  });
