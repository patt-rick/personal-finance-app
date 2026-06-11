import React, { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "../../../theme/theme";

interface Props {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (next: boolean) => void;
    disabled?: boolean;
    last?: boolean;
}

export default function AutoLogToggleRow({
    icon,
    iconBg,
    title,
    subtitle,
    value,
    onValueChange,
    disabled,
    last,
}: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View
            style={[
                styles.row,
                last && { borderBottomWidth: 0 },
            ]}
        >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                ) : null}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                trackColor={{
                    false: theme.colors.surfaceContainerHighest,
                    true: theme.colors.primary,
                }}
                thumbColor={value ? theme.colors.onPrimary : theme.colors.outline}
            />
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
        },
        title: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            letterSpacing: -0.1,
            color: theme.colors.onSurface,
        },
        subtitle: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            marginTop: 1,
            color: theme.colors.onSurfaceVariant,
        },
    });
