import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react-native";
import { useTheme } from "../../theme/theme";
import ListCard from "../ListCard";
import { ChangeMetric, MonthOverMonth, changeSentence } from "../../utils/reportStory";
import { riseStyle, useReveal } from "./motion";

interface ComparisonStoryProps {
    comparison: MonthOverMonth;
    active: boolean;
    reduced: boolean | null;
}

const METRICS: ChangeMetric[] = ["spending", "income", "net"];
const STEP = 0.2;

export default function ComparisonStory({ comparison, active, reduced }: ComparisonStoryProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const progress = useReveal(active, reduced, { duration: 900 });

    return (
        <ListCard style={styles.card}>
            {METRICS.map((metric, i) => {
                const s = changeSentence(metric, comparison[metric]);
                const Icon = s.direction === "up" ? ArrowUpRight : s.direction === "down" ? ArrowDownRight : Minus;
                const tint = s.good ? theme.colors.income : theme.colors.onSurfaceVariant;
                const bg = s.good ? theme.colors.incomeContainer : theme.colors.surfaceContainerHigh;
                return (
                    <Animated.View
                        key={metric}
                        style={[styles.row, riseStyle(progress, i * STEP, i * STEP + (1 - STEP * 2), 6)]}
                        accessible
                        accessibilityLabel={s.text}
                    >
                        <View style={[styles.badge, { backgroundColor: bg }]}>
                            <Icon size={16} color={tint} strokeWidth={2.2} />
                        </View>
                        <Text style={styles.text}>{s.text}</Text>
                    </Animated.View>
                );
            })}
        </ListCard>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        card: {
            marginHorizontal: 20,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        badge: {
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
        },
        text: {
            ...theme.typescale.bodyMedium,
            letterSpacing: 0,
            color: theme.colors.onSurface,
            flex: 1,
        },
    });
