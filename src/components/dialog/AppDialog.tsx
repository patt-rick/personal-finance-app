import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { TriangleAlert, CircleCheck, Info } from "lucide-react-native";
import { useTheme, AppTheme } from "../../theme/theme";
import type { AppAlertButton, AppAlertTone } from "./appAlert";

const TONE_ICONS = {
    destructive: TriangleAlert,
    warning: TriangleAlert,
    success: CircleCheck,
    info: Info,
} as const;

interface AppDialogProps {
    tone: AppAlertTone;
    title: string;
    message?: string;
    buttons: AppAlertButton[];
    onButtonPress: (button: AppAlertButton) => void;
}

export default function AppDialog({ tone, title, message, buttons, onButtonPress }: AppDialogProps) {
    const theme = useTheme();
    const s = React.useMemo(() => createStyles(theme), [theme]);

    const toneColors = {
        destructive: { circle: theme.colors.errorContainer, icon: theme.colors.onErrorContainer },
        warning: { circle: theme.colors.goldContainer, icon: theme.colors.onGoldContainer },
        success: { circle: theme.colors.incomeContainer, icon: theme.colors.onIncomeContainer },
        info: { circle: theme.colors.primaryContainer, icon: theme.colors.onPrimaryContainer },
    }[tone];
    const ToneIcon = TONE_ICONS[tone];
    const stacked = buttons.length >= 3;

    const renderButton = (button: AppAlertButton, index: number) => {
        const isCancel = button.style === "cancel";
        const isDestructive = button.style === "destructive";
        if (isCancel) {
            return (
                <TouchableOpacity
                    key={index}
                    onPress={() => onButtonPress(button)}
                    style={[s.textButton, stacked && s.stackedButton]}
                    accessibilityRole="button"
                >
                    <Text style={s.textButtonLabel}>{button.text}</Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity
                key={index}
                onPress={() => onButtonPress(button)}
                style={[
                    s.filledButton,
                    { backgroundColor: isDestructive ? theme.colors.error : theme.colors.primary },
                    stacked && s.stackedButton,
                ]}
                accessibilityRole="button"
            >
                <Text
                    style={[
                        s.filledButtonLabel,
                        { color: isDestructive ? theme.colors.onError : theme.colors.onPrimary },
                    ]}
                >
                    {button.text}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={s.card}>
            <View style={[s.iconCircle, { backgroundColor: toneColors.circle }]}>
                <ToneIcon size={26} color={toneColors.icon} />
            </View>
            <Text style={s.title}>{title}</Text>
            {!!message && <Text style={s.message}>{message}</Text>}
            <View style={stacked ? s.buttonColumn : s.buttonRow}>{buttons.map(renderButton)}</View>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        card: {
            borderRadius: theme.shape.largeIncreased,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
            alignItems: "center",
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
        iconCircle: {
            width: 52,
            height: 52,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        title: {
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            textAlign: "center",
            marginBottom: 8,
        },
        message: {
            fontSize: 14,
            lineHeight: 20,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            marginBottom: 4,
        },
        buttonRow: {
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            alignSelf: "stretch",
            gap: 10,
            marginTop: 16,
        },
        buttonColumn: {
            alignSelf: "stretch",
            gap: 8,
            marginTop: 16,
        },
        stackedButton: {
            alignSelf: "stretch",
            alignItems: "center",
        },
        filledButton: {
            borderRadius: theme.shape.full,
            paddingHorizontal: 22,
            paddingVertical: 11,
            alignItems: "center",
        },
        filledButtonLabel: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
        },
        textButton: {
            paddingHorizontal: 14,
            paddingVertical: 11,
        },
        textButtonLabel: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
        },
    });
