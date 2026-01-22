import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/globalStyles';
import { Transaction, Business } from '../types';

interface TransactionItemProps {
  transaction: Transaction;
  business?: Business;
}

export default function TransactionItem({ transaction, business }: TransactionItemProps) {
  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionDescription}>
          {transaction.description}
        </Text>
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
