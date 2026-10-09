import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import { PeriodSummary } from "../../utils/reportStory";
import { riseStyle, slice } from "./motion";

interface FlowBarProps {
    summary: PeriodSummary;
    symbol: string;
    progress: Animated.Value;
    format: (n: number) => string;
}

/**
 * Money arriving (green), then spending eating into it (the chart expense colour); whatever green is left is what was kept.
 * Spending past income spills over in the expense colour.
 */
export default function FlowBar({ summary, symbol, progress, format }: FlowBarProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { income, expense, net } = summary;
    const legendMotion = useMemo(() => riseStyle(progress, 0.8, 1, 6), [progress]);
    const scale = Math.max(income, expense);
    if (scale <= 0) return null;

    const pct = (n: number) => `${(n / scale) * 100}%` as const;
    const covered = Math.min(expense, income);
    const overspend = Math.max(expense - income, 0);

    const grow = (from: number, to: number) => ({
        transform: [{ scaleX: slice(progress, from, to) }],
        transformOrigin: "left" as const,
    });

    const label =
        net >= 0
            ? `Came in ${format(income)}, went out ${format(expense)}, kept ${format(net)}.`
            : `Came in ${format(income)}, went out ${format(expense)}, overspent by ${format(-net)}.`;

    return (
        <View accessible accessibilityLabel={label}>
            <View style={styles.track}>
                {income > 0 && (
                    <Animated.View
                        style={[styles.fill, { left: 0, width: pct(income), backgroundColor: theme.colors.income }, grow(0.3, 0.55)]}
                    />
                )}
                {covered > 0 && (
                    <Animated.View
                        style={[styles.fill, { left: 0, width: pct(covered), backgroundColor: theme.colors.chart[3] }, grow(0.55, 0.82)]}
                    />
                )}
                {overspend > 0 && (
                    <Animated.View
                        style={[
                            styles.fill,
                            { left: pct(income), width: pct(overspend), backgroundColor: theme.colors.expense },
                            grow(income > 0 ? 0.78 : 0.55, 0.95),
                        ]}
                    />
                )}
            </View>

            <Animated.View style={[styles.legend, legendMotion]}>
                <Figure label="Came in" amount={income} symbol={symbol} swatch={theme.colors.income} styles={styles} />
                <Figure label="Went out" amount={expense} symbol={symbol} swatch={theme.colors.chart[3]} styles={styles} />
                <Figure
                    label={net >= 0 ? "Kept" : "Overspent"}
                    amount={Math.abs(net)}
                    symbol={symbol}
                    swatch={net >= 0 ? theme.colors.income : theme.colors.expense}
                    hollow={net >= 0}
                    styles={styles}
                />
            </Animated.View>
        </View>
    );
}

function Figure({
    label,
    amount,
    symbol,
    swatch,
    hollow,
    styles,
}: {
    label: string;
    amount: number;
    symbol: string;
    swatch: string;
    hollow?: boolean;
    styles: ReturnType<typeof createStyles>;
}) {
    return (
        <View style={styles.figure}>
            <View style={styles.figureLabelRow}>
                <View
                    style={[
                        styles.swatch,
                        hollow ? { borderColor: swatch, borderWidth: 2 } : { backgroundColor: swatch },
                    ]}
                />
                <Text style={styles.figureLabel}>{label}</Text>
            </View>
            <MoneyText amount={amount} symbol={symbol} size={15} showDecimals={false} numberOfLines={1} adjustsFontSizeToFit />
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        track: {
            height: 14,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHighest,
            overflow: "hidden",
        },
        fill: {
            position: "absolute",
            top: 0,
            bottom: 0,
        },
        legend: {
            flexDirection: "row",
            marginTop: 14,
            gap: 12,
        },
        figure: {
            flex: 1,
            gap: 2,
        },
        figureLabelRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        swatch: {
            width: 8,
            height: 8,
            borderRadius: 2,
        },
        figureLabel: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
    });
