import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles/globalStyles';
import { Business } from '../types';

interface BusinessChipProps {
  business?: Business | null;
  isActive: boolean;
  onPress: () => void;
}

export default function BusinessChip({ business, isActive, onPress }: BusinessChipProps) {
  return (
    <TouchableOpacity
      style={[styles.businessChip, isActive && styles.businessChipActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.businessChipText,
          isActive && styles.businessChipTextActive,
        ]}
      >
        {business?.name || 'All Businesses'}
      </Text>
    </TouchableOpacity>
  );
}
