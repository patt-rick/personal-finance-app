import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gauge, Minus, Plus } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import {
    AUTO_SAVE_THRESHOLD_MAX,
    AUTO_SAVE_THRESHOLD_MIN,
    stepAutoSaveThreshold,
} from "../services/persistence/settings";

interface Props {
    value: number;
    disabled: boolean;
    onChange: (next: number) => void;
}

export default function AutoSaveThresholdRow({ value, disabled, onChange }: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const percent = Math.round(value * 100);
    const canDecrease = !disabled && stepAutoSaveThreshold(value, -1) < value;
    const canIncrease = !disabled && stepAutoSaveThreshold(value, 1) > value;
    const subtitle = disabled
        ? "Off while every entry is reviewed first"
        : `Entries below ${percent}% wait for your review`;

    return (
        <View style={styles.row}>
            <View style={styles.iconCircle}>
                <Gauge size={18} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={styles.body}>
                <View style={styles.headRow}>
                    <Text style={styles.title}>Auto-save confidence</Text>
                    <View
                        style={[styles.stepper, disabled && styles.dimmed]}
                        accessible
                        accessibilityRole="adjustable"
                        accessibilityLabel="Auto-save confidence"
                        accessibilityValue={{
                            min: Math.round(AUTO_SAVE_THRESHOLD_MIN * 100),
                            max: Math.round(AUTO_SAVE_THRESHOLD_MAX * 100),
                            now: percent,
                            text: `${percent}%`,
                        }}
                        accessibilityState={{ disabled }}
                        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
                        onAccessibilityAction={(e) => {
                            if (e.nativeEvent.actionName === "increment" && canIncrease) onChange(stepAutoSaveThreshold(value, 1));
                            if (e.nativeEvent.actionName === "decrement" && canDecrease) onChange(stepAutoSaveThreshold(value, -1));
                        }}
                    >
                        <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => onChange(stepAutoSaveThreshold(value, -1))}
                            disabled={!canDecrease}
                            hitSlop={8}
                            importantForAccessibility="no"
                        >
                            <Minus size={16} color={canDecrease ? theme.colors.onSurface : theme.colors.outline} />
                        </TouchableOpacity>
                        <Text style={styles.value}>{percent}%</Text>
                        <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => onChange(stepAutoSaveThreshold(value, 1))}
                            disabled={!canIncrease}
                            hitSlop={8}
                            importantForAccessibility="no"
                        >
                            <Plus size={16} color={canIncrease ? theme.colors.onSurface : theme.colors.outline} />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        row: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.l,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: theme.shape.small,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
            backgroundColor: theme.colors.primaryContainer,
        },
        body: {
            flex: 1,
        },
        headRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        title: {
            flex: 1,
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            letterSpacing: -0.1,
            color: theme.colors.onSurface,
        },
        subtitle: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
        stepper: {
            flexDirection: "row",
            alignItems: "center",
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        dimmed: {
            opacity: 0.5,
        },
        stepBtn: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
        },
        value: {
            minWidth: 38,
            textAlign: "center",
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
            color: theme.colors.onSurface,
        },
    });
