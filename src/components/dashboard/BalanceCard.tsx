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

export default function BalanceCard({
    currencies,
    weeklyGrowth,
    onPageChange,
}: BalanceCardProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const isPositive = weeklyGrowth >= 0;
    const multiPage = currencies.length > 1;

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const index = Math.round(
                e.nativeEvent.contentOffset.x / SNAP_INTERVAL,
            );
            if (index !== activeIndex && index >= 0 && index < currencies.length) {
                setActiveIndex(index);
                onPageChange?.(index);
            }
        },
        [activeIndex, currencies.length, onPageChange],
    );

    const renderPage = (item: CurrencyBalance, cardWidth: number) => {
        const symbol = getCurrencySymbol(item.currency);
        return (
            <View style={{ width: cardWidth }} key={item.currency}>
                <LinearGradient
                    colors={["#3A5CFF", "#2F3FD4", "#1E2A8A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    <View style={styles.topRow}>
                        <Text style={styles.label}>
                            {multiPage
                                ? `Balance · ${item.currency}`
                                : "Balance"}
                        </Text>
                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: isPositive
                                        ? "rgba(74,222,128,0.2)"
                                        : "rgba(248,113,113,0.2)",
                                },
                            ]}
                        >
                            {isPositive ? (
                                <TrendingUp size={12} color="#4ADE80" />
                            ) : (
                                <TrendingDown size={12} color="#F87171" />
                            )}
                            <Text
                                style={[
                                    styles.badgeText,
                                    {
                                        color: isPositive
                                            ? "#4ADE80"
                                            : "#F87171",
                                    },
                                ]}
                            >
                                {isPositive ? "+" : ""}
                                {weeklyGrowth.toFixed(1)}%
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={styles.amount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {symbol}{" "}
                        {item.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>

                    <View style={styles.bottomRow}>
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
        return (
            <View style={styles.container}>
                {renderPage(item, singleWidth)}
            </View>
        );
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
                                        ? "#2F3FD4"
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
        borderRadius: 24,
        padding: 24,
        elevation: 3,
        shadowColor: "#1E2A8A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "rgba(255,255,255,0.6)",
        letterSpacing: 0.5,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "700",
    },
    amount: {
        fontSize: 34,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 14,
        padding: 12,
        marginTop: 20,
    },
    miniStat: {
        flex: 1,
    },
    miniLabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.5)",
        fontWeight: "500",
        marginBottom: 2,
    },
    miniValue: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "700",
    },
    miniDivider: {
        width: 1,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.15)",
        marginHorizontal: 12,
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
