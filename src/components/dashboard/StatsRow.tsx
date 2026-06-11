import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/theme";

interface StatsRowProps {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    currencySymbol?: string;
}

export default function StatsRow({ totalIncome, totalExpense, netBalance, currencySymbol = "$" }: StatsRowProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const stats = [
        { label: "Income", value: totalIncome, color: theme.colors.income },
        { label: "Expense", value: totalExpense, color: theme.colors.onSurface },
        { label: "Net", value: netBalance, color: netBalance >= 0 ? theme.colors.income : theme.colors.onSurface },
    ];

    return (
        <View style={styles.container}>
            {stats.map((stat) => (
                <View key={stat.label} style={styles.card}>
                    <Text style={styles.label}>{stat.label}</Text>
                    <Text
                        style={[styles.value, { color: stat.color }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {currencySymbol}{stat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 10,
            marginTop: 16,
        },
        card: {
            flex: 1,
            padding: 14,
            borderRadius: 14,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
        },
        label: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
            color: theme.colors.onSurfaceVariant,
        },
        value: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
            letterSpacing: -0.3,
        },
    });
