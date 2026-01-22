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
    X,
    Calendar,
    Tag,
    Info,
    Trash2,
    MessageSquare,
    ArrowLeft
} from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createDashboardStyles } from "../styles/dashboardStyles";

export default function BusinessDetailView({ business, transactions, allTransactions, onBack, saveTransactions }: { 
  business: Business, 
  transactions: Transaction[], 
  allTransactions: Transaction[],
  onBack: () => void,
  saveTransactions: (t: Transaction[]) => void 
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createDashboardStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
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
      description: entryType === 'income' ? 'Cash In' : 'Cash Out',
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      type: entryType,
      businessId: business.id,
      category: selectedCategory,
      paymentMode: 'Cash',
      remark: remark
    };

    saveTransactions([...allTransactions, newTransaction]);
    setAmount('');
    setRemark('');
    setModalVisible(false);
  };

  const handleDeleteTx = (id: string) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            const updated = allTransactions.filter(t => t.id !== id);
            saveTransactions(updated);
            setDetailModalVisible(false);
          }
        }
      ]
    );
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
             <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{business.name}</Text>
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
              <TouchableOpacity 
                key={t.id} 
                style={styles.modernTxItem}
                onPress={() => {
                  setSelectedTx(t);
                  setDetailModalVisible(true);
                }}
              >
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
              </TouchableOpacity>
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

        {/* Entry Modal */}
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

        {/* Transaction Detail Modal */}
        <Modal visible={detailModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.txDetailCard}>
              <TouchableOpacity 
                style={{ alignSelf: 'flex-end', padding: 10, marginTop: -10 }}
                onPress={() => setDetailModalVisible(false)}
              >
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {selectedTx && (
                <>
                  <View style={styles.txDetailHeader}>
                    <View style={[
                      styles.txDetailTypeBadge, 
                      { backgroundColor: selectedTx.type === 'income' ? theme.colors.success + '20' : theme.colors.error + '20' }
                    ]}>
                      <Text style={{ 
                        color: selectedTx.type === 'income' ? theme.colors.success : theme.colors.error, 
                        fontWeight: 'bold',
                        fontSize: 12
                      }}>
                        {selectedTx.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.txDetailAmount}>
                      {selectedTx.type === 'income' ? '+' : '-'}{symbol}{selectedTx.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.txDetailDescription}>{selectedTx.description}</Text>
                  </View>

                  <View style={styles.txDetailInfoSection}>
                    <View style={styles.txDetailRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Tag size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.txDetailLabel}>Category</Text>
                      </View>
                      <Text style={styles.txDetailValue}>{selectedTx.category}</Text>
                    </View>

                    <View style={styles.txDetailRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Calendar size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.txDetailLabel}>Date & Time</Text>
                      </View>
                      <Text style={styles.txDetailValue}>
                        {new Date(selectedTx.date).toLocaleDateString()} {new Date(selectedTx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <View style={styles.txDetailRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Info size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.txDetailLabel}>Mode</Text>
                      </View>
                      <Text style={styles.txDetailValue}>{selectedTx.paymentMode || 'Cash'}</Text>
                    </View>

                    {selectedTx.remark ? (
                      <View style={[styles.txDetailRow, { alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <MessageSquare size={18} color={theme.colors.textSecondary} />
                          <Text style={styles.txDetailLabel}>Remark</Text>
                        </View>
                        <Text style={[styles.txDetailValue, { flex: 1, textAlign: 'right', marginLeft: 20 }]}>{selectedTx.remark}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.txDetailActions}>
                    <TouchableOpacity 
                      style={styles.txDetailDeleteBtn}
                      onPress={() => handleDeleteTx(selectedTx.id)}
                    >
                      <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.txDetailCloseBtn}
                      onPress={() => setDetailModalVisible(false)}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
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