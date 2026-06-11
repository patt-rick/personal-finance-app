import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/theme";
import { Transaction } from "../../types";
import CategoryIcon from "../CategoryIcon";
import MoneyText from "../MoneyText";

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

    if (transactions.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Recent Transactions</Text>
                <Text style={styles.seeAll}>See All</Text>
            </View>

            {transactions.map((tx, i) => {
                const isIncome = tx.type === "income";

                return (
                    <View
                        key={tx.id}
                        style={[
                            styles.txRow,
                            i < transactions.length - 1 && styles.txRowBorder,
                        ]}
                    >
                        <CategoryIcon
                            category={tx.category || tx.description}
                            type={tx.type}
                            autoLogged={tx.autoLogged}
                            size={38}
                        />
                        <View style={styles.txInfo}>
                            <Text style={styles.txName} numberOfLines={1}>
                                {tx.description}
                            </Text>
                            <Text style={styles.txTime}>{formatTimeAgo(tx.date)}</Text>
                        </View>
                        <MoneyText
                            amount={tx.amount}
                            symbol="$"
                            sign={isIncome ? "+" : "-"}
                            size={15}
                            color={isIncome ? theme.colors.income : theme.colors.onSurface}
                        />
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
            borderRadius: 16,
            padding: 20,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
        },
        headerRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
        },
        title: {
            fontSize: 17,
            fontFamily: theme.fonts.semibold,
            letterSpacing: -0.2,
            color: theme.colors.onSurface,
        },
        seeAll: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
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
        txInfo: {
            flex: 1,
            marginLeft: 12,
        },
        txName: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        txTime: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
    });
