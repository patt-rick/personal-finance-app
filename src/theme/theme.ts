import { useContext } from "react";
// We'll import a hook from ThemeContext instead of defining it here to avoid circular dependencies
// but for now, let's just export the themes.

const palette = {
    primary: "#2D6A4F",
    secondary: "#C17F59",
    success: "#3A7D5C",
    error: "#C4453A",
    placeholder: "#A09A92",
};

export const lightTheme = {
    colors: {
        ...palette,
        background: "#FAF8F5",
        card: "#FFFFFF",
        darkCard: "#2A2722",
        surface: "#F0ECE6",
        text: "#1A1A17",
        textSecondary: "#7A756D",
        textInverse: "#FFFFFF",
        border: "#E4DFD7",
        borderLight: "#F0ECE6",
        income: "#2D6A4F",
        expense: "#C17F59",
        accent: "#2D6A4F",
        incomeBg: "#E3EDE8",
        expenseBg: "#F5EAE1",
        sage: "#C5CCBA",
        sageSurface: "#D5DAC8",
        gold: "#C9A86C",
        goldDark: "#A68B4B",
        charcoal: "#1A1A17",
        chartBlue: "#4A7C8F",
        chartPurple: "#8B7A9E",
        chartGreen: "#5B8A72",
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
        background: "#121210",
        card: "#1C1C18",
        darkCard: "#121210",
        surface: "#2A2A24",
        text: "#F2F0EB",
        textSecondary: "#9A9590",
        border: "#38352F",
        borderLight: "#2A2A24",
        incomeBg: "rgba(45, 106, 79, 0.15)",
        expenseBg: "rgba(193, 127, 89, 0.15)",
        sage: "#121210",
        sageSurface: "#1C1C18",
        gold: "#A68B4B",
        goldDark: "#8A7340",
        charcoal: "#F2F0EB",
        chartBlue: "#5A8C9F",
        chartPurple: "#9B8AAE",
        chartGreen: "#6B9A82",
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
