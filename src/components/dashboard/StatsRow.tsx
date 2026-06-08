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
        { label: "Expense", value: totalExpense, color: theme.colors.expense },
        { label: "Net", value: netBalance, color: netBalance >= 0 ? theme.colors.income : theme.colors.expense },
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
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        label: {
            fontSize: 11,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
            color: theme.colors.onSurfaceVariant,
        },
        value: {
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: -0.3,
        },
    });
