import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { styles } from '../styles/globalStyles';
import { Business } from '../types';
import { theme } from '../theme/theme';

interface BusinessItemProps {
  business: Business;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export default function BusinessItem({ business, isActive, onPress, onDelete }: BusinessItemProps) {
  return (
    <TouchableOpacity
      style={[styles.businessItem, isActive && styles.businessItemActive]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.businessName, isActive && styles.businessNameActive]}>
          {business.name}
        </Text>
        <Text style={[styles.businessMeta, isActive && styles.businessMetaActive]}>
          Created {new Date(business.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Trash2 size={20} color={isActive ? theme.colors.textInverse : theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
