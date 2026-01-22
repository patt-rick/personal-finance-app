export const theme = {
  colors: {
    primary: '#000000',
    background: '#ffffff',
    card: '#fafafa',
    surface: '#f5f5f5',
    text: '#000000',
    textSecondary: '#666666',
    textInverse: '#ffffff',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    error: '#dc2626',
    placeholder: '#999999',
    success: '#000000', // Using black for positive as seen in styles
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
