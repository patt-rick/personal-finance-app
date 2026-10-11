import React, { useMemo, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppTheme, useTheme } from "../../../theme/theme";
import { BudgetPeriod } from "../../../types";
import { exactMoney, niceCeil } from "../../../utils/chartScale";
import { slice } from "../../../components/reports/motion";
import { budgetColour } from "../colour";
import { HistoryPoint } from "../history";
import { formatPeriodShort, periodNoun } from "../periods";

interface BudgetHistoryChartProps {
    points: HistoryPoint[];
    period: BudgetPeriod;
    symbol: string;
    warnAt: number;
    selectedKey: string;
    onSelect: (key: string) => void;
    progress: Animated.Value;
}

const PLOT_H = 120;
const TOP_PAD = 18;
const BAR_W = 28;

export default function BudgetHistoryChart(props: BudgetHistoryChartProps) {
    const { points, period, symbol, warnAt, selectedKey, onSelect, progress } = props;
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [width, setWidth] = useState(0);
    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
    const grow = useMemo(() => slice(progress, 0.45, 0.95), [progress]);

    const top = niceCeil(Math.max(...points.map((p) => Math.max(p.spent, p.limit ?? 0)), 1));
    const y = (v: number) => TOP_PAD + PLOT_H * (1 - v / top);
    const col = width / Math.max(points.length, 1);
    const noun = periodNoun(period);

    const limitPath = useMemo(() => {
        if (width === 0) return "";
        let d = "";
        points.forEach((p, i) => {
            if (p.limit === null) return;
            const prev = points[i - 1];
            const x0 = i * col;
            const yy = y(p.limit);
            d += prev && prev.limit !== null ? ` L${x0} ${yy}` : ` M${x0} ${yy}`;
            d += ` L${x0 + col} ${yy}`;
        });
        return d.trim();
    }, [points, width, col, top]);

    const closed = points.filter((p) => !p.current && p.limit !== null);
    const under = closed.filter((p) => p.spent <= (p.limit ?? 0)).length;
    const latestLimit = [...points].reverse().find((p) => p.limit !== null)?.limit ?? null;

    return (
        <View>
            <View style={styles.header}>
                <Text style={styles.title}>
                    Last {points.length} {noun}s
                </Text>
                <Text style={styles.hint}>Tap a bar to open it</Text>
            </View>
            <View style={{ height: TOP_PAD + PLOT_H }} onLayout={onLayout}>
                {width > 0 && (
                    <>
                        {points.map((p, i) => {
                            const h = PLOT_H * (p.spent / top);
                            const color =
                                p.limit === null || p.limit <= 0
                                    ? theme.colors.outline
                                    : budgetColour((p.spent / p.limit) * 100, warnAt, theme.colors);
                            return (
                                <Animated.View
                                    key={p.range.key}
                                    style={[
                                        styles.bar,
                                        {
                                            left: i * col + (col - BAR_W) / 2,
                                            height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(h, 2)] }),
                                            backgroundColor: p.current ? theme.colors.background : color,
                                            borderColor: color,
                                            borderWidth: p.current ? 1.5 : 0,
                                            borderStyle: p.current ? "dashed" : "solid",
                                        },
                                    ]}
                                />
                            );
                        })}
                        <Svg width={width} height={TOP_PAD + PLOT_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                            {limitPath !== "" && (
                                <Path d={limitPath} stroke={theme.colors.outline} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
                            )}
                        </Svg>
                        <View style={[StyleSheet.absoluteFill, styles.hitRow]}>
                            {points.map((p) => (
                                <Pressable
                                    key={p.range.key}
                                    style={styles.hit}
                                    onPress={() => onSelect(p.range.key)}
                                    accessible={false}
                                />
                            ))}
                        </View>
                    </>
                )}
            </View>
            <View style={styles.labels}>
                {points.map((p) => {
                    const on = p.range.key === selectedKey;
                    return (
                        <Pressable
                            key={p.range.key}
                            onPress={() => onSelect(p.range.key)}
                            style={styles.labelCell}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={`${formatPeriodShort(period, p.range)}: ${exactMoney(p.spent, symbol)}${
                                p.limit !== null ? ` of ${exactMoney(p.limit, symbol)}` : ""
                            }`}
                        >
                            <Text style={[styles.label, on && styles.labelOn]}>{formatPeriodShort(period, p.range)}</Text>
                            <View style={[styles.underline, on && styles.underlineOn]} />
                        </Pressable>
                    );
                })}
            </View>
            {latestLimit !== null && (
                <Text style={styles.summary}>
                    The dashed line is the limit that applied, now {exactMoney(latestLimit, symbol)}.
                    {closed.length > 0
                        ? ` Under budget ${under} of the last ${closed.length} ${noun}${closed.length === 1 ? "" : "s"}.`
                        : ""}
                </Text>
            )}
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
        },
        title: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        hint: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        bar: {
            position: "absolute",
            bottom: 0,
            width: BAR_W,
            borderTopLeftRadius: 7,
            borderTopRightRadius: 7,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
        },
        labels: {
            flexDirection: "row",
            marginTop: 8,
        },
        labelCell: {
            flex: 1,
            alignItems: "center",
            paddingVertical: 4,
        },
        label: {
            ...theme.typescale.labelMedium,
            color: theme.colors.onSurfaceVariant,
        },
        labelOn: {
            color: theme.colors.onSurface,
            fontFamily: theme.fonts.bold,
        },
        underline: {
            marginTop: 4,
            width: 16,
            height: 2,
            borderRadius: 1,
            backgroundColor: "transparent",
        },
        underlineOn: {
            backgroundColor: theme.colors.onSurface,
        },
        hitRow: {
            flexDirection: "row",
        },
        hit: {
            flex: 1,
        },
        summary: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            marginTop: 8,
        },
    });
