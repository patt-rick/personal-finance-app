import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AppTheme, useTheme } from "../../../theme/theme";
import { riseStyle } from "../../../components/reports/motion";
import { BudgetRow, SummaryLines } from "../dashboardModel";
import AllocationBar from "./AllocationBar";

interface BudgetSummaryProps {
    lines: SummaryLines;
    amountColor: string;
    rows: BudgetRow[];
    limit: number | null;
    colorFor: (row: BudgetRow) => string;
    progress: Animated.Value;
}

export default function BudgetSummary({ lines, amountColor, rows, limit, colorFor, progress }: BudgetSummaryProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const rise = useMemo(() => riseStyle(progress, 0.15, 0.45), [progress]);
    return (
        <Animated.View style={rise}>
            <Text style={styles.sentence}>
                {lines.sentence.before}
                <Text style={[styles.amount, { color: amountColor }]}>{lines.sentence.amount}</Text>
                {lines.sentence.after}
            </Text>
            {lines.forecast && <Text style={styles.forecast}>{lines.forecast}</Text>}
            {limit !== null && rows.length > 0 && (
                <View>
                    <AllocationBar rows={rows} limit={limit} colorFor={colorFor} progress={progress} />
                </View>
            )}
        </Animated.View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        sentence: {
            fontSize: 17,
            lineHeight: 24,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        amount: {
            fontFamily: theme.fonts.bold,
            fontVariant: ["tabular-nums"],
        },
        forecast: {
            ...theme.typescale.bodyMedium,
            color: theme.colors.onSurfaceVariant,
            marginTop: 6,
            fontVariant: ["tabular-nums"],
        },
    });
