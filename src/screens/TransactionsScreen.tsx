import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import { styles } from '../styles/globalStyles';
import TransactionItem from '../components/TransactionItem';
import BusinessChip from '../components/BusinessChip';
import { Business, Transaction } from '../types';
import { theme } from '../theme/theme';

interface TransactionsScreenProps {
  businesses: Business[];
  transactions: Transaction[];
  saveTransactions: (transactions: Transaction[]) => void;
  currentBusiness: Business | null;
}

export default function TransactionsScreen({ businesses, transactions, saveTransactions, currentBusiness }: TransactionsScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState(currentBusiness?.id || '');

  const addTransaction = () => {
    if (!amount || !description || !selectedBusiness) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type,
      amount: parseFloat(amount),
      description,
      businessId: selectedBusiness,
      date: new Date().toISOString(),
    };

    saveTransactions([...transactions, newTransaction]);
    
    // Reset form
    setAmount('');
    setDescription('');
    setType('income');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.transactionsList}>
        {transactions.slice().reverse().map(transaction => {
          const business = businesses.find(b => b.id === transaction.businessId);
          return (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              business={business}
            />
          );
        })}
        {transactions.length === 0 && (
          <Text style={styles.emptyText}>No transactions yet. Add one to get started!</Text>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={24} color={theme.colors.textInverse} />
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Transaction</Text>

            {/* Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
                  Expense
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.placeholder}
            />

            {/* Description Input */}
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={theme.colors.placeholder}
            />

            {/* Business Selector */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Business</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {businesses.map(business => (
                  <BusinessChip
                    key={business.id}
                    business={business}
                    isActive={selectedBusiness === business.id}
                    onPress={() => setSelectedBusiness(business.id)}
                  />
                ))}
              </ScrollView>
              {businesses.length === 0 && (
                <Text style={styles.emptyText}>Please create a business first</Text>
              )}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.button} onPress={addTransaction}>
              <Text style={styles.buttonText}>Add Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
