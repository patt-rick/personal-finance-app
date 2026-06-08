import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/theme";
import { Transaction } from "../../types";

function getIconColors(theme: ReturnType<typeof useTheme>) {
    return [
        theme.colors.chartBlue,
        theme.colors.secondary,
        theme.colors.chartPurple,
        theme.colors.chartGreen,
        theme.colors.error,
        theme.colors.gold,
    ];
}

function getIconColor(name: string, iconColors: string[]): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return iconColors[Math.abs(hash) % iconColors.length];
}

function formatTimeAgo(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

interface RecentTransactionsProps {
    transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const iconColors = getIconColors(theme);

    if (transactions.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Recent Transactions</Text>
                <Text style={styles.seeAll}>See All</Text>
            </View>

            {transactions.map((tx, i) => {
                const color = getIconColor(tx.category || tx.description, iconColors);
                const initial = (tx.category || tx.description).charAt(0).toUpperCase();
                const isIncome = tx.type === "income";

                return (
                    <View
                        key={tx.id}
                        style={[
                            styles.txRow,
                            i < transactions.length - 1 && styles.txRowBorder,
                        ]}
                    >
                        <View style={[styles.txIcon, { backgroundColor: color + "26" }]}>
                            <Text style={[styles.txInitial, { color }]}>{initial}</Text>
                        </View>
                        <View style={styles.txInfo}>
                            <Text style={styles.txName} numberOfLines={1}>
                                {tx.description}
                            </Text>
                            <Text style={styles.txTime}>{formatTimeAgo(tx.date)}</Text>
                        </View>
                        <Text
                            style={[
                                styles.txAmount,
                                { color: isIncome ? theme.colors.income : theme.colors.expense },
                            ]}
                        >
                            {isIncome ? "+" : "-"}$
                            {tx.amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        container: {
            marginHorizontal: 20,
            marginTop: 20,
            borderRadius: theme.shape.large,
            padding: 20,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        headerRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
        },
        title: {
            fontSize: 17,
            fontWeight: "700",
            letterSpacing: -0.2,
            color: theme.colors.onSurface,
        },
        seeAll: {
            fontSize: 12,
            fontWeight: "600",
            color: theme.colors.primary,
        },
        txRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
        },
        txRowBorder: {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
        },
        txIcon: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
        },
        txInitial: {
            fontSize: 16,
            fontWeight: "700",
        },
        txInfo: {
            flex: 1,
            marginLeft: 12,
        },
        txName: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.onSurface,
        },
        txTime: {
            fontSize: 11,
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
        txAmount: {
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: -0.2,
        },
    });
