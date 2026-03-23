import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
    useColorScheme,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Rect } from "react-native-svg";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { getCurrencySymbol } from "../../utils/_helpers";
import { useTheme } from "../../theme/theme";
import { useThemeContext } from "../../theme/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_H_PADDING = 20;
const CARD_GAP = 12;
const PEEK_WIDTH = 24;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2 - PEEK_WIDTH;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

export interface CurrencyBalance {
    currency: string;
    income: number;
    expense: number;
    balance: number;
}

interface BalanceCardProps {
    currencies: CurrencyBalance[];
    weeklyGrowth: number;
    onPageChange?: (index: number) => void;
}

function ContactlessIcon({ color }: { color: string }) {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
                d="M8.5 14.5C9.16 13.84 9.16 12.76 8.5 12.1"
                stroke={color}
                strokeWidth={1.8}
                strokeLinecap="round"
            />
            <Path
                d="M11 17C12.66 15.34 12.66 12.66 11 11"
                stroke={color}
                strokeWidth={1.8}
                strokeLinecap="round"
            />
            <Path
                d="M13.5 19.5C16.16 16.84 16.16 12.16 13.5 9.5"
                stroke={color}
                strokeWidth={1.8}
                strokeLinecap="round"
            />
        </Svg>
    );
}

function CardCircles({ size }: { size: number }) {
    const r = size / 2;
    const overlap = size * 0.35;
    return (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: r,
                    backgroundColor: "rgba(193, 127, 89, 0.85)",
                }}
            />
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: r,
                    backgroundColor: "rgba(201, 168, 108, 0.8)",
                    marginLeft: -overlap,
                }}
            />
        </View>
    );
}

function HolographicOverlay() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
                colors={[
                    "transparent",
                    "rgba(255,255,255,0.03)",
                    "rgba(255,255,255,0.07)",
                    "rgba(255,255,255,0.03)",
                    "transparent",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={[
                    "transparent",
                    "rgba(45,106,79,0.06)",
                    "rgba(193,127,89,0.04)",
                    "transparent",
                ]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}
            />
        </View>
    );
}

export default function BalanceCard({ currencies, weeklyGrowth, onPageChange }: BalanceCardProps) {
    const theme = useTheme();
    const { themeMode } = useThemeContext();
    const systemColorScheme = useColorScheme();
    const isDark = themeMode === "system" ? systemColorScheme === "dark" : themeMode === "dark";

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

    const cardGradient: [string, string, string] = isDark
        ? [theme.colors.primary, "#1E4F3D", theme.colors.primary]
        : [theme.colors.primary, "#1A3C34", "#0E2420"];

    const renderPage = (item: CurrencyBalance, cardWidth: number) => {
        const symbol = getCurrencySymbol(item.currency);
        return (
            <View style={{ width: cardWidth }} key={item.currency}>
                <LinearGradient
                    colors={cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    <View style={styles.bigCircle} pointerEvents="none" />
                    <HolographicOverlay />

                    <View style={styles.balanceSection}>
                        <View style={styles.topRow}>
                            <Text style={styles.label}>
                                {multiPage ? `Balance · ${item.currency}` : "Balance"}
                            </Text>
                            <CardCircles size={28} />
                        </View>
                        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
                            {symbol}{" "}
                            {item.balance.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Text>
                    </View>

                    <View style={styles.bottomRow}>
                        <View style={styles.bottomLeft}>
                            <View style={styles.miniStat}>
                                <Text style={styles.miniLabel}>Income</Text>
                                <Text
                                    style={styles.miniValue}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {symbol}
                                    {item.income.toLocaleString(undefined, {
                                        maximumFractionDigits: 0,
                                    })}
                                </Text>
                            </View>
                            <View style={styles.miniDivider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniLabel}>Expense</Text>
                                <Text
                                    style={styles.miniValue}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {symbol}
                                    {item.expense.toLocaleString(undefined, {
                                        maximumFractionDigits: 0,
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        );
    };

    if (currencies.length <= 1) {
        const item = currencies[0] ?? {
            currency: "USD",
            income: 0,
            expense: 0,
            balance: 0,
        };
        const singleWidth = SCREEN_WIDTH - CARD_H_PADDING * 2;
        return <View style={styles.container}>{renderPage(item, singleWidth)}</View>;
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
                contentContainerStyle={{
                    paddingHorizontal: CARD_H_PADDING,
                    gap: CARD_GAP,
                }}
            >
                {currencies.map((c) => renderPage(c, CARD_WIDTH))}
            </ScrollView>
            <View style={styles.dotsRow}>
                {currencies.map((c, i) => (
                    <View
                        key={c.currency}
                        style={[
                            styles.dot,
                            {
                                backgroundColor:
                                    i === activeIndex
                                        ? theme.colors.primary
                                        : isDark
                                          ? "rgba(255,255,255,0.15)"
                                          : "#D1D5DB",
                                width: i === activeIndex ? 18 : 6,
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: CARD_H_PADDING,
        marginTop: 8,
    },
    containerMulti: {
        marginTop: 8,
    },
    card: {
        borderRadius: 20,
        padding: 24,
        paddingBottom: 20,
        overflow: "hidden",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
    },
    bigCircle: {
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        top: -60,
        right: -40,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    chipRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    contactless: {
        transform: [{ rotate: "90deg" }],
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 16,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    balanceSection: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: "500",
        color: "rgba(255,255,255,0.45)",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 6,
    },
    amount: {
        fontSize: 32,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    cardDotsRow: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 20,
    },
    dotGroup: {
        flexDirection: "row",
        gap: 4,
    },
    cardDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    bottomLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 10,
    },
    miniStat: {
        flex: 1,
    },
    miniLabel: {
        fontSize: 9,
        color: "rgba(255,255,255,0.4)",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    miniValue: {
        fontSize: 13,
        color: "#FFFFFF",
        fontWeight: "700",
    },
    miniDivider: {
        width: 1,
        height: 24,
        backgroundColor: "rgba(255,255,255,0.1)",
        marginHorizontal: 10,
    },
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        gap: 5,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
});
