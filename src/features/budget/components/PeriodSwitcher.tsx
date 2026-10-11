import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { AppTheme, useTheme } from "../../../theme/theme";

interface PeriodSwitcherProps {
    label: string;
    onBack: () => void;
    onForward: () => void;
    canGoForward: boolean;
}

export default function PeriodSwitcher({ label, onBack, onForward, canGoForward }: PeriodSwitcherProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    return (
        <View style={styles.row}>
            <Pressable
                onPress={onBack}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Previous period"
                hitSlop={6}
            >
                <ChevronLeft size={18} color={theme.colors.onSurface} />
            </Pressable>
            <Text style={styles.label} accessibilityRole="header">
                {label}
            </Text>
            <Pressable
                onPress={onForward}
                disabled={!canGoForward}
                style={({ pressed }) => [styles.button, !canGoForward && styles.disabled, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Next period"
                accessibilityState={{ disabled: !canGoForward }}
                hitSlop={6}
            >
                <ChevronRight size={18} color={theme.colors.onSurface} />
            </Pressable>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        row: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
        },
        button: {
            width: 36,
            height: 36,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerHigh,
            alignItems: "center",
            justifyContent: "center",
        },
        pressed: {
            opacity: 0.7,
        },
        disabled: {
            opacity: theme.state.disabledContent,
        },
        label: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
            fontVariant: ["tabular-nums"],
        },
    });
