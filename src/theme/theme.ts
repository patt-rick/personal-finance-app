import { useContext } from "react";
// We'll import a hook from ThemeContext instead of defining it here to avoid circular dependencies
// but for now, let's just export the themes.

const palette = {
    primary: "#6366F1",
    secondary: "#E2C878",
    success: "#22C55E",
    error: "#EF4444",
    placeholder: "#9CA3AF",
};

export const lightTheme = {
    colors: {
        ...palette,
        background: "#F9FAFB",
        card: "#ffffff",
        darkCard: "#1F2937",
        surface: "#f3f4f6",
        text: "#111827",
        textSecondary: "#6B7280",
        textInverse: "#ffffff",
        border: "#E5E7EB",
        borderLight: "#F3F4F6",
        income: "#6366F1",
        expense: "#F59E0B",
        accent: "#6366F1",
        incomeBg: "#dae2ffff",
        expenseBg: "#FFF7ED",
        sage: "#C5CCBA",
        sageSurface: "#D5DAC8",
        gold: "#E8D5A3",
        goldDark: "#D4B85C",
        charcoal: "#1E1E2D",
        chartBlue: "#7B8CDE",
        chartPurple: "#9B8EC4",
        chartGreen: "#7BC4A0",
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
    },
};

export const darkTheme = {
    ...lightTheme,
    colors: {
        ...lightTheme.colors,
        background: "#0F172A",
        card: "#1E293B",
        darkCard: "#0F172A",
        surface: "#283548",
        text: "#F8FAFC",
        textSecondary: "#94A3B8",
        border: "#334155",
        borderLight: "#283548",
        incomeBg: "rgba(99, 102, 241, 0.15)",
        expenseBg: "rgba(245, 158, 11, 0.15)",
        sage: "#0F172A",
        sageSurface: "#1E293B",
        gold: "#C9A84C",
        goldDark: "#A88A3A",
        charcoal: "#F8FAFC",
        chartBlue: "#8B9AE8",
        chartPurple: "#A99ED4",
        chartGreen: "#8BD4B0",
    },
};

// Re-export hook from ThemeContext in a way that doesn't cause a loop
// Actually, it's better to export the raw themes and have a separate hook for usage.
import { useThemeContext } from "./ThemeContext";

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
