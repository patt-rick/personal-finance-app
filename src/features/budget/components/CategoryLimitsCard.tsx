import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AppTheme, useTheme } from "../../../theme/theme";
import { exactMoney } from "../../../utils/chartScale";
import { formatPercent } from "../../../utils/categoryTiles";
import { riseStyle, slice } from "../../../components/reports/motion";
import { budgetColour } from "../colour";
import { BudgetRow } from "../dashboardModel";
import HatchTrack from "./HatchTrack";
import PaceChip from "./PaceChip";

interface CategoryLimitsCardProps {
    rows: BudgetRow[];
    symbol: string;
    warnAt: number;
    pacePct: number | null;
    colorFor: (row: BudgetRow) => string;
    progress: Animated.Value;
}

export default function CategoryLimitsCard({ rows, symbol, warnAt, pacePct, colorFor, progress }: CategoryLimitsCardProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const grow = useMemo(() => slice(progress, 0.35, 0.85), [progress]);
    if (rows.length === 0) return null;
    const money = (v: number) => exactMoney(v, symbol);

    return (
        <View style={styles.card}>
            <Text style={styles.heading}>By category</Text>
            {rows.map((row, i) => {
                const rise = riseStyle(progress, 0.3 + i * 0.04, 0.6 + i * 0.04, 8);
                const divider = i > 0 && styles.divider;
                if (row.limit === null) {
                    return (
                        <Animated.View key={row.key} style={[styles.row, divider, rise]}>
                            <View style={styles.nameRow}>
                                <View style={[styles.swatch, { backgroundColor: colorFor(row) }]} />
                                <Text style={styles.name}>{row.label}</Text>
                            </View>
                            <Text style={styles.meta}>{money(row.spent)}, counted in your total</Text>
                        </Animated.View>
                    );
                }
                const share = (row.spent / row.limit) * 100;
                const color = budgetColour(share, warnAt, theme.colors);
                const over = row.spent > row.limit;
                return (
                    <Animated.View key={row.key} style={[styles.row, divider, rise]}>
                        <View style={styles.nameRow}>
                            <View style={[styles.swatch, { backgroundColor: colorFor(row) }]} />
                            <Text style={styles.name} numberOfLines={1}>
                                {row.label}
                            </Text>
                            {over ? (
                                <PaceChip compact chip={{ tone: "error", icon: "over", text: `Over by ${money(row.spent - row.limit)}` }} />
                            ) : (
                                <Text style={styles.left}>{money(row.limit - row.spent)} left</Text>
                            )}
                        </View>
                        <View style={styles.bar}>
                            <View style={styles.track}>
                                <HatchTrack id={`catHatch-${row.key}`} />
                                <Animated.View
                                    style={[
                                        styles.fill,
                                        {
                                            backgroundColor: color,
                                            width: grow.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ["0%", `${Math.min(share, 100)}%`],
                                            }),
                                        },
                                    ]}
                                />
                            </View>
                            {pacePct !== null && <View style={[styles.tick, { left: `${Math.min(pacePct, 100)}%` }]} />}
                        </View>
                        <View style={styles.footer}>
                            <Text style={styles.meta}>
                                {money(row.spent)} of {money(row.limit)}
                            </Text>
                            <Text style={[styles.pct, { color }]}>{formatPercent(share)}</Text>
                        </View>
                    </Animated.View>
                );
            })}
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: theme.shape.largeIncreased,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 4,
        },
        heading: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
            marginBottom: 4,
        },
        row: {
            paddingVertical: 12,
        },
        divider: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        nameRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        swatch: {
            width: 10,
            height: 10,
            borderRadius: 3,
        },
        name: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
            flex: 1,
        },
        left: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            fontVariant: ["tabular-nums"],
        },
        bar: {
            marginTop: 10,
            marginBottom: 6,
            justifyContent: "center",
        },
        track: {
            height: 10,
            borderRadius: theme.shape.full,
            overflow: "hidden",
        },
        fill: {
            height: "100%",
            borderRadius: theme.shape.full,
        },
        tick: {
            position: "absolute",
            top: -3,
            width: 2.5,
            height: 16,
            marginLeft: -1.25,
            borderRadius: 2,
            backgroundColor: theme.colors.onSurface,
        },
        footer: {
            flexDirection: "row",
            justifyContent: "space-between",
        },
        meta: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            fontVariant: ["tabular-nums"],
            marginTop: 2,
        },
        pct: {
            ...theme.typescale.labelMedium,
            fontVariant: ["tabular-nums"],
        },
    });
