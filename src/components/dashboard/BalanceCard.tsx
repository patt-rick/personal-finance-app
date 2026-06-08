import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { getCurrencySymbol } from "../../utils/_helpers";
import { useTheme } from "../../theme/theme";

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

function Sheen() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
                colors={["rgba(255,255,255,0.14)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}

export default function BalanceCard({ currencies, weeklyGrowth, onPageChange }: BalanceCardProps) {
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

    // Fixed brand gradient in both themes so the white ink stays legible.
    const cardGradient: [string, string, string] = [
        theme.colors.gradientMid,
        theme.colors.gradientStart,
        theme.colors.gradientEnd,
    ];

    const positiveGrowth = weeklyGrowth >= 0;

    const renderPage = (item: CurrencyBalance, cardWidth: number) => {
        const symbol = getCurrencySymbol(item.currency);
        return (
            <View style={{ width: cardWidth }} key={item.currency}>
                <LinearGradient
                    colors={cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, theme.elevation.level3, { shadowColor: theme.colors.shadow }]}
                >
                    <View style={styles.bigCircle} pointerEvents="none" />
                    <View style={styles.smallCircle} pointerEvents="none" />
                    <Sheen />

                    <View style={styles.topRow}>
                        <Text style={styles.label}>
                            {multiPage ? `Balance · ${item.currency}` : "Total balance"}
                        </Text>
                        <View style={styles.growthPill}>
                            {positiveGrowth ? (
                                <TrendingUp size={13} color="#FFFFFF" strokeWidth={2.5} />
                            ) : (
                                <TrendingDown size={13} color="#FFFFFF" strokeWidth={2.5} />
                            )}
                            <Text style={styles.growthText}>
                                {positiveGrowth ? "+" : ""}
                                {weeklyGrowth.toFixed(1)}%
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
                        {symbol}{" "}
                        {item.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.miniStat}>
                            <View style={styles.miniDot}>
                                <TrendingUp size={12} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                            <View style={styles.miniText}>
                                <Text style={styles.miniLabel}>Income</Text>
                                <Text style={styles.miniValue} numberOfLines={1} adjustsFontSizeToFit>
                                    {symbol}
                                    {item.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.miniDivider} />
                        <View style={styles.miniStat}>
                            <View style={styles.miniDot}>
                                <TrendingDown size={12} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                            <View style={styles.miniText}>
                                <Text style={styles.miniLabel}>Expense</Text>
                                <Text style={styles.miniValue} numberOfLines={1} adjustsFontSizeToFit>
                                    {symbol}
                                    {item.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        );
    };

    if (currencies.length <= 1) {
        const item = currencies[0] ?? { currency: "USD", income: 0, expense: 0, balance: 0 };
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
                contentContainerStyle={{ paddingHorizontal: CARD_H_PADDING, gap: CARD_GAP }}
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
                                        : theme.colors.outlineVariant,
                                width: i === activeIndex ? 20 : 6,
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
        borderRadius: 28,
        padding: 24,
        overflow: "hidden",
    },
    bigCircle: {
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "rgba(255, 255, 255, 0.07)",
        top: -70,
        right: -50,
    },
    smallCircle: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        bottom: -50,
        right: 40,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "rgba(255,255,255,0.85)",
        letterSpacing: 0.4,
    },
    growthPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    growthText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },
    amount: {
        fontSize: 38,
        fontWeight: "800",
        letterSpacing: -0.8,
        color: "#FFFFFF",
        marginBottom: 22,
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: 14,
    },
    miniStat: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    miniDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
    },
    miniText: {
        flex: 1,
    },
    miniLabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    miniValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    miniDivider: {
        width: 1,
        height: 32,
        backgroundColor: "rgba(255,255,255,0.16)",
        marginHorizontal: 14,
    },
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 12,
        gap: 5,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
});
