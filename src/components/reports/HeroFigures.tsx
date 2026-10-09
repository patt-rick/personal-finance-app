import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import { PeriodSummary } from "../../utils/reportStory";
import { riseStyle } from "./motion";

interface HeroFiguresProps {
    summary: PeriodSummary;
    symbol: string;
    progress: Animated.Value;
    format: (n: number) => string;
}

export default function HeroFigures({ summary, symbol, progress, format }: HeroFiguresProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { income, expense, net } = summary;
    const motion = useMemo(() => riseStyle(progress, 0.7, 0.92, 6), [progress]);
    if (income <= 0 && expense <= 0) return null;

    const label =
        net >= 0
            ? `Came in ${format(income)}, went out ${format(expense)}, kept ${format(net)}.`
            : `Came in ${format(income)}, went out ${format(expense)}, overspent by ${format(-net)}.`;

    return (
        <Animated.View style={[styles.row, motion]} accessible accessibilityLabel={label}>
            <Figure label="Came in" amount={income} symbol={symbol} swatch={theme.colors.income} styles={styles} />
            <Figure label="Went out" amount={expense} symbol={symbol} swatch={theme.colors.chartExpense} styles={styles} />
            <Figure
                label={net >= 0 ? "Kept" : "Overspent"}
                amount={Math.abs(net)}
                symbol={symbol}
                swatch={net >= 0 ? theme.colors.income : theme.colors.expense}
                hollow={net >= 0}
                styles={styles}
            />
        </Animated.View>
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
        row: {
            flexDirection: "row",
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
