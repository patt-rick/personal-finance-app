import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: theme.colors.text,
  },
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    height: 60,
    paddingBottom: theme.spacing.s,
    paddingTop: theme.spacing.s,
  },
  
  // Business Selector
  businessSelector: {
    paddingVertical: theme.spacing.l,
    paddingHorizontal: theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  businessChip: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.s,
  },
  businessChipActive: {
    backgroundColor: theme.colors.primary,
  },
  businessChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  businessChipTextActive: {
    color: theme.colors.textInverse,
  },
  
  // Summary Card
  summaryCard: {
    margin: theme.spacing.l,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.s,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  positive: {
    color: theme.colors.success,
  },
  negative: {
    color: theme.colors.error,
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
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.card,
  },
  incomeCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },
  expenseCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.textSecondary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  
  // Sections
  section: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.l,
    color: theme.colors.text,
  },
  
  // Transaction Item
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.l,
    paddingHorizontal: theme.spacing.l,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.s,
    marginBottom: theme.spacing.s,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  transactionDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  transactionMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.m,
  },
  
  // Empty State
  emptyText: {
    textAlign: 'center',
    color: theme.colors.placeholder,
    fontSize: 14,
    marginTop: 32,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.l,
    borderTopRightRadius: theme.borderRadius.l,
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: theme.spacing.xl,
    color: theme.colors.text,
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
    borderRadius: theme.borderRadius.s,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  typeButtonTextActive: {
    color: theme.colors.textInverse,
  },
  
  // Input
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.s,
    padding: 14,
    marginBottom: theme.spacing.l,
    fontSize: 15,
    backgroundColor: theme.colors.card,
  },
  
  // Picker
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: theme.spacing.s,
    color: theme.colors.text,
  },
  picker: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.s,
    backgroundColor: theme.colors.card,
  },
  
  // Button
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.s,
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surface,
  },
  buttonSecondaryText: {
    color: theme.colors.textSecondary,
  },
  
  // Business Item
  businessItem: {
    padding: theme.spacing.l,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.s,
    marginBottom: theme.spacing.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessItemActive: {
    backgroundColor: theme.colors.primary,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  businessNameActive: {
    color: theme.colors.textInverse,
  },
  businessMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  businessMetaActive: {
    color: '#ccc',
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
