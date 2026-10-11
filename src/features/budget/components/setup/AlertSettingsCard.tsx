import React, { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { AppTheme, useTheme } from "../../../../theme/theme";
import { BudgetWarnAt } from "../../../../types";
import { budgetColour } from "../../colour";

const THRESHOLDS: BudgetWarnAt[] = [70, 80, 90];

interface AlertSettingsCardProps {
    enabled: boolean;
    warnAt: BudgetWarnAt;
    notificationsDenied: boolean;
    onToggle: (enabled: boolean) => void;
    onWarnAt: (warnAt: BudgetWarnAt) => void;
}

export default function AlertSettingsCard({ enabled, warnAt, notificationsDenied, onToggle, onWarnAt }: AlertSettingsCardProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const stops = [0, warnAt - 20, warnAt, 100];

    return (
        <View style={styles.card}>
            <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                    <Text style={styles.title}>Budget alerts</Text>
                    <Text style={styles.help}>Tell me when spending crosses a threshold</Text>
                </View>
                <Switch
                    value={enabled}
                    onValueChange={onToggle}
                    trackColor={{ false: theme.colors.surfaceContainerHighest, true: theme.colors.primary }}
                    thumbColor={theme.colors.surfaceContainerLowest}
                    accessibilityLabel="Budget alerts"
                />
            </View>

            {enabled && notificationsDenied && (
                <Text style={styles.denied}>
                    Notifications are off for this app, so you'll only see budget alerts while the app is open.
                </Text>
            )}

            <Text style={[styles.title, styles.warnTitle]}>Warn me at</Text>
            <View style={styles.thresholds} accessibilityRole="radiogroup">
                {THRESHOLDS.map((t) => {
                    const on = t === warnAt;
                    return (
                        <Pressable
                            key={t}
                            onPress={() => onWarnAt(t)}
                            style={[styles.threshold, on && styles.thresholdOn]}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                        >
                            <Text style={[styles.thresholdText, on && styles.thresholdTextOn]}>{t}%</Text>
                        </Pressable>
                    );
                })}
            </View>
            <Text style={styles.help}>
                You'll also be told when you reach 100%. Each alert fires once per period, for the total and for each
                category limit.
            </Text>

            <View style={styles.strip}>
                <Svg width="100%" height={8}>
                    <Defs>
                        <LinearGradient id="warnStrip" x1="0" y1="0" x2="1" y2="0">
                            {stops.map((s) => (
                                <Stop key={s} offset={s / 100} stopColor={budgetColour(s, warnAt, theme.colors)} />
                            ))}
                        </LinearGradient>
                    </Defs>
                    <Rect x={0} y={0} width="100%" height={8} rx={4} fill="url(#warnStrip)" />
                </Svg>
            </View>
            <View style={styles.stripLabels}>
                <Text style={styles.stripLabel}>0%</Text>
                <Text style={[styles.stripLabel, { position: "absolute", left: `${warnAt}%`, transform: [{ translateX: -12 }] }]}>
                    {warnAt}%
                </Text>
                <Text style={styles.stripLabel}>100%</Text>
            </View>
            <Text style={styles.help}>The speedometer colours follow this threshold.</Text>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: theme.shape.largeIncreased,
            padding: 16,
            marginTop: 16,
        },
        toggleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        toggleText: {
            flex: 1,
        },
        title: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        warnTitle: {
            marginTop: 18,
        },
        help: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            marginTop: 6,
        },
        denied: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onErrorContainer,
            backgroundColor: theme.colors.errorContainer,
            borderRadius: theme.shape.medium,
            padding: 10,
            marginTop: 12,
        },
        thresholds: {
            flexDirection: "row",
            gap: 8,
            marginTop: 10,
        },
        threshold: {
            flex: 1,
            alignItems: "center",
            paddingVertical: 10,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainer,
            borderWidth: 1.5,
            borderColor: "transparent",
        },
        thresholdOn: {
            backgroundColor: theme.colors.goldContainer,
            borderColor: theme.colors.gold,
        },
        thresholdText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.onSurface,
            fontVariant: ["tabular-nums"],
        },
        thresholdTextOn: {
            color: theme.colors.onGoldContainer,
        },
        strip: {
            marginTop: 16,
        },
        stripLabels: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 4,
        },
        stripLabel: {
            ...theme.typescale.labelSmall,
            color: theme.colors.onSurfaceVariant,
            fontVariant: ["tabular-nums"],
        },
    });
