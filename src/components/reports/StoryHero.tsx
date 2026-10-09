import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import { PeriodSummary, heroCopy } from "../../utils/reportStory";
import FlowBar from "./FlowBar";
import { riseStyle, useCountUp, useReveal } from "./motion";

interface StoryHeroProps {
    periodLabel: string;
    summary: PeriodSummary;
    symbol: string;
    movedIn: number;
    movedOut: number;
    mixedCurrencies: boolean;
    reduced: boolean | null;
}

const TIMELINE_MS = 1800;

export default function StoryHero({
    periodLabel,
    summary,
    symbol,
    movedIn,
    movedOut,
    mixedCurrencies,
    reduced,
}: StoryHeroProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const format = useMemo(
        () => (n: number) => `${symbol} ${Math.floor(n).toLocaleString()}`.trim(),
        [symbol],
    );
    const copy = heroCopy(summary, format);
    const progress = useReveal(true, reduced, { duration: TIMELINE_MS });
    const motion = useMemo(
        () => ({
            period: riseStyle(progress, 0, 0.12, 6),
            lead: riseStyle(progress, 0.02, 0.16),
            amount: riseStyle(progress, 0.05, 0.2),
            tail: riseStyle(progress, 0.4, 0.55),
            notes: riseStyle(progress, 0.88, 1, 4),
        }),
        [progress],
    );

    const amountColor =
        copy.tone === "kept" ? theme.colors.income : copy.tone === "overspent" ? theme.colors.expense : theme.colors.onSurface;

    return (
        <View style={styles.wrap}>
            <View accessible accessibilityRole="header" accessibilityLabel={`${periodLabel}. ${copy.lead} ${format(copy.amount)} ${copy.tail}`}>
                <Animated.Text style={[styles.period, motion.period]}>{periodLabel}</Animated.Text>
                <Animated.Text style={[styles.lead, motion.lead]}>{copy.lead}</Animated.Text>
                <Animated.View style={motion.amount}>
                    <CountUpAmount target={copy.amount} symbol={symbol} color={amountColor} reduced={reduced} />
                </Animated.View>
                <Animated.Text style={[styles.tail, motion.tail]}>{copy.tail}</Animated.Text>
            </View>

            <View style={styles.flow}>
                <FlowBar summary={summary} symbol={symbol} progress={progress} format={format} />
            </View>

            {(movedIn > 0 || movedOut > 0 || mixedCurrencies) && (
                <Animated.View style={[styles.notes, motion.notes]}>
                    {movedIn > 0 && (
                        <Text style={styles.note}>
                            Came in includes {format(movedIn)} moved from your other cashbooks.
                        </Text>
                    )}
                    {movedOut > 0 && (
                        <Text style={styles.note}>
                            Went out includes {format(movedOut)} moved to your other cashbooks.
                        </Text>
                    )}
                    {mixedCurrencies && (
                        <Text style={styles.note}>
                            These totals add up cashbooks in different currencies. Pick one cashbook for exact figures.
                        </Text>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

function CountUpAmount({
    target,
    symbol,
    color,
    reduced,
}: {
    target: number;
    symbol: string;
    color: string;
    reduced: boolean | null;
}) {
    const shown = useCountUp(target, true, reduced, { delay: 150, duration: 800 });
    return (
        <MoneyText
            amount={shown}
            symbol={symbol}
            size={44}
            weight="light"
            color={color}
            showDecimals={shown === target}
            numberOfLines={1}
            adjustsFontSizeToFit
        />
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        wrap: {
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 8,
        },
        period: {
            ...theme.typescale.bodyMedium,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 6,
        },
        lead: {
            ...theme.typescale.headlineSmall,
            color: theme.colors.onSurface,
        },
        tail: {
            ...theme.typescale.bodyLarge,
            letterSpacing: 0,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
            maxWidth: 320,
        },
        flow: {
            marginTop: 22,
        },
        notes: {
            marginTop: 14,
            gap: 6,
        },
        note: {
            ...theme.typescale.bodySmall,
            letterSpacing: 0.2,
            color: theme.colors.onSurfaceVariant,
        },
    });
