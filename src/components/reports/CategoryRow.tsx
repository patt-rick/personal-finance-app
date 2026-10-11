import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";

interface CategoryRowProps {
    name: string;
    detail: string;
    amount: number;
    percent: string;
    color: string;
    symbol: string;
    accessibilityLabel: string;
    onPress?: () => void;
}

/** A full-width category line under the tile map, for shares too small to read as a tile. */
export default function CategoryRow({
    name,
    detail,
    amount,
    percent,
    color,
    symbol,
    accessibilityLabel,
    onPress,
}: CategoryRowProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const tint = color.slice(0, 7);

    const content = (
        <>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                    {detail}
                </Text>
            </View>
            <View style={styles.figures}>
                <Text style={[styles.percent, { color }]}>{percent}</Text>
                <MoneyText amount={amount} symbol={symbol} size={13} numberOfLines={1} />
            </View>
            {onPress && <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />}
        </>
    );

    if (!onPress) {
        return (
            <View
                accessible
                accessibilityLabel={accessibilityLabel}
                style={[styles.row, { backgroundColor: `${tint}24` }]}
            >
                {content}
            </View>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint="Shows these categories"
            style={({ pressed }) => [styles.row, { backgroundColor: `${tint}${pressed ? "3D" : "24"}` }]}
        >
            {content}
        </Pressable>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        row: {
            minHeight: 56,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: theme.shape.large,
        },
        dot: {
            width: 10,
            height: 10,
            borderRadius: 5,
        },
        text: {
            flex: 1,
        },
        name: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        detail: {
            ...theme.typescale.bodySmall,
            letterSpacing: 0,
            color: theme.colors.onSurfaceVariant,
        },
        figures: {
            alignItems: "flex-end",
        },
        percent: {
            ...theme.typescale.labelLarge,
            fontFamily: theme.fonts.bold,
        },
    });
