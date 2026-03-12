import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Line, G } from "react-native-svg";
import { useTheme } from "../../theme/theme";

interface PairedBarChartProps {
    labels: string[];
    primaryData: number[];
    secondaryData: number[];
    primaryColor: string;
    secondaryColor: string;
    currencySymbol: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_HEIGHT = 140;
const BAR_WIDTH = 12;
const BAR_GAP = 4;
const BAR_RADIUS = 6;
const H_PADDING = 16;

export default function PairedBarChart({
    labels,
    primaryData,
    secondaryData,
    primaryColor,
    secondaryColor,
    currencySymbol,
}: PairedBarChartProps) {
    const theme = useTheme();
    const [tooltip, setTooltip] = useState<{ index: number; type: "primary" | "secondary" } | null>(null);

    const allValues = [...primaryData, ...secondaryData];
    const maxVal = Math.max(...allValues, 1);

    const availableWidth = SCREEN_WIDTH - 40 - 32 - H_PADDING * 2;
    const pairWidth = BAR_WIDTH * 2 + BAR_GAP;
    const pairGap = labels.length > 1
        ? (availableWidth - labels.length * pairWidth) / (labels.length - 1)
        : 0;
    const totalWidth = availableWidth;

    const barHeight = (val: number) =>
        Math.max((val / maxVal) * (CHART_HEIGHT - 20), val > 0 ? 6 : 0);

    const getPairX = (i: number) => i * (pairWidth + pairGap);

    const tooltipValue = tooltip
        ? tooltip.type === "primary"
            ? primaryData[tooltip.index]
            : secondaryData[tooltip.index]
        : null;

    const tooltipX = tooltip
        ? getPairX(tooltip.index) +
          (tooltip.type === "primary" ? BAR_WIDTH / 2 : BAR_WIDTH + BAR_GAP + BAR_WIDTH / 2)
        : 0;

    const dashY = CHART_HEIGHT * 0.35;

    return (
        <View style={styles.wrapper}>
            {tooltip !== null && tooltipValue !== null && (
                <View
                    style={[
                        styles.tooltip,
                        {
                            backgroundColor: theme.colors.text,
                            left: tooltipX + H_PADDING - 40,
                            top: -4,
                        },
                    ]}
                >
                    <Text style={[styles.tooltipText, { color: theme.colors.card }]}>
                        {currencySymbol}
                        {tooltipValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Text>
                    <View style={[styles.tooltipArrow, { borderTopColor: theme.colors.text }]} />
                </View>
            )}

            <Svg width={totalWidth} height={CHART_HEIGHT} viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}>
                <Line
                    x1={0}
                    y1={dashY}
                    x2={totalWidth}
                    y2={dashY}
                    stroke={theme.colors.border}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                />

                {labels.map((_, i) => {
                    const x = getPairX(i);
                    const pH = barHeight(primaryData[i]);
                    const sH = barHeight(secondaryData[i]);
                    const pY = CHART_HEIGHT - pH;
                    const sY = CHART_HEIGHT - sH;

                    return (
                        <G key={i}>
                            <Rect
                                x={x}
                                y={pY}
                                width={BAR_WIDTH}
                                height={pH}
                                rx={BAR_RADIUS}
                                ry={BAR_RADIUS}
                                fill={primaryColor}
                                onPress={() =>
                                    setTooltip((prev) =>
                                        prev?.index === i && prev?.type === "primary"
                                            ? null
                                            : { index: i, type: "primary" },
                                    )
                                }
                            />
                            <Rect
                                x={x + BAR_WIDTH + BAR_GAP}
                                y={sY}
                                width={BAR_WIDTH}
                                height={sH}
                                rx={BAR_RADIUS}
                                ry={BAR_RADIUS}
                                fill={secondaryColor}
                                onPress={() =>
                                    setTooltip((prev) =>
                                        prev?.index === i && prev?.type === "secondary"
                                            ? null
                                            : { index: i, type: "secondary" },
                                    )
                                }
                            />
                        </G>
                    );
                })}
            </Svg>

            <View style={[styles.labelsRow, { width: totalWidth }]}>
                {labels.map((label, i) => (
                    <Text
                        key={i}
                        style={[
                            styles.dayLabel,
                            {
                                color: theme.colors.textSecondary,
                                left: getPairX(i) + pairWidth / 2 - 18,
                            },
                        ]}
                        numberOfLines={1}
                    >
                        {label}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        position: "relative",
        paddingTop: 32,
        paddingHorizontal: H_PADDING,
    },
    tooltip: {
        position: "absolute",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        zIndex: 10,
        alignItems: "center",
    },
    tooltipText: {
        fontSize: 12,
        fontWeight: "700",
    },
    tooltipArrow: {
        position: "absolute",
        bottom: -5,
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 5,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
    },
    labelsRow: {
        position: "relative",
        height: 20,
        marginTop: 6,
    },
    dayLabel: {
        position: "absolute",
        fontSize: 9,
        fontWeight: "500",
        width: 36,
        textAlign: "center",
    },
});
