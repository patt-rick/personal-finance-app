// Material 3 ("Material You") theme.
// Color roles are generated from the seed color #0066FF using Google's
// material-color-utilities tonal palettes. The literal seed is kept as the
// light-mode `primary` per product requirement; dark mode uses the M3 tone-80
// variant so brand color stays legible on dark surfaces.
//
// Both the full set of M3 roles (primary, surfaceContainer*, outline, ...) and
// the legacy token names used across the existing screens are exposed, so the
// whole app re-colors immediately while components are migrated to the new
// roles screen by screen.

import { Platform } from "react-native";

const lightColors = {
    // --- Primary ---
    primary: "#0066FF", // seed, kept verbatim
    onPrimary: "#FFFFFF",
    primaryContainer: "#DAE1FF",
    onPrimaryContainer: "#001849",

    // --- Secondary ---
    secondary: "#585E71",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#DDE2F9",
    onSecondaryContainer: "#151B2C",

    // --- Tertiary ---
    tertiary: "#735471",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#FFD6F9",
    onTertiaryContainer: "#2B122B",

    // --- Error ---
    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#FFDAD6",
    onErrorContainer: "#410002",

    // --- Surfaces ---
    background: "#FBF8FD",
    onBackground: "#1B1B1F",
    onSurface: "#1B1B1F",
    surfaceVariant: "#E2E2EC",
    onSurfaceVariant: "#45464F",
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#F5F3F7",
    surfaceContainer: "#EFEDF1",
    surfaceContainerHigh: "#E9E7EC",
    surfaceContainerHighest: "#E4E2E6",
    surfaceDim: "#DBD9DD",
    surfaceBright: "#FBF8FD",

    // --- Outline / utility ---
    outline: "#757680",
    outlineVariant: "#C5C6D0",
    inverseSurface: "#303034",
    inverseOnSurface: "#F2F0F4",
    inversePrimary: "#B3C5FF",
    scrim: "#000000",
    shadow: "#000000",

    // --- Finance semantics (harmonized custom roles) ---
    income: "#1B6D24",
    onIncome: "#FFFFFF",
    incomeContainer: "#A3F69C",
    onIncomeContainer: "#002204",
    expense: "#BA1A1A",
    onExpense: "#FFFFFF",
    expenseContainer: "#FFDAD6",
    onExpenseContainer: "#410002",
    gold: "#967200",
    goldContainer: "#FFDF99",
    onGoldContainer: "#251A00",

    // --- Categorical chart palette ---
    chart: [
        "#0066FF",
        "#7C4DFF",
        "#00A877",
        "#FF6D3F",
        "#00B0D8",
        "#E5377E",
        "#F2A100",
        "#3949AB",
    ],

    // --- Legacy aliases (kept so un-migrated screens stay coherent) ---
    success: "#1B6D24",
    placeholder: "#757680",
    card: "#F5F3F7", // elevated card -> surfaceContainerLow
    darkCard: "#1B1B1F",
    surface: "#E9E7EC", // chips / tonal buttons -> surfaceContainerHigh
    text: "#1B1B1F",
    textSecondary: "#45464F",
    textInverse: "#FFFFFF", // == onPrimary
    border: "#C5C6D0",
    borderLight: "#E5E5EF",
    accent: "#0066FF",
    incomeBg: "#DCEFD8",
    expenseBg: "#F8E3DF",
    sage: "#DDE2F9",
    sageSurface: "#E9E7EC",
    goldDark: "#775A00",
    charcoal: "#1B1B1F",
    chartBlue: "#0066FF",
    chartPurple: "#7C4DFF",
    chartGreen: "#00A877",
    gradientStart: "#0054D6",
    gradientMid: "#0066FF",
    gradientEnd: "#003FA4",
};

const darkColors: typeof lightColors = {
    primary: "#B3C5FF",
    onPrimary: "#002B75",
    primaryContainer: "#003FA4",
    onPrimaryContainer: "#DAE1FF",

    secondary: "#C1C6DD",
    onSecondary: "#2A3042",
    secondaryContainer: "#414659",
    onSecondaryContainer: "#DDE2F9",

    tertiary: "#E1BBDC",
    onTertiary: "#422741",
    tertiaryContainer: "#5A3D58",
    onTertiaryContainer: "#FFD6F9",

    error: "#FFB4AB",
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",

    background: "#131316",
    onBackground: "#E4E2E6",
    onSurface: "#E4E2E6",
    surfaceVariant: "#45464F",
    onSurfaceVariant: "#C5C6D0",
    surfaceContainerLowest: "#0D0E11",
    surfaceContainerLow: "#1B1B1F",
    surfaceContainer: "#1F1F23",
    surfaceContainerHigh: "#292A2D",
    surfaceContainerHighest: "#343438",
    surfaceDim: "#131316",
    surfaceBright: "#39393C",

    outline: "#8F909A",
    outlineVariant: "#45464F",
    inverseSurface: "#E4E2E6",
    inverseOnSurface: "#303034",
    inversePrimary: "#0054D6",
    scrim: "#000000",
    shadow: "#000000",

    income: "#88D982",
    onIncome: "#003909",
    incomeContainer: "#005312",
    onIncomeContainer: "#A3F69C",
    expense: "#FFB4AB",
    onExpense: "#690005",
    expenseContainer: "#93000A",
    onExpenseContainer: "#FFDAD6",
    gold: "#F1C042",
    goldContainer: "#5A4300",
    onGoldContainer: "#FFDF99",

    chart: [
        "#9DB6FF",
        "#C6AEFF",
        "#62D9B0",
        "#FF9E7D",
        "#6FD8F0",
        "#FF93B8",
        "#FFCB57",
        "#9FB0FF",
    ],

    success: "#88D982",
    placeholder: "#8F909A",
    card: "#1B1B1F",
    darkCard: "#0D0E11",
    surface: "#292A2D",
    text: "#E4E2E6",
    textSecondary: "#C5C6D0",
    textInverse: "#002B75", // == onPrimary (dark primary is light, needs dark ink)
    border: "#45464F",
    borderLight: "#2E3038",
    accent: "#B3C5FF",
    incomeBg: "rgba(136,217,130,0.16)",
    expenseBg: "rgba(255,180,171,0.16)",
    sage: "#414659",
    sageSurface: "#292A2D",
    goldDark: "#D3A527",
    charcoal: "#E4E2E6",
    chartBlue: "#9DB6FF",
    chartPurple: "#C6AEFF",
    chartGreen: "#62D9B0",
    gradientStart: "#0054D6",
    gradientMid: "#0066FF",
    gradientEnd: "#002B75",
};

// M3 shape scale (corner radii).
const shape = {
    none: 0,
    extraSmall: 4,
    small: 8,
    medium: 12,
    large: 16,
    largeIncreased: 20,
    extraLarge: 28,
    full: 999,
};

// M3 type scale. Values are { fontSize, lineHeight, fontWeight, letterSpacing }.
const typescale = {
    displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: "400" as const, letterSpacing: -0.25 },
    displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: "400" as const, letterSpacing: 0 },
    displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: "400" as const, letterSpacing: 0 },
    headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: "700" as const, letterSpacing: 0 },
    headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: "700" as const, letterSpacing: 0 },
    headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: "600" as const, letterSpacing: 0 },
    titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const, letterSpacing: 0 },
    titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: "600" as const, letterSpacing: 0.15 },
    titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: "600" as const, letterSpacing: 0.1 },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const, letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const, letterSpacing: 0.25 },
    bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const, letterSpacing: 0.4 },
    labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: "600" as const, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.5 },
    labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.5 },
};

// M3 elevation levels mapped to RN shadow/elevation props.
const buildElevation = (shadowColor: string) => ({
    level0: {},
    level1: {
        ...Platform.select({
            ios: { shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.16, shadowRadius: 3 },
            android: { elevation: 1 },
        }),
    },
    level2: {
        ...Platform.select({
            ios: { shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6 },
            android: { elevation: 3 },
        }),
    },
    level3: {
        ...Platform.select({
            ios: { shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
            android: { elevation: 6 },
        }),
    },
    level4: {
        ...Platform.select({
            ios: { shadowColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 14 },
            android: { elevation: 8 },
        }),
    },
    level5: {
        ...Platform.select({
            ios: { shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 20 },
            android: { elevation: 12 },
        }),
    },
});

// M3 state-layer opacities (for pressed/hover overlays & activeOpacity).
const state = {
    hover: 0.08,
    focus: 0.1,
    pressed: 0.1,
    dragged: 0.16,
    disabledContainer: 0.12,
    disabledContent: 0.38,
};

// M3 motion tokens.
const motion = {
    duration: { short: 150, medium: 250, long: 400, extraLong: 500 },
    easing: {
        standard: { useNativeDriver: true },
    },
};

const spacing = {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
};

// Legacy radius aliases kept for un-migrated styles; mapped onto the M3 scale.
const borderRadius = {
    s: 8,
    m: 12,
    l: 20,
    round: 28,
};

export const lightTheme = {
    dark: false,
    colors: lightColors,
    spacing,
    borderRadius,
    shape,
    typescale,
    elevation: buildElevation(lightColors.shadow),
    state,
    motion,
};

export const darkTheme = {
    ...lightTheme,
    dark: true,
    colors: darkColors,
    elevation: buildElevation(darkColors.shadow),
};

export type AppTheme = typeof lightTheme;

import { useThemeContext } from "./ThemeContext";

export const useTheme = (): AppTheme => {
    try {
        const { theme } = useThemeContext();
        return theme;
    } catch (e) {
        // Fallback if context is not available
        return lightTheme;
    }
};

export const theme = lightTheme;
