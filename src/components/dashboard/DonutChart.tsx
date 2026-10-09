import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, Path } from "react-native-svg";
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
    midTotal?: number;
}

const SIZE = 176;
const GLOW_PAD = 18;
const CANVAS = SIZE + GLOW_PAD * 2;
const CENTER = CANVAS / 2;
const OUTER_R = SIZE / 2;
const THICKNESS = 26;
const INNER_R = OUTER_R - THICKNESS;
const GAP = 2.5;
// Each segment is drawn smaller by its corner radius and stroked twice that wide in its own colour with round joins, which
// rounds its corners. Thin slices get smaller corners so they still fit.
const MAX_CORNER = 3;

const point = (r: number, angle: number) => `${CENTER + r * Math.sin(angle)},${CENTER - r * Math.cos(angle)}`;

/** A ring slice from `from` to `to` (radians, clockwise from 12 o'clock) with parallel-edged gaps. */
function slicePath(from: number, to: number): { d: string; corner: number } | null {
    const corner = Math.max(0, Math.min(MAX_CORNER, ((to - from) * INNER_R - GAP) / 2 - 0.5));
    const outer = OUTER_R - corner;
    const inner = INNER_R + corner;
    const inset = GAP / 2 + corner;
    const o0 = from + inset / outer;
    const o1 = to - inset / outer;
    const i0 = from + inset / inner;
    const i1 = to - inset / inner;
    if (i1 <= i0) return null;
    const large = (span: number) => (span > Math.PI ? 1 : 0);
    const d = [
        `M${point(outer, o0)}`,
        `A${outer},${outer} 0 ${large(o1 - o0)} 1 ${point(outer, o1)}`,
        `L${point(inner, i1)}`,
        `A${inner},${inner} 0 ${large(i1 - i0)} 0 ${point(inner, i0)}`,
        "Z",
    ].join(" ");
    return { d, corner };
}

export default function DonutChart({
    data,
    total,
    currencySymbol,
    centerOverride,
    hideLegend,
    midTotal,
}: DonutChartProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const visible = useMemo(() => data.filter((d) => d.value > 0), [data]);
    const segments = useMemo(() => {
        if (total <= 0 || visible.length < 2) return [];
        let angle = 0;
        return visible.map((seg) => {
            const span = (seg.value / total) * Math.PI * 2;
            const slice = slicePath(angle, angle + span);
            angle += span;
            return { color: seg.color, slice };
        });
    }, [visible, total]);
    const fullRing = visible.length === 1 ? visible[0].color : null;

    const ring = (
        <>
            {fullRing && (
                <Circle cx={CENTER} cy={CENTER} r={OUTER_R - THICKNESS / 2} fill="none" stroke={fullRing} strokeWidth={THICKNESS} />
            )}
            {segments.map(
                (seg, i) =>
                    seg.slice && (
                        <Path
                            key={i}
                            d={seg.slice.d}
                            fill={seg.color}
                            stroke={seg.color}
                            strokeWidth={seg.slice.corner * 2}
                            strokeLinejoin="round"
                        />
                    ),
            )}
        </>
    );

    return (
        <View style={styles.container}>
            <View style={styles.chartWrap}>
                <Svg width={CANVAS} height={CANVAS}>
                    <Defs>
                        <Filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <FeGaussianBlur stdDeviation={8} />
                        </Filter>
                    </Defs>
                    <G filter="url(#donutGlow)" opacity={0.6}>
                        {ring}
                    </G>
                    {ring}
                </Svg>
                <View style={styles.centerLabel}>
                    {centerOverride ?? (
                        <>
                            <Text style={[styles.centerBig, { color: theme.colors.onSurface }]} numberOfLines={1} adjustsFontSizeToFit>
                                {currencySymbol}
                                {(midTotal || total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Text>
                            <Text style={[styles.centerSmall, { color: theme.colors.onSurfaceVariant }]}>
                                {midTotal ? "balance" : "spent in total"}
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
                                    style={[
                                        styles.legendLabel,
                                        { color: theme.colors.onSurfaceVariant },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {item.label}
                                </Text>
                                <Text style={[styles.legendPct, { color: theme.colors.onSurface }]}>
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

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        container: {
            alignItems: "center",
            gap: 16,
        },
        chartWrap: {
            width: CANVAS,
            height: CANVAS,
            marginVertical: -GLOW_PAD / 2,
            alignItems: "center",
            justifyContent: "center",
        },
        centerLabel: {
            position: "absolute",
            alignItems: "center",
            maxWidth: INNER_R * 2 - 16,
        },
        centerSmall: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            marginTop: 2,
        },
        centerBig: {
            fontSize: 24,
            fontFamily: theme.fonts.bold,
            fontVariant: ["tabular-nums"],
            letterSpacing: -0.5,
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
            fontFamily: theme.fonts.regular,
        },
        legendPct: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
        },
    });
