import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, StyleSheet } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import BusinessItem from '../components/BusinessItem';
import { Business } from '../types';
import { theme } from '../theme/theme';

interface BusinessesScreenProps {
  businesses: Business[];
  saveBusinesses: (businesses: Business[]) => void;
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business | null) => void;
}

const CURRENCIES = [
  { label: 'US Dollar', value: 'USD', symbol: '$' },
  { label: 'Ghana Cedi', value: 'GHS', symbol: '₵' },
  { label: 'Euro', value: 'EUR', symbol: '€' },
  { label: 'British Pound', value: 'GBP', symbol: '£' },
];

export default function BusinessesScreen({ businesses, saveBusinesses, currentBusiness, setCurrentBusiness }: BusinessesScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  const addBusiness = () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter a business name');
      return;
    }

    const newBusiness: Business = {
      id: Date.now().toString(),
      name: businessName.trim(),
      createdAt: new Date().toISOString(),
      currency: selectedCurrency,
      memberCount: 1,
    };

    saveBusinesses([...businesses, newBusiness]);
    setBusinessName('');
    setSelectedCurrency('USD');
    setModalVisible(false);
  };

  const deleteBusiness = (businessId: string) => {
    Alert.alert(
      'Delete Business',
      'Are you sure you want to delete this business? All associated transactions will remain but will need to be reassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedBusinesses = businesses.filter(b => b.id !== businessId);
            saveBusinesses(updatedBusinesses);
            if (currentBusiness?.id === businessId) {
              setCurrentBusiness(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cashbooks</Text>
      </View>
      <ScrollView style={styles.businessList} contentContainerStyle={{ paddingBottom: 100 }}>
        {businesses.map(business => (
          <BusinessItem
            key={business.id}
            business={business}
            isActive={currentBusiness?.id === business.id}
            onPress={() => setCurrentBusiness(business)}
            onDelete={() => deleteBusiness(business.id)}
          />
        ))}
        {businesses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No businesses yet. Create one to get started!</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      {/* Add Business Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Cashbook</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Cashbook Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Shop, Personal Expenses"
              value={businessName}
              onChangeText={setBusinessName}
              placeholderTextColor={theme.colors.placeholder}
            />

            <Text style={styles.inputLabel}>Currency</Text>
            <View style={styles.currencyGrid}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity 
                  key={curr.value}
                  style={[styles.currencyCard, selectedCurrency === curr.value && styles.currencyCardActive]}
                  onPress={() => setSelectedCurrency(curr.value)}
                >
                  <Text style={[styles.currencySymbol, selectedCurrency === curr.value && styles.textWhite]}>{curr.symbol}</Text>
                  <Text style={[styles.currencyCode, selectedCurrency === curr.value && styles.textWhite]}>{curr.value}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={addBusiness}>
              <Text style={styles.submitButtonText}>Create Cashbook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
  businessList: { flex: 1, paddingHorizontal: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  inputLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  currencyGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 32 },
  currencyCard: { width: '22%', height: 70, backgroundColor: theme.colors.surface, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  currencyCardActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  currencySymbol: { fontSize: 20, fontWeight: 'bold' },
  currencyCode: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  submitButton: { height: 56, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  textWhite: { color: 'white' },
});
