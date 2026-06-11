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
    primaryContainer: "#DCE6FB",
    onPrimaryContainer: "#0A2C66",

    // --- Secondary (warm taupe) ---
    secondary: "#5F5A4E",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#EDE8DD",
    onSecondaryContainer: "#211D14",

    // --- Tertiary (deep green) ---
    tertiary: "#2E5339",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#DCE5D7",
    onTertiaryContainer: "#122B19",

    // --- Error ---
    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#F6DAD2",
    onErrorContainer: "#410002",

    // --- Surfaces (warm paper) ---
    background: "#F7F4EF",
    onBackground: "#26231D",
    onSurface: "#26231D",
    surfaceVariant: "#EDE8DD",
    onSurfaceVariant: "#6E6A61",
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#FCFAF6",
    surfaceContainer: "#F1EDE5",
    surfaceContainerHigh: "#EDE8DD",
    surfaceContainerHighest: "#E7E2D8",
    surfaceDim: "#E2DDD2",
    surfaceBright: "#F7F4EF",

    // --- Outline / utility ---
    outline: "#8A857A",
    outlineVariant: "#E7E2D8",
    inverseSurface: "#26231D",
    inverseOnSurface: "#F4F1EA",
    inversePrimary: "#7FA9FF",
    scrim: "#000000",
    shadow: "#4A3F28",

    // --- Finance semantics (harmonized custom roles) ---
    income: "#3E7049",
    onIncome: "#FFFFFF",
    incomeContainer: "#DDF0E0",
    onIncomeContainer: "#12301A",
    expense: "#A8392E",
    onExpense: "#FFFFFF",
    expenseContainer: "#F6DAD2",
    onExpenseContainer: "#3B0905",
    gold: "#8C6A14",
    goldContainer: "#F2E2B3",
    onGoldContainer: "#2A1F00",

    // --- Categorical chart palette ---
    chart: [
        "#0066FF",
        "#0E7C52",
        "#A8702E",
        "#B85C38",
        "#6D3FA0",
        "#0E6E7C",
        "#8C3A4B",
        "#5F5A4E",
    ],

    // --- Legacy aliases (kept so un-migrated screens stay coherent) ---
    success: "#3E7049",
    placeholder: "#9B968B",
    card: "#FFFFFF",
    darkCard: "#26231D",
    surface: "#EDE8DD", // chips / tonal buttons -> surfaceContainerHigh
    text: "#26231D",
    textSecondary: "#6E6A61",
    textInverse: "#FFFFFF", // == onPrimary
    border: "#E7E2D8",
    borderLight: "#F0ECE3",
    accent: "#0066FF",
    incomeBg: "#DDF0E0",
    expenseBg: "#F6DAD2",
    sage: "#EDE8DD",
    sageSurface: "#F1EDE5",
    goldDark: "#6E5410",
    charcoal: "#26231D",
    chartBlue: "#0066FF",
    chartPurple: "#6D3FA0",
    chartGreen: "#0E7C52",
    gradientStart: "#0066FF",
    gradientMid: "#0059E0",
    gradientEnd: "#0047B8",
};

const darkColors: typeof lightColors = {
    primary: "#7FA9FF",
    onPrimary: "#002B75",
    primaryContainer: "#0047B8",
    onPrimaryContainer: "#DCE6FB",

    secondary: "#C9C2B2",
    onSecondary: "#332F26",
    secondaryContainer: "#3A362C",
    onSecondaryContainer: "#EDE8DD",

    tertiary: "#A9C3A4",
    onTertiary: "#1A2E1E",
    tertiaryContainer: "#2E4632",
    onTertiaryContainer: "#DCE5D7",

    error: "#FFB4AB",
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",

    background: "#15130F",
    onBackground: "#F2EFE8",
    onSurface: "#F2EFE8",
    surfaceVariant: "#3A362C",
    onSurfaceVariant: "#A6A095",
    surfaceContainerLowest: "#100E0B",
    surfaceContainerLow: "#1D1B16",
    surfaceContainer: "#211E18",
    surfaceContainerHigh: "#2B2820",
    surfaceContainerHighest: "#353128",
    surfaceDim: "#15130F",
    surfaceBright: "#3A362C",

    outline: "#8A857A",
    outlineVariant: "#2B2820",
    inverseSurface: "#F2EFE8",
    inverseOnSurface: "#2E2B24",
    inversePrimary: "#0066FF",
    scrim: "#000000",
    shadow: "#000000",

    income: "#7FB389",
    onIncome: "#0E2914",
    incomeContainer: "#1F3324",
    onIncomeContainer: "#DDF0E0",
    expense: "#E5948A",
    onExpense: "#3B0905",
    expenseContainer: "#3A2620",
    onExpenseContainer: "#F6DAD2",
    gold: "#E0BE6A",
    goldContainer: "#4A3B12",
    onGoldContainer: "#F2E2B3",

    chart: [
        "#7FA9FF",
        "#7FB389",
        "#D9A05B",
        "#E08A60",
        "#B79CE0",
        "#6FC4D4",
        "#D98A9C",
        "#A6A095",
    ],

    success: "#7FB389",
    placeholder: "#6E695F",
    card: "#1D1B16",
    darkCard: "#100E0B",
    surface: "#2B2820",
    text: "#F2EFE8",
    textSecondary: "#A6A095",
    textInverse: "#002B75", // == onPrimary (dark primary is light, needs dark ink)
    border: "#2B2820",
    borderLight: "#26231D",
    accent: "#7FA9FF",
    incomeBg: "rgba(127,179,137,0.16)",
    expenseBg: "rgba(229,148,138,0.14)",
    sage: "#3A362C",
    sageSurface: "#2B2820",
    goldDark: "#E0BE6A",
    charcoal: "#F2EFE8",
    chartBlue: "#7FA9FF",
    chartPurple: "#B79CE0",
    chartGreen: "#7FB389",
    gradientStart: "#0066FF",
    gradientMid: "#0059E0",
    gradientEnd: "#0047B8",
};

// Manrope faces registered by @expo-google-fonts/manrope (one family per weight;
// never combine with fontWeight or Android synthesizes fake bolds).
const fonts = {
    light: "Manrope_300Light",
    regular: "Manrope_400Regular",
    semibold: "Manrope_600SemiBold",
    bold: "Manrope_700Bold",
};

// Payment-card gradients keyed by ISO currency code; deterministic fallback cycle.
const cardGradients: Record<string, [string, string]> = {
    GHS: ["#0066FF", "#0047B8"],
    NGN: ["#0E7C52", "#085C3B"],
    USD: ["#3A3F4A", "#23272F"],
};
const fallbackCardGradients: [string, string][] = [
    ["#6D3FA0", "#4E2B77"],
    ["#0E6E7C", "#094E58"],
    ["#8C3A4B", "#662735"],
];
export const getCardGradient = (currency: string, index: number): [string, string] =>
    cardGradients[currency] ?? fallbackCardGradients[index % fallbackCardGradients.length];

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

// M3 type scale. Values are { fontSize, lineHeight, fontFamily, letterSpacing }.
const typescale = {
    displayLarge: { fontSize: 57, lineHeight: 64, fontFamily: fonts.light, letterSpacing: -0.25 },
    displayMedium: { fontSize: 45, lineHeight: 52, fontFamily: fonts.light, letterSpacing: 0 },
    displaySmall: { fontSize: 36, lineHeight: 44, fontFamily: fonts.light, letterSpacing: 0 },
    headlineLarge: { fontSize: 32, lineHeight: 40, fontFamily: fonts.bold, letterSpacing: 0 },
    headlineMedium: { fontSize: 28, lineHeight: 36, fontFamily: fonts.bold, letterSpacing: 0 },
    headlineSmall: { fontSize: 24, lineHeight: 32, fontFamily: fonts.semibold, letterSpacing: 0 },
    titleLarge: { fontSize: 22, lineHeight: 28, fontFamily: fonts.semibold, letterSpacing: 0 },
    titleMedium: { fontSize: 16, lineHeight: 24, fontFamily: fonts.semibold, letterSpacing: 0.15 },
    titleSmall: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold, letterSpacing: 0.1 },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular, letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, letterSpacing: 0.25 },
    bodySmall: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, letterSpacing: 0.4 },
    labelLarge: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, lineHeight: 16, fontFamily: fonts.semibold, letterSpacing: 0.5 },
    labelSmall: { fontSize: 11, lineHeight: 16, fontFamily: fonts.semibold, letterSpacing: 0.5 },
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
    fonts,
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
