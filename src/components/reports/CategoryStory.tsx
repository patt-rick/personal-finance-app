import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import CategoryIcon from "../CategoryIcon";
import ListCard from "../ListCard";
import { slice, useReveal } from "./motion";

export interface CategoryShare {
    name: string;
    amount: number;
    percentage: number;
    count: number;
    color: string;
}

interface CategoryStoryProps {
    categories: CategoryShare[];
    symbol: string;
    active: boolean;
    reduced: boolean | null;
}

const STAGGER = 0.08;

export default function CategoryStory({ categories, symbol, active, reduced }: CategoryStoryProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const progress = useReveal(active, reduced, { duration: 600 + categories.length * 90 });
    const span = 1 - STAGGER * Math.max(categories.length - 1, 0);

    if (categories.length === 0) return null;
    const top = categories[0];

    return (
        <View>
            <Text style={styles.lede}>
                {top.name} took {Math.round(top.percentage)}% of your spending.
            </Text>
            <ListCard style={styles.card}>
                {categories.map((cat, i) => {
                    const pct = Math.round(cat.percentage);
                    return (
                        <View
                            key={cat.name}
                            style={styles.row}
                            accessible
                            accessibilityLabel={`${cat.name}, ${symbol} ${Math.floor(cat.amount).toLocaleString()}, ${pct}% of spending, ${cat.count} transaction${cat.count !== 1 ? "s" : ""}`}
                        >
                            <CategoryIcon category={cat.name} type="expense" size={34} />
                            <View style={styles.body}>
                                <View style={styles.line}>
                                    <Text style={styles.name} numberOfLines={1}>
                                        {cat.name}
                                    </Text>
                                    <MoneyText amount={cat.amount} symbol={symbol} size={14} showDecimals={false} />
                                </View>
                                <View style={styles.line}>
                                    <Text style={styles.meta}>
                                        {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                                    </Text>
                                    <Text style={styles.meta}>{pct}%</Text>
                                </View>
                                <View style={styles.track}>
                                    <Animated.View
                                        style={[
                                            styles.fill,
                                            {
                                                width: `${Math.min(cat.percentage, 100)}%`,
                                                backgroundColor: cat.color,
                                                transform: [{ scaleX: slice(progress, i * STAGGER, i * STAGGER + span) }],
                                                transformOrigin: "left",
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ListCard>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        lede: {
            ...theme.typescale.bodyLarge,
            letterSpacing: 0,
            color: theme.colors.onSurfaceVariant,
            paddingHorizontal: 20,
            marginBottom: 12,
        },
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
        body: {
            flex: 1,
            gap: 3,
        },
        line: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
        },
        name: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
            flexShrink: 1,
        },
        meta: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        track: {
            height: 6,
            marginTop: 4,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHighest,
            overflow: "hidden",
        },
        fill: {
            height: 6,
        },
    });
