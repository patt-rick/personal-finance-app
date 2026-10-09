import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/theme";
import { Transaction } from "../../types";
import MoneyText from "../MoneyText";
import CategoryIcon from "../CategoryIcon";
import ListCard from "../ListCard";
import { grossAmount } from "../../utils/transactionAmount";

interface BiggestExpensesProps {
    transactions: Transaction[];
    symbol: string;
}

export default function BiggestExpenses({ transactions, symbol }: BiggestExpensesProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <ListCard style={styles.card}>
            {transactions.map((tx) => {
                const category = tx.category || "Uncategorized";
                const date = new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                    <View key={tx.id} style={styles.row}>
                        <CategoryIcon category={tx.category} type="expense" autoLogged={tx.autoLogged} size={34} />
                        <View style={styles.info}>
                            <Text style={styles.desc} numberOfLines={1}>
                                {tx.description}
                            </Text>
                            <Text style={styles.meta} numberOfLines={1}>
                                {category}, {date}
                            </Text>
                        </View>
                        <MoneyText amount={grossAmount(tx)} symbol={symbol} sign="-" size={14} showDecimals={false} />
                    </View>
                );
            })}
        </ListCard>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        card: {
            marginHorizontal: 20,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        info: {
            flex: 1,
        },
        desc: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        meta: {
            ...theme.typescale.bodySmall,
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
    });
