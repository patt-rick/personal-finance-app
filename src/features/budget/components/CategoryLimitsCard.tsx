import React, { useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
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
    total: number;
    symbol: string;
    warnAt: number;
    pacePct: number | null;
    colorFor: (row: BudgetRow) => string;
    progress: Animated.Value;
}

const COLLAPSED_COUNT = 4;

export default function CategoryLimitsCard(props: CategoryLimitsCardProps) {
    const { rows, total, symbol, warnAt, pacePct, colorFor, progress } = props;
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const grow = useMemo(() => slice(progress, 0.35, 0.85), [progress]);
    const [expanded, setExpanded] = useState(false);
    if (rows.length === 0) return null;
    const money = (v: number) => exactMoney(v, symbol);
    const limited = rows.filter((r) => r.limit !== null);
    const unlimited = rows.filter((r) => r.limit === null);
    const shown = expanded ? unlimited : unlimited.slice(0, COLLAPSED_COUNT);
    const hidden = unlimited.length - shown.length;

    return (
        <View style={styles.card}>
            <Text style={styles.heading}>By category</Text>
            {limited.map((row, i) => {
                const limit = row.limit as number;
                const rise = riseStyle(progress, 0.3 + i * 0.04, 0.6 + i * 0.04, 8);
                const share = (row.spent / limit) * 100;
                const color = budgetColour(share, warnAt, theme.colors);
                const over = row.spent > limit;
                return (
                    <Animated.View key={row.key} style={[styles.row, i > 0 && styles.divider, rise]}>
                        <View style={styles.nameRow}>
                            <View style={[styles.swatch, { backgroundColor: colorFor(row) }]} />
                            <Text style={styles.name} numberOfLines={1}>
                                {row.label}
                            </Text>
                            {over ? (
                                <PaceChip compact chip={{ tone: "error", icon: "over", text: `Over by ${money(row.spent - limit)}` }} />
                            ) : (
                                <Text style={styles.left}>{money(limit - row.spent)} left</Text>
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
                                {money(row.spent)} of {money(limit)}
                            </Text>
                            <Text style={[styles.pct, { color }]}>{formatPercent(share)}</Text>
                        </View>
                    </Animated.View>
                );
            })}

            {unlimited.length > 0 && (
                <View style={[styles.unlimited, limited.length > 0 && styles.divider]}>
                    {limited.length > 0 && <Text style={styles.subheading}>No limit set</Text>}
                    {shown.map((row) => (
                        <View key={row.key} style={styles.compactRow}>
                            <View style={[styles.swatch, { backgroundColor: colorFor(row) }]} />
                            <Text style={styles.name} numberOfLines={1}>
                                {row.label}
                            </Text>
                            <Text style={styles.compactShare}>{formatPercent(total > 0 ? (row.spent / total) * 100 : 0)}</Text>
                            <Text style={styles.compactAmount}>{money(row.spent)}</Text>
                        </View>
                    ))}
                    {unlimited.length > COLLAPSED_COUNT && (
                        <Pressable
                            onPress={() => setExpanded((v) => !v)}
                            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                            accessibilityRole="button"
                            accessibilityState={{ expanded }}
                        >
                            <Text style={styles.moreText}>{expanded ? "Show less" : `Show ${hidden} more`}</Text>
                            {expanded ? (
                                <ChevronUp size={16} color={theme.colors.primary} />
                            ) : (
                                <ChevronDown size={16} color={theme.colors.primary} />
                            )}
                        </Pressable>
                    )}
                </View>
            )}
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
        unlimited: {
            paddingTop: 12,
            paddingBottom: 8,
        },
        subheading: {
            ...theme.typescale.labelMedium,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 4,
        },
        compactRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 8,
        },
        compactShare: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            fontVariant: ["tabular-nums"],
        },
        compactAmount: {
            ...theme.typescale.labelLarge,
            color: theme.colors.onSurface,
            fontVariant: ["tabular-nums"],
            minWidth: 92,
            textAlign: "right",
        },
        more: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 4,
            paddingVertical: 8,
        },
        pressed: {
            opacity: 0.7,
        },
        moreText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.primary,
        },
        pct: {
            ...theme.typescale.labelMedium,
            fontVariant: ["tabular-nums"],
        },
    });
