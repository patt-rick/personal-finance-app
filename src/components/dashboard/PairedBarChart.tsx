import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "../../theme/theme";
import { compactMoney, niceCeil } from "../../utils/chartScale";

interface PairedBarChartProps {
    labels: string[];
    primaryData: number[];
    secondaryData: number[];
    primaryColor: string;
    secondaryColor: string;
    currencySymbol: string;
}

const PLOT_HEIGHT = 150;
const VALUE_SPACE = 20;
const AXIS_WIDTH = 44;
const BAR_GAP = 4;
const MAX_BAR = 26;
const RADIUS = 7;
const MIN_LABEL_SLOT = 56;
const LABEL_CLEARANCE = 16;

const lastWithData = (a: number[], b: number[]) => {
    for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0 || b[i] > 0) return i;
    return a.length - 1;
};

/** Income vs spending per period: tinted bars, with the selected period drawn solid and labelled. Tap a period to select it. */
export default function PairedBarChart({
    labels,
    primaryData,
    secondaryData,
    primaryColor,
    secondaryColor,
    currencySymbol,
}: PairedBarChartProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [width, setWidth] = useState(0);
    const [selected, setSelected] = useState(() => lastWithData(primaryData, secondaryData));

    useEffect(() => setSelected(lastWithData(primaryData, secondaryData)), [primaryData, secondaryData]);

    const top = niceCeil(Math.max(...primaryData, ...secondaryData, 0));
    const plotWidth = Math.max(width - AXIS_WIDTH, 0);
    const slot = labels.length > 0 ? plotWidth / labels.length : 0;
    const barWidth = Math.min(MAX_BAR, Math.max((slot * 0.72 - BAR_GAP) / 2, 4));
    const y = (v: number) => VALUE_SPACE + (1 - v / top) * PLOT_HEIGHT;
    const height = VALUE_SPACE + PLOT_HEIGHT;
    const tint = (color: string) => `${color.slice(0, 7)}${theme.dark ? "73" : "40"}`;
    const showValues = slot >= MIN_LABEL_SLOT;

    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

    const bar = (value: number, x: number, color: string, solid: boolean, labelled: boolean, key: string) => {
        const h = value > 0 ? Math.max(height - y(value), 4) : 0;
        if (h === 0) return null;
        return (
            <G key={key}>
                <Rect
                    x={x}
                    y={height - h}
                    width={barWidth}
                    height={h}
                    rx={Math.min(RADIUS, barWidth / 2)}
                    fill={solid ? color : tint(color)}
                />
                {solid && labelled && (
                    <SvgText
                        x={x + barWidth / 2}
                        y={height - h - 6}
                        fill={color}
                        fontSize={11}
                        fontFamily={theme.fonts.semibold}
                        textAnchor="middle"
                    >
                        {compactMoney(value, currencySymbol)}
                    </SvgText>
                )}
            </G>
        );
    };

    return (
        <View style={styles.wrapper}>
            {selected >= 0 && selected < labels.length && (
                <Text style={styles.summary} numberOfLines={1}>
                    {labels[selected]}:{" "}
                    <Text style={[styles.summaryValue, { color: primaryColor }]}>
                        {compactMoney(primaryData[selected] ?? 0, currencySymbol)} in
                    </Text>
                    {"  ·  "}
                    <Text style={[styles.summaryValue, { color: secondaryColor }]}>
                        {compactMoney(secondaryData[selected] ?? 0, currencySymbol)} out
                    </Text>
                </Text>
            )}

            <View onLayout={onLayout}>
                {width > 0 && (
                    <Svg width={width} height={height}>
                        {[top, top / 2, 0].map((tick) => (
                            <SvgText
                                key={tick}
                                x={0}
                                y={Math.min(y(tick) + 4, height - 1)}
                                fill={theme.colors.onSurfaceVariant}
                                fontSize={10}
                                fontFamily={theme.fonts.regular}
                            >
                                {compactMoney(tick, currencySymbol)}
                            </SvgText>
                        ))}
                        {labels.map((_, i) => {
                            const center = AXIS_WIDTH + slot * i + slot / 2;
                            const solid = i === selected;
                            const p = primaryData[i] ?? 0;
                            const s = secondaryData[i] ?? 0;
                            // Neighbouring labels collide when the bar tops are close; then only the taller bar is labelled.
                            const close = Math.abs(y(p) - y(s)) < LABEL_CLEARANCE;
                            return (
                                <G key={i}>
                                    {bar(p, center - barWidth - BAR_GAP / 2, primaryColor, solid, showValues && (!close || p >= s), "p")}
                                    {bar(s, center + BAR_GAP / 2, secondaryColor, solid, showValues && (!close || s > p), "s")}
                                    <Rect
                                        x={AXIS_WIDTH + slot * i}
                                        y={0}
                                        width={slot}
                                        height={height}
                                        fill="transparent"
                                        onPress={() => setSelected(i)}
                                    />
                                </G>
                            );
                        })}
                    </Svg>
                )}
                <View style={[styles.labels, { marginLeft: AXIS_WIDTH }]}>
                    {labels.map((label, i) => (
                        <Text
                            key={i}
                            style={[styles.label, i === selected && styles.labelSelected]}
                            numberOfLines={1}
                            onPress={() => setSelected(i)}
                        >
                            {label}
                        </Text>
                    ))}
                </View>
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        wrapper: {
            paddingHorizontal: 4,
            paddingTop: 4,
        },
        summary: {
            ...theme.typescale.bodyMedium,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 8,
        },
        summaryValue: {
            fontFamily: theme.fonts.bold,
        },
        labels: {
            flexDirection: "row",
            marginTop: 6,
        },
        label: {
            flex: 1,
            textAlign: "center",
            ...theme.typescale.labelSmall,
            letterSpacing: 0,
            color: theme.colors.onSurfaceVariant,
        },
        labelSelected: {
            color: theme.colors.onSurface,
            fontFamily: theme.fonts.bold,
        },
    });
