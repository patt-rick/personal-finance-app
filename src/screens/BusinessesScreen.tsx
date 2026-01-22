import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import { styles } from '../styles/globalStyles';
import BusinessItem from '../components/BusinessItem';
import { Business } from '../types';
import { theme } from '../theme/theme';

interface BusinessesScreenProps {
  businesses: Business[];
  saveBusinesses: (businesses: Business[]) => void;
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business | null) => void;
}

export default function BusinessesScreen({ businesses, saveBusinesses, currentBusiness, setCurrentBusiness }: BusinessesScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [businessName, setBusinessName] = useState('');

  const addBusiness = () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter a business name');
      return;
    }

    const newBusiness: Business = {
      id: Date.now().toString(),
      name: businessName.trim(),
      createdAt: new Date().toISOString(),
    };

    saveBusinesses([...businesses, newBusiness]);
    setBusinessName('');
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
      <ScrollView style={styles.businessList}>
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
          <Text style={styles.emptyText}>No businesses yet. Create one to get started!</Text>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={24} color={theme.colors.textInverse} />
      </TouchableOpacity>

      {/* Add Business Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Business</Text>

            <TextInput
              style={styles.input}
              placeholder="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholderTextColor={theme.colors.placeholder}
            />

            <TouchableOpacity style={styles.button} onPress={addBusiness}>
              <Text style={styles.buttonText}>Add Business</Text>
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
