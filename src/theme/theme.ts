import { useContext } from "react";
// We'll import a hook from ThemeContext instead of defining it here to avoid circular dependencies
// but for now, let's just export the themes.

const palette = {
    primary: "#0066FF",
    secondary: "#C17F59",
    success: "#3A5C7D",
    error: "#C4453A",
    placeholder: "#929AA0",
};

export const lightTheme = {
    colors: {
        ...palette,
        background: "#F5F7FA",
        card: "#FFFFFF",
        darkCard: "#22272A",
        surface: "#E6ECF0",
        text: "#17191A",
        textSecondary: "#6D757A",
        textInverse: "#FFFFFF",
        border: "#D7DFE4",
        borderLight: "#E6ECF0",
        income: "#2D4F6A",
        expense: "#C17F59",
        accent: "#2D4F6A",
        incomeBg: "#E3E8ED",
        expenseBg: "#F5EAE1",
        sage: "#BAC5CC",
        sageSurface: "#C8D5DA",
        gold: "#C9A86C",
        goldDark: "#A68B4B",
        charcoal: "#17191A",
        chartBlue: "#3B82F6",
        chartPurple: "#A855F7",
        chartGreen: "#EC4899",
        shadow: "#000000",
        gradientStart: "#1E40AF",
        gradientMid: "#0066FF",
        gradientEnd: "#0A2472",
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
        background: "#101012",
        card: "#181A1C",
        darkCard: "#101012",
        surface: "#24272A",
        text: "#EBF0F2",
        textSecondary: "#90959A",
        border: "#2F3538",
        borderLight: "#24272A",
        incomeBg: "rgba(45, 79, 106, 0.15)",
        expenseBg: "rgba(193, 127, 89, 0.15)",
        sage: "#101012",
        sageSurface: "#181A1C",
        gold: "#A68B4B",
        goldDark: "#8A7340",
        charcoal: "#EBF0F2",
        chartBlue: "#60A5FA",
        chartPurple: "#C084FC",
        chartGreen: "#F472B6",
        shadow: "#000000",
        gradientStart: "#1E3A8A",
        gradientMid: "#2563EB",
        gradientEnd: "#0A1F4D",
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
