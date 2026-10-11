import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AppTheme, useTheme } from "../../../theme/theme";
import { formatPercent } from "../../../utils/categoryTiles";
import { slice } from "../../../components/reports/motion";
import { BudgetRow } from "../dashboardModel";
import HatchTrack from "./HatchTrack";

interface AllocationBarProps {
    rows: BudgetRow[];
    limit: number;
    colorFor: (row: BudgetRow) => string;
    progress: Animated.Value;
}

/** Spend as a share of the limit; when spend runs past the limit the segments are scaled to fit. */
export default function AllocationBar({ rows, limit, colorFor, progress }: AllocationBarProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const spent = rows.filter((r) => r.spent > 0);
    const total = spent.reduce((s, r) => s + r.spent, 0);
    const scale = Math.max(limit, total);
    const grow = useMemo(
        () => slice(progress, 0.25, 0.75).interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        [progress],
    );

    return (
        <View style={styles.wrap}>
            <View style={styles.track}>
                <HatchTrack id="allocationHatch" />
                <Animated.View style={[styles.fill, { width: grow }]}>
                    {spent.map((row) => (
                        <View key={row.key} style={{ flex: row.spent / scale, backgroundColor: colorFor(row) }} />
                    ))}
                    {total < scale && <View style={{ flex: (scale - total) / scale }} />}
                </Animated.View>
                {total > limit && <View style={[styles.limitMark, { left: `${(limit / total) * 100}%` }]} />}
            </View>
            {spent.length > 0 && (
                <View style={styles.legend}>
                    {spent.map((row) => (
                        <View key={row.key} style={styles.legendItem}>
                            <View style={[styles.swatch, { backgroundColor: colorFor(row) }]} />
                            <Text style={styles.legendText}>
                                {row.label} {formatPercent((row.spent / limit) * 100)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        wrap: {
            marginTop: 14,
        },
        track: {
            height: 16,
            borderRadius: 7,
            overflow: "hidden",
        },
        fill: {
            flexDirection: "row",
            height: "100%",
        },
        limitMark: {
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 3,
            marginLeft: -1.5,
            backgroundColor: theme.colors.background,
        },
        legend: {
            flexDirection: "row",
            flexWrap: "wrap",
            columnGap: 14,
            rowGap: 6,
            marginTop: 10,
        },
        legendItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        swatch: {
            width: 9,
            height: 9,
            borderRadius: 3,
        },
        legendText: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            fontVariant: ["tabular-nums"],
        },
    });
