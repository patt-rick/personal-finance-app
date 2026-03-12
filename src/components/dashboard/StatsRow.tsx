import React from "react";
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

    const stats = [
        { label: "Income", value: totalIncome },
        { label: "Expense", value: totalExpense },
        { label: "Net", value: netBalance },
    ];

    return (
        <View style={styles.container}>
            {stats.map((stat) => (
                <View
                    key={stat.label}
                    style={[styles.card, { backgroundColor: theme.colors.card }]}
                >
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                        {stat.label}
                    </Text>
                    <Text
                        style={[styles.value, { color: theme.colors.text }]}
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

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 10,
        marginTop: 16,
    },
    card: {
        flex: 1,
        padding: 14,
        borderRadius: 16,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
    },
    label: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    value: {
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: -0.3,
    },
});
