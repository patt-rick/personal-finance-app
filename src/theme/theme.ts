export const theme = {
  colors: {
    primary: '#6366F1', // Purple from the new design
    secondary: '#F59E0B', // Amber for expenses
    background: '#F9FAFB',
    card: '#ffffff',
    darkCard: '#1F2937',
    surface: '#f3f4f6',
    text: '#111827',
    textSecondary: '#6B7280',
    textInverse: '#ffffff',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    error: '#EF4444',
    placeholder: '#9CA3AF',
    success: '#10B981',
    income: '#6366F1',
    expense: '#F59E0B',
    accent: '#6366F1',
    incomeBg: '#EEF2FF',
    expenseBg: '#FFF7ED',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    s: 8,
    m: 12,
    l: 20,
    round: 56/2, // For FAB
  }
};

export type Theme = typeof theme;
