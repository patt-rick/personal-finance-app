import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Business } from '../types';
import { useTheme } from '../theme/theme';

interface BusinessItemProps {
  business: Business;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export default function BusinessItem({ business, isActive, onPress, onDelete }: BusinessItemProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.businessItem, 
        { backgroundColor: theme.colors.card },
        isActive && { backgroundColor: theme.colors.primary }
      ]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[
          styles.businessName, 
          { color: theme.colors.text },
          isActive && { color: 'white' }
        ]}>
          {business.name}
        </Text>
        <Text style={[
          styles.businessMeta, 
          { color: theme.colors.textSecondary },
          isActive && { color: 'rgba(255,255,255,0.7)' }
        ]}>
          Created {new Date(business.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Trash2 size={20} color={isActive ? 'white' : theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  businessItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  businessMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
});
