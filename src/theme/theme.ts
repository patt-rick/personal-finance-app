import { useContext } from 'react';
// We'll import a hook from ThemeContext instead of defining it here to avoid circular dependencies
// but for now, let's just export the themes.

const palette = {
  primary: '#6366F1',
  secondary: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  placeholder: '#9CA3AF',
};

export const lightTheme = {
  colors: {
    ...palette,
    background: '#F9FAFB',
    card: '#ffffff',
    darkCard: '#1F2937',
    surface: '#f3f4f6',
    text: '#111827',
    textSecondary: '#6B7280',
    textInverse: '#ffffff',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
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
    round: 28,
  }
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: '#0F172A',
    card: '#1E293B',
    darkCard: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#334155',
    borderLight: '#1E293B',
    incomeBg: 'rgba(99, 102, 241, 0.15)',
    expenseBg: 'rgba(245, 158, 11, 0.15)',
  }
};

// Re-export hook from ThemeContext in a way that doesn't cause a loop
// Actually, it's better to export the raw themes and have a separate hook for usage.
import { useThemeContext } from './ThemeContext';

export const useTheme = () => {
  try {
    const { theme } = useThemeContext();
    return theme;
  } catch (e) {
    // Fallback if context is not available
    return lightTheme;
  }
};

export const theme = lightTheme;
