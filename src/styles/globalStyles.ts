import { StyleSheet } from 'react-native';

export const createGlobalStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outlineVariant,
  },
  headerTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 22,
    color: theme.colors.onSurface,
    letterSpacing: 0,
  },
  tabBar: {
    backgroundColor: theme.colors.surfaceContainer,
    borderTopWidth: 0,
    height: 64,
    paddingBottom: theme.spacing.s,
    paddingTop: theme.spacing.s,
  },

  // Business Selector
  businessSelector: {
    paddingVertical: theme.spacing.l,
    paddingHorizontal: theme.spacing.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outlineVariant,
  },
  businessChip: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.shape.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    marginRight: theme.spacing.s,
  },
  businessChipActive: {
    backgroundColor: theme.colors.inverseSurface,
    borderColor: theme.colors.inverseSurface,
  },
  businessChipText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontFamily: theme.fonts.regular,
  },
  businessChipTextActive: {
    color: theme.colors.inverseOnSurface,
    fontFamily: theme.fonts.semibold,
  },

  // Summary Card
  summaryCard: {
    margin: theme.spacing.l,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.s,
    fontFamily: theme.fonts.regular,
  },
  summaryValue: {
    fontSize: 36,
    fontFamily: theme.fonts.light,
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: -0.5,
  },
  positive: {
    color: theme.colors.income,
  },
  negative: {
    color: theme.colors.onSurface,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.l,
    gap: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.l,
    borderRadius: 14,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  incomeCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.income,
  },
  expenseCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.onSurfaceVariant,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  statValue: {
    fontSize: 20,
    fontFamily: theme.fonts.semibold,
    fontVariant: ['tabular-nums'] as const,
    color: theme.colors.onSurface,
    letterSpacing: -0.3,
  },

  // Sections
  section: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    marginBottom: theme.spacing.l,
    color: theme.colors.onSurface,
  },

  // Transaction Item
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.l,
    paddingHorizontal: theme.spacing.l,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    marginBottom: theme.spacing.s,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  transactionDate: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.onSurfaceVariant,
  },
  transactionMeta: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.onSurfaceVariant,
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    fontVariant: ['tabular-nums'] as const,
    marginLeft: theme.spacing.m,
  },

  // Empty State
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 32,
  },

  // FAB (Material 3: primaryContainer surface, 16dp rounded)
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: theme.shape.large,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.level3,
    shadowColor: theme.colors.shadow,
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: theme.spacing.m,
    borderRadius: theme.shape.medium,
    backgroundColor: theme.colors.surfaceContainerHigh,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.onSurfaceVariant,
  },
  typeButtonTextActive: {
    color: theme.colors.onPrimary,
  },

  // Input (filled, borderless)
  input: {
    borderRadius: 12,
    padding: 14,
    marginBottom: theme.spacing.l,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.surfaceContainerHigh,
    color: theme.colors.onSurface,
  },

  // Picker
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.s,
    color: theme.colors.onSurfaceVariant,
  },
  picker: {
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },

  // Button (filled)
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.shape.full,
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 15,
    fontFamily: theme.fonts.semibold,
    letterSpacing: 0.1,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  buttonSecondaryText: {
    color: theme.colors.onSurfaceVariant,
  },

  // Business Item
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
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
  },
  businessMetaActive: {
    color: theme.colors.onSecondaryContainer,
  },
  deleteButton: {
    padding: theme.spacing.s,
  },

  // List
  transactionsList: {
    flex: 1,
    padding: theme.spacing.l,
  },
  businessList: {
    flex: 1,
    padding: theme.spacing.l,
  },
});

// For backward compatibility
import { lightTheme } from '../theme/theme';
export const styles = createGlobalStyles(lightTheme);
