import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/theme";
import { Transaction } from "../../types";

const ICON_COLORS = ["#7B8CDE", "#E2C878", "#9B8EC4", "#7BC4A0", "#DE7B7B", "#78BEC5"];

function getIconColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
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

    if (transactions.length === 0) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                    Recent Transactions
                </Text>
                <Text style={[styles.seeAll, { color: theme.colors.textSecondary }]}>
                    See All
                </Text>
            </View>

            {transactions.map((tx, i) => {
                const color = getIconColor(tx.category || tx.description);
                const initial = (tx.category || tx.description).charAt(0).toUpperCase();
                const isIncome = tx.type === "income";

                return (
                    <View
                        key={tx.id}
                        style={[
                            styles.txRow,
                            i < transactions.length - 1 && {
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.colors.borderLight,
                            },
                        ]}
                    >
                        <View style={[styles.txIcon, { backgroundColor: color + "20" }]}>
                            <Text style={[styles.txInitial, { color }]}>{initial}</Text>
                        </View>
                        <View style={styles.txInfo}>
                            <Text
                                style={[styles.txName, { color: theme.colors.text }]}
                                numberOfLines={1}
                            >
                                {tx.description}
                            </Text>
                            <Text style={[styles.txTime, { color: theme.colors.textSecondary }]}>
                                {formatTimeAgo(tx.date)}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.txAmount,
                                { color: isIncome ? "#22C55E" : theme.colors.text },
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

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
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
    },
    seeAll: {
        fontSize: 12,
        fontWeight: "500",
    },
    txRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    txIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
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
    },
    txTime: {
        fontSize: 11,
        marginTop: 2,
    },
    txAmount: {
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
});
