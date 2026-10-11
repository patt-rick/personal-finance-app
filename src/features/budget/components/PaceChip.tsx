import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CircleAlert, CircleCheck, TrendingUp } from "lucide-react-native";
import { AppTheme, useTheme } from "../../../theme/theme";
import { ChipContent, ChipTone } from "../dashboardModel";

const ICONS = { check: CircleCheck, ahead: TrendingUp, over: CircleAlert };

export function chipColors(tone: ChipTone, theme: AppTheme) {
    const c = theme.colors;
    if (tone === "error") return { bg: c.expenseContainer, fg: c.onExpenseContainer, icon: c.expense };
    if (tone === "warning") return { bg: c.goldContainer, fg: c.onGoldContainer, icon: c.gold };
    return { bg: c.incomeContainer, fg: c.onIncomeContainer, icon: c.income };
}

export default function PaceChip({ chip, compact = false }: { chip: ChipContent; compact?: boolean }) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const colors = chipColors(chip.tone, theme);
    const Icon = ICONS[chip.icon];
    return (
        <View style={[styles.chip, compact && styles.compact, { backgroundColor: colors.bg }]}>
            <Icon size={compact ? 12 : 13} color={colors.icon} strokeWidth={2.6} />
            <Text style={[styles.text, compact && styles.compactText, { color: colors.fg }]} numberOfLines={1}>
                {chip.text}
            </Text>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        chip: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 5,
            paddingVertical: 5,
            paddingLeft: 8,
            paddingRight: 10,
            borderRadius: theme.shape.full,
        },
        compact: {
            paddingVertical: 3,
            paddingLeft: 6,
            paddingRight: 8,
        },
        text: {
            ...theme.typescale.labelMedium,
            fontVariant: ["tabular-nums"],
        },
        compactText: {
            fontSize: 11,
        },
    });
