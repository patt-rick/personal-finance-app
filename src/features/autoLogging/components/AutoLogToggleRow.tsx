import React from "react";
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
    return (
        <View
            style={[
                styles.row,
                { borderBottomColor: theme.colors.borderLight },
                last && { borderBottomWidth: 0 },
            ]}
        >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                {subtitle ? (
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
                ) : null}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.card}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: -0.1,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 1,
    },
});
