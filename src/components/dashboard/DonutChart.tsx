import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/theme";

interface DonutSegment {
    value: number;
    color: string;
    label: string;
}

interface DonutChartProps {
    data: DonutSegment[];
    total: number;
    currencySymbol: string;
    centerOverride?: React.ReactNode;
    hideLegend?: boolean;
}

const SIZE = 160;
const STROKE_WIDTH = 28;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEGREES = 4;

export default function DonutChart({ data, total, currencySymbol, centerOverride, hideLegend }: DonutChartProps) {
    const theme = useTheme();

    const gapPerSegment = data.length > 1 ? GAP_DEGREES / 360 : 0;
    const totalGap = gapPerSegment * data.length;
    const usableFraction = 1 - totalGap;

    let cumulativeOffset = 0;
    const segments = data.map((segment) => {
        const fraction = total > 0 ? (segment.value / total) * usableFraction : 0;
        const dashLength = fraction * CIRCUMFERENCE;
        const gapLength = CIRCUMFERENCE - dashLength;
        const rotation = cumulativeOffset * 360 - 90;
        cumulativeOffset += fraction + gapPerSegment;

        return {
            ...segment,
            dashLength,
            gapLength,
            rotation,
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.chartWrap}>
                <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        stroke={theme.colors.border}
                        strokeWidth={STROKE_WIDTH}
                        opacity={0.3}
                    />
                    {segments.map((seg, i) => (
                        <Circle
                            key={i}
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={RADIUS}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={STROKE_WIDTH}
                            strokeDasharray={`${seg.dashLength} ${seg.gapLength}`}
                            strokeLinecap="round"
                            rotation={seg.rotation}
                            origin={`${SIZE / 2}, ${SIZE / 2}`}
                        />
                    ))}
                </Svg>
                <View style={styles.centerLabel}>
                    {centerOverride ?? (
                        <>
                            <Text style={[styles.centerSmall, { color: theme.colors.textSecondary }]}>
                                Total
                            </Text>
                            <Text style={[styles.centerBig, { color: theme.colors.text }]}>
                                {currencySymbol}
                                {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Text>
                        </>
                    )}
                </View>
            </View>

            {!hideLegend && (
                <View style={styles.legendRow}>
                    {data.map((item, i) => {
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
                        return (
                            <View key={i} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                <Text
                                    style={[styles.legendLabel, { color: theme.colors.textSecondary }]}
                                    numberOfLines={1}
                                >
                                    {item.label}
                                </Text>
                                <Text style={[styles.legendPct, { color: theme.colors.text }]}>
                                    {pct}%
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        gap: 16,
    },
    chartWrap: {
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
    },
    centerLabel: {
        position: "absolute",
        alignItems: "center",
    },
    centerSmall: {
        fontSize: 11,
        fontWeight: "500",
    },
    centerBig: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: -0.3,
    },
    legendRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 12,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 11,
        fontWeight: "500",
    },
    legendPct: {
        fontSize: 12,
        fontWeight: "700",
    },
});
