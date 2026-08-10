import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Business } from '../types';
import { useTheme } from '../theme/theme';
import CashbookIconBadge from "./CashbookIconBadge";

interface BusinessItemProps {
  business: Business;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export default function BusinessItem({ business, isActive, onPress, onDelete }: BusinessItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={[
        styles.businessItem,
        isActive && styles.businessItemActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <CashbookIconBadge business={business} size={40} />
      <View style={{ flex: 1, marginLeft: theme.spacing.m }}>
        <Text style={[
          styles.businessName,
          isActive && styles.businessNameActive,
        ]}>
          {business.name}
        </Text>
        <Text style={[
          styles.businessMeta,
          isActive && styles.businessMetaActive,
        ]}>
          Created {new Date(business.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Trash2
          size={20}
          color={isActive ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  businessItem: {
    padding: theme.spacing.l,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    marginBottom: theme.spacing.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessItemActive: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.secondaryContainer,
  },
  businessName: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.onSurface,
  },
  businessNameActive: {
    color: theme.colors.onSecondaryContainer,
  },
  businessMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
    color: theme.colors.onSurfaceVariant,
  },
  businessMetaActive: {
    color: theme.colors.onSecondaryContainer,
  },
  deleteButton: {
    padding: theme.spacing.s,
  },
});
