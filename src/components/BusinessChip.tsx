import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Business } from '../types';
import { useTheme } from '../theme/theme';

interface BusinessChipProps {
  business?: Business | null;
  isActive: boolean;
  onPress: () => void;
}

export default function BusinessChip({ business, isActive, onPress }: BusinessChipProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
        {business?.name || 'All Businesses'}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.shape.small,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    marginRight: theme.spacing.s,
  },
  chipActive: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.secondaryContainer,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  chipTextActive: {
    color: theme.colors.onSecondaryContainer,
    fontWeight: '600',
  },
});
