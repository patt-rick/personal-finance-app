# Wallet Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **UI work:** per CLAUDE.md, invoke the `frontend-design` skill before implementing UI changes.

**Goal:** Land the "Wallet" visual language foundation — warm palette re-seed, Manrope type, PaymentCard hero, icon system, tab bar v2 — across the four tab screens and core transaction modals.

**Architecture:** Re-seed values in `src/theme/theme.ts` under existing token names (no parallel theme). New shared components (`PaymentCard`, `CategoryIcon`, `MoneyText`, `ListCard`) carry the language; screens migrate to them one task at a time, swapping legacy aliases for M3 roles as touched.

**Tech Stack:** Expo SDK 54, RN 0.81, TypeScript, `expo-font` + `@expo-google-fonts/manrope`, `lucide-react-native`, `react-native-svg`, `expo-linear-gradient`, jest.

**Spec:** `docs/superpowers/specs/2026-06-11-wallet-redesign-design.md`

**Verification gate for every task:** `npx tsc -b` clean and `yarn test`-equivalent (`npx jest`) green before commit.

---

### Task 1: Manrope font loading

**Files:**
- Modify: `package.json` (via expo install)
- Modify: `App.tsx`

- [ ] **Step 1: Install packages**

```bash
npx expo install expo-font @expo-google-fonts/manrope
```

(Repo precedent from ASO_ACTION_PLAN.md: `npx expo install` for SDK-pinned versions. Never plain `npm install`.)

- [ ] **Step 2: Load fonts at the root in `App.tsx`**

Add imports:

```tsx
import { useFonts, Manrope_300Light, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
```

In `App()` (the outer component, NOT `MainApp`):

```tsx
export default function App() {
    const [fontsLoaded] = useFonts({
        Manrope_300Light,
        Manrope_400Regular,
        Manrope_600SemiBold,
        Manrope_700Bold,
    });

    if (!fontsLoaded) {
        return <View style={{ flex: 1, backgroundColor: "#F7F4EF" }} />;
    }

    return (
        <ThemeProvider>
            <MainApp />
        </ThemeProvider>
    );
}
```

(`View` is already imported in App.tsx. Plain background, not SplashScreen — SplashScreen will reference Manrope via theme and must not render before fonts exist. Bundled fonts resolve in well under the existing 3 s splash minimum.)

- [ ] **Step 3: Verify** — `npx tsc -b` clean; `npx expo start` boots without font redbox.

- [ ] **Step 4: Commit** — `git commit -m "feat: bundle Manrope via expo-font"`

---

### Task 2: Theme re-seed (palette + type + card colors)

**Files:**
- Modify: `src/theme/theme.ts`

- [ ] **Step 1: Replace `lightColors` values** (same keys, warm values):

```ts
const lightColors = {
    primary: "#0066FF",
    onPrimary: "#FFFFFF",
    primaryContainer: "#DCE6FB",
    onPrimaryContainer: "#0A2C66",

    secondary: "#5F5A4E",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#EDE8DD",
    onSecondaryContainer: "#211D14",

    tertiary: "#2E5339",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#DCE5D7",
    onTertiaryContainer: "#122B19",

    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#F6DAD2",
    onErrorContainer: "#410002",

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

    outline: "#8A857A",
    outlineVariant: "#E7E2D8",
    inverseSurface: "#26231D",
    inverseOnSurface: "#F4F1EA",
    inversePrimary: "#7FA9FF",
    scrim: "#000000",
    shadow: "#4A3F28",

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

    success: "#3E7049",
    placeholder: "#9B968B",
    card: "#FFFFFF",
    darkCard: "#26231D",
    surface: "#EDE8DD",
    text: "#26231D",
    textSecondary: "#6E6A61",
    textInverse: "#FFFFFF",
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
```

- [ ] **Step 2: Replace `darkColors` values**:

```ts
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
    textInverse: "#002B75",
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
```

- [ ] **Step 3: Add `fonts` map + per-currency card gradients** (below `shape`):

```ts
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
```

- [ ] **Step 4: Re-type the typescale** — replace `fontWeight` with `fontFamily` (per-weight families; keeping `fontWeight` would make Android synthesize fake bolds):

```ts
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
```

Add `fonts` to both exported themes: `export const lightTheme = { dark: false, colors: lightColors, spacing, borderRadius, shape, typescale, fonts, elevation: ..., state, motion };`

If any caller breaks on the removed `fontWeight` property (tsc will say), fix the caller to use `fontFamily` semantics — do not add `fontWeight` back.

- [ ] **Step 5: Verify** — `npx tsc -b`; `npx jest`. Boot the app: everything re-colors warm; un-migrated screens must remain readable in light AND dark.

- [ ] **Step 6: Commit** — `git commit -m "feat: re-seed theme to warm Wallet palette with Manrope typescale"`

---

### Task 3: MoneyText component

**Files:**
- Create: `src/components/MoneyText.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import { useTheme } from "../theme/theme";

interface MoneyTextProps {
    amount: number;
    symbol?: string;
    sign?: "+" | "-" | "";
    size?: number;
    color?: string;
    weight?: "light" | "regular" | "semibold" | "bold";
    showDecimals?: boolean;
    decimalColor?: string;
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
    adjustsFontSizeToFit?: boolean;
}

export default function MoneyText({
    amount,
    symbol = "",
    sign = "",
    size = 16,
    color,
    weight = "semibold",
    showDecimals = true,
    decimalColor,
    style,
    numberOfLines,
    adjustsFontSizeToFit,
}: MoneyTextProps) {
    const theme = useTheme();
    const ink = color ?? theme.colors.onSurface;
    const abs = Math.abs(amount);
    const whole = Math.floor(abs).toLocaleString();
    const decimals = (abs % 1).toFixed(2).slice(1); // ".00"

    return (
        <Text
            numberOfLines={numberOfLines}
            adjustsFontSizeToFit={adjustsFontSizeToFit}
            style={[
                {
                    fontSize: size,
                    fontFamily: theme.fonts[weight],
                    color: ink,
                    fontVariant: ["tabular-nums"],
                },
                style,
            ]}
        >
            {sign}
            {symbol ? `${symbol} ` : ""}
            {whole}
            {showDecimals ? (
                <Text
                    style={{
                        fontSize: Math.round(size * 0.55),
                        color: decimalColor ?? theme.colors.placeholder,
                        fontFamily: theme.fonts[weight],
                        fontVariant: ["tabular-nums"],
                    }}
                >
                    {decimals}
                </Text>
            ) : null}
        </Text>
    );
}
```

- [ ] **Step 2: Verify** — `npx tsc -b`.

- [ ] **Step 3: Commit** — `git commit -m "feat: add MoneyText with tabular numerals and muted decimals"`

---

### Task 4: CategoryIcon component

**Files:**
- Create: `src/components/CategoryIcon.tsx`

- [ ] **Step 1: Implement** — keyword-matched lucide icon in a tonal circle, optional auto-logged lightning badge:

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import {
    Briefcase, Utensils, Bus, ShoppingBag, ReceiptText, HeartPulse,
    GraduationCap, Smartphone, Home, Gift, Repeat, Tag, Zap, TrendingUp,
} from "lucide-react-native";
import { useTheme } from "../theme/theme";

const RULES: { match: RegExp; Icon: React.ComponentType<any> }[] = [
    { match: /food|lunch|dinner|grocer|restaurant|chop/i, Icon: Utensils },
    { match: /transport|fuel|taxi|bus|uber|bolt|trotro/i, Icon: Bus },
    { match: /salary|wage|client|payment|income|sale/i, Icon: Briefcase },
    { match: /shop|cloth|market/i, Icon: ShoppingBag },
    { match: /bill|utilit|electric|water|rent/i, Icon: ReceiptText },
    { match: /health|medic|hospital|pharmac/i, Icon: HeartPulse },
    { match: /school|educat|tuition|book/i, Icon: GraduationCap },
    { match: /momo|airtime|data|phone|transfer/i, Icon: Smartphone },
    { match: /home|house/i, Icon: Home },
    { match: /gift|donat/i, Icon: Gift },
    { match: /recur|subscript/i, Icon: Repeat },
    { match: /invest|interest|dividend/i, Icon: TrendingUp },
];

// Warm tonal pairs [light bg, light fg, dark bg, dark fg]; stable by name hash.
const TONES: [string, string, string, string][] = [
    ["#F6E8D8", "#A8702E", "#352A1B", "#D9A05B"],
    ["#FCE4D6", "#B85C38", "#3A2620", "#E08A60"],
    ["#E4E0F2", "#6D5FA0", "#2B2838", "#B0A4E0"],
    ["#DCE9EC", "#0E6E7C", "#1C2E32", "#6FC4D4"],
    ["#F2DEE2", "#8C3A4B", "#342227", "#D98A9C"],
];

const hashName = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
};

interface CategoryIconProps {
    category?: string;
    type: "income" | "expense";
    autoLogged?: boolean;
    size?: number;
}

export default function CategoryIcon({ category, type, autoLogged, size = 34 }: CategoryIconProps) {
    const theme = useTheme();
    const name = category ?? "";
    const rule = RULES.find((r) => r.match.test(name));
    const Icon = rule?.Icon ?? (type === "income" ? Briefcase : Tag);

    let bg: string, fg: string;
    if (type === "income") {
        bg = theme.colors.incomeContainer;
        fg = theme.colors.income;
    } else {
        const tone = TONES[hashName(name) % TONES.length];
        bg = theme.dark ? tone[2] : tone[0];
        fg = theme.dark ? tone[3] : tone[1];
    }

    return (
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
            <Icon size={size * 0.47} color={fg} strokeWidth={2} />
            {autoLogged ? (
                <View style={[styles.badge, { backgroundColor: "#0066FF", borderColor: theme.colors.card }]}>
                    <Zap size={7} color="#FFFFFF" strokeWidth={3} fill="#FFFFFF" />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    circle: { alignItems: "center", justifyContent: "center" },
    badge: {
        position: "absolute",
        right: -3,
        bottom: -3,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
```

- [ ] **Step 2: Verify** — `npx tsc -b`. Confirm every lucide name imported exists in `lucide-react-native@0.562` (rename imports if tsc complains).

- [ ] **Step 3: Commit** — `git commit -m "feat: add CategoryIcon with tonal palette and auto-log badge"`

---

### Task 5: ListCard container

**Files:**
- Create: `src/components/ListCard.tsx`

- [ ] **Step 1: Implement** — bordered card that wraps rows with inset hairline separators:

```tsx
import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../theme/theme";

interface ListCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export default function ListCard({ children, style }: ListCardProps) {
    const theme = useTheme();
    const items = React.Children.toArray(children).filter(Boolean);

    return (
        <View
            style={[
                {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderRadius: 14,
                    overflow: "hidden",
                },
                style,
            ]}
        >
            {items.map((child, i) => (
                <React.Fragment key={i}>
                    {child}
                    {i < items.length - 1 ? (
                        <View
                            style={{
                                height: StyleSheet.hairlineWidth,
                                backgroundColor: theme.colors.borderLight,
                                marginHorizontal: 12,
                            }}
                        />
                    ) : null}
                </React.Fragment>
            ))}
        </View>
    );
}
```

- [ ] **Step 2: Verify + commit** — `npx tsc -b`; `git commit -m "feat: add ListCard bordered list container"`

---

### Task 6: PaymentCard (replaces BalanceCard)

**Files:**
- Create: `src/components/dashboard/PaymentCard.tsx`
- Modify: `src/screens/DashboardScreen.tsx` (import swap only, full restyle is Task 9)
- Delete: `src/components/dashboard/BalanceCard.tsx` (after the import swap)

- [ ] **Step 1: Implement `PaymentCard.tsx`**

```tsx
import React, { useCallback, useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, Dimensions,
    NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { getCurrencySymbol } from "../../utils/_helpers";
import { useTheme, getCardGradient } from "../../theme/theme";
import MoneyText from "../MoneyText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_H_PADDING = 20;
const CARD_GAP = 12;
const PEEK_WIDTH = 24;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2 - PEEK_WIDTH;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const CARD_RATIO = 1.586;

export interface CurrencyBalance {
    currency: string;
    income: number;
    expense: number;
    balance: number;
}

const CURRENCY_NAMES: Record<string, string> = {
    GHS: "Cedis", NGN: "Naira", USD: "Dollars", EUR: "Euros", GBP: "Pounds",
};

function Contactless() {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M6 8.5a8 8 0 0 1 0 7" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M9.5 6.5a12 12 0 0 1 0 11" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M13 4.5a16 16 0 0 1 0 15" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
    );
}

function Chip() {
    return (
        <LinearGradient colors={["#E8D9A8", "#C9B26E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
            <View style={styles.chipInner} />
        </LinearGradient>
    );
}

function Roundel() {
    return (
        <View style={styles.roundelRow}>
            <View style={[styles.roundel, { backgroundColor: "rgba(255,255,255,0.85)" }]} />
            <View style={[styles.roundel, styles.roundelOverlap, { backgroundColor: "rgba(255,210,80,0.85)" }]} />
        </View>
    );
}

function CardArt() {
    return (
        <Svg width={190} height={190} viewBox="0 0 190 190" style={styles.cardArt} pointerEvents="none">
            <Circle cx={140} cy={28} r={80} stroke="rgba(255,255,255,0.05)" strokeWidth={28} fill="none" />
        </Svg>
    );
}

interface PaymentCardProps {
    currencies: CurrencyBalance[];
    onPageChange?: (index: number) => void;
}

export default function PaymentCard({ currencies, onPageChange }: PaymentCardProps) {
    const theme = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const multiPage = currencies.length > 1;

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
            if (index !== activeIndex && index >= 0 && index < currencies.length) {
                setActiveIndex(index);
                onPageChange?.(index);
            }
        },
        [activeIndex, currencies.length, onPageChange],
    );

    const renderCard = (item: CurrencyBalance, index: number, cardWidth: number) => {
        const symbol = getCurrencySymbol(item.currency);
        const [from, to] = getCardGradient(item.currency, index);
        return (
            <View style={{ width: cardWidth }} key={item.currency}>
                <LinearGradient
                    colors={[from, to]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, { height: cardWidth / CARD_RATIO, shadowColor: from }]}
                >
                    <CardArt />
                    <View style={styles.topRow}>
                        <Text style={[styles.currencyName, { fontFamily: theme.fonts.semibold }]}>
                            {CURRENCY_NAMES[item.currency] ?? item.currency}
                        </Text>
                        <Contactless />
                    </View>
                    <Chip />
                    <MoneyText
                        amount={item.balance}
                        symbol={symbol}
                        size={26}
                        color="#FFFFFF"
                        decimalColor="rgba(255,255,255,0.6)"
                        weight="semibold"
                        style={styles.balance}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    />
                    <View style={styles.bottomRow}>
                        <Text style={[styles.inOut, { fontFamily: theme.fonts.semibold }]} numberOfLines={1}>
                            IN {symbol} {item.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            {"  ·  "}
                            OUT {symbol} {item.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </Text>
                        <Roundel />
                    </View>
                </LinearGradient>
            </View>
        );
    };

    if (currencies.length <= 1) {
        const item = currencies[0] ?? { currency: "USD", income: 0, expense: 0, balance: 0 };
        return <View style={styles.container}>{renderCard(item, 0, SCREEN_WIDTH - CARD_H_PADDING * 2)}</View>;
    }

    return (
        <View style={styles.containerMulti}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: CARD_H_PADDING, gap: CARD_GAP }}
            >
                {currencies.map((c, i) => renderCard(c, i, CARD_WIDTH))}
            </ScrollView>
            <View style={styles.dotsRow}>
                {currencies.map((c, i) => (
                    <View
                        key={c.currency}
                        style={[
                            styles.dot,
                            {
                                backgroundColor: i === activeIndex ? theme.colors.primary : theme.colors.outlineVariant,
                                width: i === activeIndex ? 18 : 5,
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: CARD_H_PADDING, marginTop: 8 },
    containerMulti: { marginTop: 8 },
    card: {
        borderRadius: 16,
        padding: 18,
        overflow: "hidden",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 8,
    },
    cardArt: { position: "absolute", top: -20, right: -30 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    currencyName: {
        fontSize: 11,
        letterSpacing: 1.6,
        color: "rgba(255,255,255,0.85)",
        textTransform: "uppercase",
    },
    chip: { width: 34, height: 25, borderRadius: 5, marginTop: 10, padding: 4 },
    chipInner: { flex: 1, borderRadius: 2, borderWidth: 1, borderColor: "rgba(80,60,20,0.35)" },
    balance: {
        marginTop: 8,
        textShadowColor: "rgba(0,30,80,0.35)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    bottomRow: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 13,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    inOut: { fontSize: 9, letterSpacing: 0.5, color: "rgba(255,255,255,0.9)", flexShrink: 1 },
    roundelRow: { flexDirection: "row", alignItems: "center" },
    roundel: { width: 18, height: 18, borderRadius: 9 },
    roundelOverlap: { marginLeft: -8 },
    dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, gap: 5 },
    dot: { height: 5, borderRadius: 3 },
});
```

- [ ] **Step 2: Swap usage in `DashboardScreen.tsx`** — replace `import BalanceCard, { CurrencyBalance } from "../components/dashboard/BalanceCard";` with `import PaymentCard, { CurrencyBalance } from "../components/dashboard/PaymentCard";` and update the JSX call site: `<BalanceCard currencies={...} weeklyGrowth={...} onPageChange={...} />` → `<PaymentCard currencies={...} onPageChange={...} />`. Keep the `weeklyGrowth` value in scope — Task 9 renders it as the insight line.

- [ ] **Step 3: Delete `BalanceCard.tsx`**; grep for remaining imports: `grep -rn "BalanceCard" src/ App.tsx` → must return nothing.

- [ ] **Step 4: Verify** — `npx tsc -b`; `npx jest`; visual check light+dark: card ratio, chip, contactless, roundel, peek + dots.

- [ ] **Step 5: Commit** — `git commit -m "feat: replace BalanceCard with payment-style PaymentCard"`

---

### Task 7: FloatingTabBar v2 (ink pill + active dot + FAB)

**Files:**
- Modify: `src/components/FloatingTabBar.tsx`
- Modify: `App.tsx` (pass `onQuickAdd` callback)

- [ ] **Step 1: Restyle the bar** in `FloatingTabBar.tsx`:
  - Bar background: `theme.colors.inverseSurface`; remove border entirely; keep `elevation.level2`+shadow.
  - Icons: keep lucide set `[LayoutGrid → Home, Landmark → BookOpen, PiggyBank → PieChart, Settings → SlidersHorizontal]` — i.e. new imports `Home, BookOpen, PieChart, SlidersHorizontal` from lucide-react-native.
  - Active icon color `theme.colors.inverseOnSurface`, inactive `rgba-muted` of it (use `theme.colors.outline`).
  - Replace the sliding indicator pill with a 4px dot under the active icon (keep the existing `Animated.spring` translateX, resize indicator to a 4×4 dot, color `#0066FF` — literal, both modes, per spec).
  - Labels stay hidden (icons only).
- [ ] **Step 2: Add the FAB** — a 5th, non-route slot at the right end of the bar: 34px circle, background `#0066FF` (literal in both modes per spec), white `Plus` icon (lucide). New prop:

```tsx
interface FloatingTabBarExtraProps {
    onQuickAdd: () => void;
}
export default function FloatingTabBar({ state, navigation, onQuickAdd }: BottomTabBarProps & FloatingTabBarExtraProps) { ... }
```

Adjust layout: `TAB_COUNT` stays 4 but bar content becomes `[4 tabs][divider gap][FAB]`; recompute `TAB_WIDTH` from the reduced tabs area (`BAR_WIDTH - FAB_AREA` where `FAB_AREA = 56`). Keep indicator math consistent with the new `TAB_WIDTH`.

- [ ] **Step 3: Wire in `App.tsx`** — `tabBar={(props) => (currentBusiness ? null : <FloatingTabBar {...props} onQuickAdd={() => setQuickAddVisible(true)} />)}`; add `const [quickAddVisible, setQuickAddVisible] = useState(false);`. (QuickAddModal itself is Task 8 — for this commit the callback can simply set state that nothing reads yet; do NOT leave a dead Alert.)
- [ ] **Step 4: Verify** — `npx tsc -b`; visual: pill inverts per mode, dot springs between icons, FAB visible.
- [ ] **Step 5: Commit** — `git commit -m "feat: ink-pill tab bar with active dot and quick-add FAB"`

---

### Task 8: QuickAddModal

**Files:**
- Create: `src/components/QuickAddModal.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Implement** — cashbook picker then reuse `TransactionEntryModal`:

```tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import { Business, Category, Transaction } from "../types";
import { loadCategories } from "../utils/storage";
import { getCurrencySymbol } from "../utils/_helpers";
import { useTheme } from "../theme/theme";
import AppModal from "./AppModal";
import TransactionEntryModal from "./TransactionEntryModal";
import ListCard from "./ListCard";

interface QuickAddModalProps {
    visible: boolean;
    businesses: Business[];
    onClose: () => void;
    onCreate: (tx: Transaction) => void;
}

export default function QuickAddModal({ visible, businesses, onClose, onCreate }: QuickAddModalProps) {
    const theme = useTheme();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selected, setSelected] = useState<Business | null>(null);

    useEffect(() => {
        if (visible) loadCategories().then(setCategories);
        if (!visible) setSelected(null);
    }, [visible]);

    useEffect(() => {
        if (visible && businesses.length === 1) setSelected(businesses[0]);
    }, [visible, businesses]);

    const handleSubmit = (data: {
        amount: number;
        category: string;
        remark: string;
        entryType: "income" | "expense";
        editingTxId: string | null;
    }) => {
        if (!selected) return;
        onCreate({
            id: Crypto.randomUUID(),
            description: data.category,
            amount: data.amount,
            date: new Date().toISOString(),
            type: data.entryType,
            businessId: selected.id,
            category: data.category,
            remark: data.remark,
            source: "manual",
        });
        onClose();
    };

    if (!visible) return null;

    if (!selected) {
        return (
            <AppModal visible onClose={onClose} title="Add to which cashbook?">
                <ListCard>
                    {businesses.map((b) => (
                        <TouchableOpacity key={b.id} style={styles.row} onPress={() => setSelected(b)}>
                            <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 15, color: theme.colors.onSurface }}>
                                {b.name}
                            </Text>
                            <Text style={{ fontFamily: theme.fonts.regular, fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                                {b.currency ?? "USD"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ListCard>
            </AppModal>
        );
    }

    return (
        <TransactionEntryModal
            visible
            entryType="expense"
            editingTx={null}
            categories={categories}
            symbol={getCurrencySymbol(selected.currency)}
            onClose={onClose}
            onSubmit={handleSubmit}
        />
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
});
```

Check `getCurrencySymbol`'s signature in `src/utils/_helpers.ts` — if it doesn't accept `undefined`, pass `selected.currency ?? "USD"`. Check `AppModal` props (`visible`, `onClose`, `title`) match its actual interface before relying on them.

- [ ] **Step 2: Wire in `App.tsx`** — render inside the root `View`, after `NavigationContainer`:

```tsx
<QuickAddModal
    visible={quickAddVisible}
    businesses={businesses}
    onClose={() => setQuickAddVisible(false)}
    onCreate={(tx) => handleSaveTransactions([...transactions, tx])}
/>
```

- [ ] **Step 3: Verify** — `npx tsc -b`; manual: FAB → picker → entry → transaction appears on Dashboard; with a single cashbook the picker is skipped.
- [ ] **Step 4: Commit** — `git commit -m "feat: quick-add transaction from tab bar FAB"`

---

### Task 9: DashboardScreen restyle

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Header** — remove `getGreetingEmoji()` and its usages (greeting stays text-only: "Good morning, {firstName}"); add a date line under it (`bodySmall`, `onSurfaceVariant`, format "Tuesday, 11 June" via `toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })`). Remove `HeaderBackdrop` decorative illustration import + usage (spec: no decorative backdrops).
- [ ] **Step 2: Insight line** — directly under the PaymentCard dots, one line: `Up {symbol} {weeklyDelta} this week — steady.` / `Down {symbol} {x} this week.` using existing weekly math that fed `weeklyGrowth`; color `income`/`onSurfaceVariant` (down is NOT red), font `fonts.regular` 13.
- [ ] **Step 3: Stat chips** — restyle the stats row to `StatChip` pattern: white/`card` bg, hairline border, radius 14, icon in 30px tonal rounded-square (TrendingUp on `incomeContainer`; pie/`PieChart` on `primaryContainer`), label 10–11 `onSurfaceVariant`, value 14–15 `fonts.semibold` tabular. If the current screen uses `StatCard`/`StatsRow` components, restyle those in place rather than inventing parallel ones.
- [ ] **Step 4: Cashbook list + recent transactions** — wrap rows in `ListCard`; rows lose per-item elevation/background; amounts via `MoneyText` (income → `theme.colors.income`, expense → plain `onSurface`); icons via `CategoryIcon`. "See all" link: `primary` color + lucide `ChevronRight` 12.
- [ ] **Step 5: Purge legacy aliases in this file** — replace `theme.colors.card→surfaceContainerLowest discipline per spec (card alias now = #FFFFFF, acceptable), incomeBg/expenseBg → incomeContainer/expenseContainer, text/textSecondary → onSurface/onSurfaceVariant, border → outlineVariant`. Replace any `fontWeight` styles with `fontFamily: theme.fonts.*`.
- [ ] **Step 6: Verify** — `npx tsc -b`; `npx jest`; visual light+dark against mockup `merged-direction-v4-icons.html`.
- [ ] **Step 7: Commit** — `git commit -m "feat: restyle Dashboard to Wallet language"`

---

### Task 10: BusinessesScreen (Books) restyle

**Files:**
- Modify: `src/screens/BusinessesScreen.tsx`

- [ ] **Step 1:** Header to match Dashboard (title `titleLarge`/`fonts.semibold`, no emojis, warm tokens).
- [ ] **Step 2:** Cashbook cards → `ListCard` rows or bordered flat cards (radius 14, hairline border, no shadow): name (`fonts.semibold` 15), currency + last-activity subtitle (`onSurfaceVariant` 12), balance right-aligned via `MoneyText` (negative balances plain ink, not red).
- [ ] **Step 3:** Create-cashbook button: filled primary, radius 999, `fonts.semibold`.
- [ ] **Step 4:** Purge legacy aliases + `fontWeight` per Task 9 Step 5 pattern.
- [ ] **Step 5:** Verify (`tsc`, jest, visual both modes) and commit — `git commit -m "feat: restyle Books screen to Wallet language"`

---

### Task 11: BudgetDashboardScreen restyle

**Files:**
- Modify: `src/screens/BudgetDashboardScreen.tsx`

- [ ] **Step 1:** Summary stats → StatChip pattern (Task 9 Step 3).
- [ ] **Step 2:** Progress bars: track `surfaceContainerHigh`, fill `primary`; overbudget fill `error` (this is the red reserved case). Bar height 6, radius 3.
- [ ] **Step 3:** Category budget rows → `ListCard` + `CategoryIcon` + `MoneyText`.
- [ ] **Step 4:** Purge legacy aliases + `fontWeight`; no emojis in copy.
- [ ] **Step 5:** Verify + commit — `git commit -m "feat: restyle Budget dashboard to Wallet language"`

---

### Task 12: SettingsScreen restyle

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1:** Group settings rows into `ListCard` sections with `labelMedium` uppercase section headers (`onSurfaceVariant`, letterSpacing 0.8).
- [ ] **Step 2:** Row icons: lucide in 30px tonal rounded-squares (same tones as CategoryIcon TONES, deterministic per row), chevrons `outline`.
- [ ] **Step 3:** Profile header: avatar circle `surfaceContainerHigh` with initial (`fonts.semibold`), name `titleMedium`.
- [ ] **Step 4:** Purge legacy aliases + `fontWeight`.
- [ ] **Step 5:** Verify + commit — `git commit -m "feat: restyle Settings to Wallet language"`

---

### Task 13: Transaction modals + shared dashboard styles

**Files:**
- Modify: `src/styles/dashboardStyles.ts`
- Modify: `src/components/TransactionDetailModal.tsx`
- Modify: `src/components/TransactionItem.tsx`
- Modify: `src/components/AppModal.tsx`

- [ ] **Step 1: `AppModal`** — sheet surface `surfaceContainerLow`, top radius 20, title `titleMedium`/`fonts.semibold`, handle `outlineVariant`.
- [ ] **Step 2: `dashboardStyles.ts`** — update the modal input/chip/button recipes used by TransactionEntryModal: inputs on `surfaceContainerHigh` radius 12 with `fonts.regular`; the big amount input `fonts.light` 34 tabular; category chips: inactive `surfaceContainerHigh`/`onSurfaceVariant`, active `primary`/`onPrimary`, radius 999; submit button: `primary` fill, radius 999, `fonts.semibold` 15.
- [ ] **Step 3: `TransactionItem`** — replace the letter-avatar with `CategoryIcon` (`category`, `type`, `autoLogged` props all exist on `Transaction`); remove the "Auto" text chip (badge replaces it); flatten the row (no bg/elevation — parents wrap in `ListCard`); amount via `MoneyText` with hardcoded `$` removed — accept a `symbol` prop (find call sites via `grep -rn "TransactionItem" src/` and pass each business's symbol; fallback `""`).
- [ ] **Step 4: `TransactionDetailModal`** — warm tokens, `CategoryIcon` header, amount via `MoneyText` 30/`fonts.light`; auto-logged metadata (source/confidence) in a `surfaceContainerHigh` info card.
- [ ] **Step 5: Verify** — `npx tsc -b`; `npx jest`; visual: entry + detail modals, rows with icons/badges, both modes.
- [ ] **Step 6: Commit** — `git commit -m "feat: restyle transaction modals and rows to Wallet language"`

---

### Task 14: Phase 1 verification sweep

- [ ] **Step 1:** `npx tsc -b` — zero errors.
- [ ] **Step 2:** `npx jest` — full suite green.
- [ ] **Step 3:** Visual pass in Expo, light AND dark, all four tabs + quick-add + transaction detail. Compare against `.superpowers/brainstorm/15168-1781214310/content/merged-direction-v4-icons.html`.
- [ ] **Step 4:** CLAUDE.md checklist: grep new/changed code for hardcoded secrets (none expected — pure UI), confirm no user-input validation was weakened (entry modal still validates amount), no perf regressions (no new N+1 list math in render loops — reuse existing memoized aggregations).
- [ ] **Step 5:** "Fresh eyes" re-read of every file changed in Phase 1; fix anything off.
- [ ] **Step 6:** Commit any fixes — `git commit -m "chore: phase 1 polish pass"`.

---

## Out of scope (Phase 2/3 plans)

BusinessDetailView, Reports, BudgetSetup, Debt, Categories, Recurring, all autoLogging screens, Lock/PinSetup/Splash, illustrations retirement. Charts pick up the new `theme.colors.chart` automatically in the meantime.
