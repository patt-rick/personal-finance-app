import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Line, G } from "react-native-svg";
import { useTheme } from "../../theme/theme";

interface WeeklyBarChartProps {
    labels: string[];
    incomeData: number[];
    expenseData: number[];
    currencySymbol: string;
    incomeColor?: string;
    expenseColor?: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_HEIGHT = 150;
const BAR_WIDTH = 12;
const BAR_GAP = 4;
const BAR_RADIUS = 5;
const H_PADDING = 20;

export default function WeeklyBarChart({
    labels,
    incomeData,
    expenseData,
    currencySymbol,
    incomeColor,
    expenseColor,
}: WeeklyBarChartProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const resolvedIncomeColor = incomeColor ?? theme.colors.income;
    const resolvedExpenseColor = expenseColor ?? theme.colors.chart[3];
    const [tooltip, setTooltip] = useState<{ index: number; type: "income" | "expense" } | null>(
        null,
    );

    const allValues = [...incomeData, ...expenseData];
    const maxVal = Math.max(...allValues, 1);

    // Card has 20px margin each side + 16px padding each side = 72px total
    // Then this component adds H_PADDING each side
    const availableWidth = SCREEN_WIDTH - 40 - 32 - H_PADDING * 2;
    const pairWidth = BAR_WIDTH * 2 + BAR_GAP;
    const pairGap = (availableWidth - labels.length * pairWidth) / Math.max(labels.length - 1, 1);
    const totalWidth = availableWidth;

    const barHeight = (val: number) =>
        Math.max((val / maxVal) * (CHART_HEIGHT - 20), val > 0 ? 8 : 0);

    const getPairX = (i: number) => i * (pairWidth + pairGap);

    const tooltipValue = tooltip
        ? tooltip.type === "income"
            ? incomeData[tooltip.index]
            : expenseData[tooltip.index]
        : null;

    const tooltipX = tooltip
        ? getPairX(tooltip.index) +
          (tooltip.type === "income" ? BAR_WIDTH / 2 : BAR_WIDTH + BAR_GAP + BAR_WIDTH / 2)
        : 0;

    const dashY = CHART_HEIGHT * 0.35;

    return (
        <View style={styles.wrapper}>
            {tooltip !== null && tooltipValue !== null && (
                <View
                    style={[
                        styles.tooltip,
                        {
                            backgroundColor: theme.colors.inverseSurface,
                            left: tooltipX + H_PADDING - 40,
                            top: -4,
                        },
                    ]}
                >
                    <Text style={[styles.tooltipText, { color: theme.colors.inverseOnSurface }]}>
                        {currencySymbol}
                        {tooltipValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Text>
                    <View style={[styles.tooltipArrow, { borderTopColor: theme.colors.inverseSurface }]} />
                </View>
            )}

            <Svg
                width={totalWidth}
                height={CHART_HEIGHT}
                viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}
            >
                <Line
                    x1={0}
                    y1={dashY}
                    x2={totalWidth}
                    y2={dashY}
                    stroke={theme.colors.outlineVariant}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                />

                {labels.map((_, i) => {
                    const x = getPairX(i);
                    const incH = barHeight(incomeData[i]);
                    const expH = barHeight(expenseData[i]);
                    const incY = CHART_HEIGHT - incH;
                    const expY = CHART_HEIGHT - expH;

                    return (
                        <G key={i}>
                            <Rect
                                x={x}
                                y={incY}
                                width={BAR_WIDTH}
                                height={incH}
                                rx={BAR_RADIUS}
                                ry={BAR_RADIUS}
                                fill={resolvedIncomeColor}
                                onPress={() =>
                                    setTooltip((prev) =>
                                        prev?.index === i && prev?.type === "income"
                                            ? null
                                            : { index: i, type: "income" },
                                    )
                                }
                            />
                            <Rect
                                x={x + BAR_WIDTH + BAR_GAP}
                                y={expY}
                                width={BAR_WIDTH}
                                height={expH}
                                rx={BAR_RADIUS}
                                ry={BAR_RADIUS}
                                fill={resolvedExpenseColor}
                                onPress={() =>
                                    setTooltip((prev) =>
                                        prev?.index === i && prev?.type === "expense"
                                            ? null
                                            : { index: i, type: "expense" },
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
                                color: theme.colors.onSurfaceVariant,
                                left: getPairX(i) + pairWidth / 2 - 12,
                            },
                        ]}
                    >
                        {label}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
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
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
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
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            width: 24,
            textAlign: "center",
        },
    });
