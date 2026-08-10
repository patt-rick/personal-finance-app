import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme, AppTheme } from "../../../theme/theme";

// Mirrors ThemeContext's THEME_STORAGE_KEY.
const THEME_STORAGE_KEY = "@theme_preference";

export interface WidgetColors {
    background: string;
    surface: string;
    onSurface: string;
    onSurfaceVariant: string;
    primary: string;
    onPrimary: string;
    income: string;
    expense: string;
    success: string;
    secondary: string;
    error: string;
    outlineVariant: string;
}

const pick = (theme: AppTheme): WidgetColors => ({
    background: theme.colors.surfaceContainerLow,
    surface: theme.colors.surfaceContainer,
    onSurface: theme.colors.onSurface,
    onSurfaceVariant: theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
    onPrimary: theme.colors.onPrimary,
    income: theme.colors.income,
    expense: theme.colors.expense,
    success: theme.colors.success,
    secondary: theme.colors.secondary,
    error: theme.colors.error,
    outlineVariant: theme.colors.outlineVariant,
});

// Budget bar color from usage percentage, matching getBudgetStatusColor thresholds.
export const budgetBarColor = (percentage: number, c: WidgetColors): string => {
    if (percentage < 70) return c.success;
    if (percentage < 90) return c.secondary;
    return c.error;
};

export const resolveWidgetColors = async (): Promise<WidgetColors> => {
    let mode: string | null = null;
    try {
        mode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    } catch {
        mode = null;
    }
    const isDark =
        mode === "dark" || ((mode === "system" || !mode) && Appearance.getColorScheme() === "dark");
    return pick(isDark ? darkTheme : lightTheme);
};
