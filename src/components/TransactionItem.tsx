import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction, Business } from '../types';
import { useTheme } from '../theme/theme';
import CategoryIcon from './CategoryIcon';
import MoneyText from './MoneyText';

interface TransactionItemProps {
  transaction: Transaction;
  business?: Business;
  symbol?: string;
}

export default function TransactionItem({ transaction, business, symbol = '' }: TransactionItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isIncome = transaction.type === 'income';

  return (
    <View style={styles.transactionItem}>
      <CategoryIcon
        category={transaction.category || transaction.description}
        type={transaction.type}
        autoLogged={transaction.autoLogged}
      />

      <View style={styles.transactionLeft}>
        <Text style={styles.transactionDescription} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionMeta}>
          {business?.name ? `${business.name} · ` : ''}
          {new Date(transaction.date).toLocaleDateString()}
        </Text>
      </View>

      <MoneyText
        amount={transaction.amount}
        symbol={symbol}
        sign={isIncome ? '+' : '-'}
        size={14}
        color={isIncome ? theme.colors.income : theme.colors.onSurface}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.m,
      paddingHorizontal: theme.spacing.m,
      gap: 12,
    },
    transactionLeft: {
      flex: 1,
    },
    transactionDescription: {
      fontSize: 14,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.onSurface,
    },
    transactionMeta: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
  });
