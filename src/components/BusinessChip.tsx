import React, { useMemo } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createGlobalStyles } from '../styles/globalStyles';
import { Business } from '../types';
import { useTheme } from '../theme/theme';

interface BusinessChipProps {
  business?: Business | null;
  isActive: boolean;
  onPress: () => void;
}

export default function BusinessChip({ business, isActive, onPress }: BusinessChipProps) {
  const theme = useTheme();
  const styles = useMemo(() => createGlobalStyles(theme), [theme]);

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
