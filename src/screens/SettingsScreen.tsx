import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { User, Save, ChevronRight } from 'lucide-react-native';
import { theme } from '../theme/theme';
import { UserProfile } from '../types';

interface SettingsScreenProps {
  userProfile: UserProfile | null;
  saveUserProfile: (profile: UserProfile) => void;
}

export default function SettingsScreen({ userProfile, saveUserProfile }: SettingsScreenProps) {
  const [name, setName] = useState(userProfile?.name || '');
  const [email, setEmail] = useState(userProfile?.email || '');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    saveUserProfile({ name, email });
    Alert.alert('Success', 'Profile updated successfully');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Profile Information</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>@</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Save size={20} color="white" />
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Theme Settings</Text>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Language</Text>
          <Text style={styles.menuItemSubText}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Default Currency</Text>
          <Text style={styles.menuItemSubText}>USD ($)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 13, color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 12, height: 50 },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: theme.colors.text },
  saveButton: { backgroundColor: theme.colors.primary, marginHorizontal: 20, marginTop: 30, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 8 },
  menuItemText: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  menuItemSubText: { fontSize: 14, color: theme.colors.textSecondary },
});
