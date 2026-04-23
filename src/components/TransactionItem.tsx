import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createGlobalStyles } from '../styles/globalStyles';
import { Transaction, Business } from '../types';
import { useTheme } from '../theme/theme';

interface TransactionItemProps {
  transaction: Transaction;
  business?: Business;
}

export default function TransactionItem({ transaction, business }: TransactionItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createGlobalStyles(theme), [theme]);

  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={localStyles.titleRow}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          {transaction.autoLogged ? (
            <View style={[localStyles.autoChip, { backgroundColor: theme.colors.incomeBg }]}>
              <Text style={[localStyles.autoChipText, { color: theme.colors.primary }]}>Auto</Text>
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
          transaction.type === 'income' ? styles.positive : styles.negative,
        ]}
      >
        {transaction.type === 'income' ? '+' : '-'}$
        {transaction.amount.toFixed(2)}
      </Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  autoChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
