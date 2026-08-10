import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HexColor } from "react-native-android-widget";
import { lightTheme, darkTheme, AppTheme } from "../../../theme/theme";

// Mirrors ThemeContext's THEME_STORAGE_KEY.
const THEME_STORAGE_KEY = "@theme_preference";

// Fields are typed HexColor (not `string`) because they flow directly into
// react-native-android-widget's style props, which require `` `#${string}` ``.
// theme.ts's color objects are plain hex literals at runtime but widen to
// `string` in the AppTheme type, hence the casts in pick() below.
export interface WidgetColors {
    background: HexColor;
    surface: HexColor;
    onSurface: HexColor;
    onSurfaceVariant: HexColor;
    primary: HexColor;
    onPrimary: HexColor;
    income: HexColor;
    expense: HexColor;
    success: HexColor;
    secondary: HexColor;
    error: HexColor;
    outlineVariant: HexColor;
}

const pick = (theme: AppTheme): WidgetColors => ({
    background: theme.colors.surfaceContainerLow as HexColor,
    surface: theme.colors.surfaceContainer as HexColor,
    onSurface: theme.colors.onSurface as HexColor,
    onSurfaceVariant: theme.colors.onSurfaceVariant as HexColor,
    primary: theme.colors.primary as HexColor,
    onPrimary: theme.colors.onPrimary as HexColor,
    income: theme.colors.income as HexColor,
    expense: theme.colors.expense as HexColor,
    success: theme.colors.success as HexColor,
    secondary: theme.colors.secondary as HexColor,
    error: theme.colors.error as HexColor,
    outlineVariant: theme.colors.outlineVariant as HexColor,
});

// Budget bar color from usage percentage, matching getBudgetStatusColor thresholds.
export const budgetBarColor = (percentage: number, c: WidgetColors): HexColor => {
    if (percentage < 70) return c.success;
    if (percentage < 90) return c.secondary;
    return c.error;
};

export const resolveWidgetTheme = async (): Promise<AppTheme> => {
    let mode: string | null = null;
    try {
        mode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    } catch {
        mode = null;
    }
    const isDark =
        mode === "dark" || ((mode === "system" || !mode) && Appearance.getColorScheme() === "dark");
    return isDark ? darkTheme : lightTheme;
};

export const resolveWidgetColors = async (): Promise<WidgetColors> => pick(await resolveWidgetTheme());
