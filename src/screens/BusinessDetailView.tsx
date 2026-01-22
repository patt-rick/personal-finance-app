import { useTheme } from "../theme/theme";
import { Business, Transaction } from "../types";
import { getCurrencySymbol } from "../utils/_helpers";
import {
    Car,
    Coffee,
    CreditCard, MinusIcon, MoreHorizontal,
    Plus,
    Search,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    X
} from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from "./DashboardScreen";

export default function BusinessDetailView({ business, transactions, allTransactions, onBack, saveTransactions }: { 
  business: Business, 
  transactions: Transaction[], 
  allTransactions: Transaction[],
  onBack: () => void,
  saveTransactions: (t: Transaction[]) => void 
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [entryType, setEntryType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Others');

  const categories = ['Shopping', 'Insurance', 'Food', 'Transport', 'Bills', 'Salary', 'Others'];

  const filteredTransactions = transactions.filter(t => 
    (t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.amount.toString().includes(searchQuery) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;
  const symbol = getCurrencySymbol(business.currency);

  const displayTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddEntry = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      description: remark || (entryType === 'income' ? 'Cash In' : 'Cash Out'),
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      type: entryType,
      businessId: business.id,
      category: selectedCategory,
      paymentMode: 'Cash'
    };

    saveTransactions([...allTransactions, newTransaction]);
    setAmount('');
    setRemark('');
    setModalVisible(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* Detail Header */}
        <View style={[styles.detailHeader, { paddingTop: Math.max(insets.top, 40) }]}>
          <TouchableOpacity onPress={onBack} style={styles.detailBackBtn}>
             <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{business.name}</Text>
          <TouchableOpacity style={styles.detailHeaderBtn}>
              <Search size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Balance Card */}
          <View style={styles.modernBalanceCard}>
              <View style={styles.balanceHeader}>
                  <Text style={styles.balanceTitle}>{symbol}{totalBalance.toLocaleString()}</Text>
                  <MoreHorizontal color="white" size={24} />
              </View>
              <Text style={styles.balanceSubtitle}>Current Balance</Text>
              <View style={styles.cardFooter}>
                  <Text style={styles.cardNumber}>{business.currency} Cashbook</Text>
                  <View style={styles.mastercardLogo}>
                      <View style={[styles.circle, { backgroundColor: '#EB001B' }]} />
                      <View style={[styles.circle, { backgroundColor: '#F79E1B', marginLeft: -10 }]} />
                  </View>
              </View>
          </View>

          {/* Income/Expense Cards */}
          <View style={styles.statsContainer}>
              <View style={[styles.statCardFixed, { backgroundColor: theme.colors.incomeBg }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: theme.colors.income }]}>
                      <Plus size={20} color="white" />
                  </View>
                  <Text style={styles.statLabel}>Total In</Text>
                  <Text style={styles.statValue}>{symbol}{totalIncome.toLocaleString()}</Text>
              </View>
              <View style={[styles.statCardFixed, { backgroundColor: theme.colors.expenseBg }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: theme.colors.expense }]}>
                      <MinusIcon  size={20} color="white" />
                  </View>
                  <Text style={styles.statLabel}>Total Out</Text>
                  <Text style={styles.statValue}>{symbol}{totalExpense.toLocaleString()}</Text>
              </View>
          </View>

          {/* Search Input */}
          <View style={styles.detailSearchContainer}>
              <Search size={18} color={theme.colors.textSecondary} />
              <TextInput 
                  style={styles.detailSearchInput}
                  placeholder="Search transactions..."
                  placeholderTextColor={theme.colors.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
              />
          </View>

          {/* Transaction List */}
          <View style={styles.detailList}>
              <Text style={styles.listLabel}>Recent Transactions</Text>
              {displayTransactions.map((t) => (
              <View key={t.id} style={styles.modernTxItem}>
                  <View style={[styles.txIconContainer, { backgroundColor: t.type === 'income' ? theme.colors.incomeBg : theme.colors.expenseBg }]}>
                  {getCategoryIcon(t.category, t.type === 'income' ? theme.colors.income : theme.colors.expense)}
                  </View>
                  <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>{t.description}</Text>
                  <Text style={styles.txSubTitle}>{t.category || 'General'} · {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View style={styles.txRight}>
                  <Text style={[styles.txAmountModern, t.type === 'income' ? { color: theme.colors.success } : { color: theme.colors.error }]}>
                      {t.type === 'income' ? '+' : '-'}{symbol}{t.amount.toLocaleString()}
                  </Text>
                  </View>
              </View>
              ))}
              {displayTransactions.length === 0 && (
              <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No transactions found</Text>
              </View>
              )}
              <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.modernBottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
           <TouchableOpacity 
            style={[styles.bigActionBtnModern, { backgroundColor: theme.colors.income }]}
            onPress={() => { setEntryType('income'); setModalVisible(true); }}
          >
            <Text style={[styles.bigActionBtnTextModern, { color: 'white' }]}>CASH IN</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bigActionBtnModern, { backgroundColor: theme.colors.expense }]}
            onPress={() => { setEntryType('expense'); setModalVisible(true); }}
          >
            <Text style={[styles.bigActionBtnTextModern, { color: 'white' }]}>CASH OUT</Text>
          </TouchableOpacity>
        </View>

        {/* Entry Modal handled separately with its own KeyboardAvoidingView */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContentModern}>
                  <View style={styles.modalHeaderModern}>
                    <Text style={styles.modalTitleModern}>New {entryType === 'income' ? 'Income' : 'Expense'}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color={theme.colors.text} /></TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabelModern}>Amount ({symbol})</Text>
                  <TextInput 
                    style={styles.modalInputLargeModern}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.placeholder}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus
                  />

                  <Text style={styles.inputLabelModern}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                    {categories.map(cat => (
                      <TouchableOpacity 
                        key={cat} 
                        style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                         <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabelModern}>Remark</Text>
                  <TextInput 
                    style={styles.modalInputModern}
                    placeholder="What was this for?"
                    placeholderTextColor={theme.colors.placeholder}
                    value={remark}
                    onChangeText={setRemark}
                  />

                  <TouchableOpacity 
                    style={[styles.submitBtnModern, { backgroundColor: entryType === 'income' ? theme.colors.income : theme.colors.expense }]}
                    onPress={handleAddEntry}
                  >
                    <Text style={styles.submitBtnTextModern}>Save Entry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

export const getCategoryIcon = (category: string | undefined, color: string) => {
  switch (category?.toLowerCase()) {
    case 'shopping': return <ShoppingBag size={20} color={color} />;
    case 'insurance': return <ShieldCheck size={20} color={color} />;
    case 'food': return <Coffee size={20} color={color} />;
    case 'transport': return <Car size={20} color={color} />;
    case 'bills': return <Smartphone size={20} color={color} />;
    case 'salary': return <CreditCard size={20} color={color} />;
    default: return <MoreHorizontal size={20} color={color} />;
  }
};