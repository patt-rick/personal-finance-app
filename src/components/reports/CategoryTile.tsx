import React, { useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import CategoryIcon from "../CategoryIcon";
import { TreemapRect } from "../../utils/treemap";

export interface CategoryShare {
    name: string;
    amount: number;
    percentage: number;
    count: number;
    color: string;
}

export const TILE_GAP = 6;

type Size = "large" | "medium" | "small";

const tileSize = ({ width, height }: { width: number; height: number }): Size =>
    width >= 120 && height >= 110 ? "large" : width >= 84 && height >= 64 ? "medium" : "small";

/** Android wraps long words mid-word, so narrow tiles get one word per line (at most two lines) and shrink to fit instead. */
function nameLines(name: string, size: Size): string[] {
    const words = name.split(/\s+/);
    if (size === "large" || words.length === 1) return [name];
    return [words[0], words.slice(1).join(" ")];
}

interface CategoryTileProps {
    tile: CategoryShare;
    rect: TreemapRect;
    symbol: string;
    appear: Animated.AnimatedInterpolation<number>;
    showIcon: boolean;
    onPress?: () => void;
}

export default function CategoryTile({ tile, rect, symbol, appear, showIcon, onPress }: CategoryTileProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    if (rect.width <= TILE_GAP || rect.height <= TILE_GAP) return null;

    const inner = { width: rect.width - TILE_GAP, height: rect.height - TILE_GAP };
    const size = tileSize(inner);
    const pct = Math.round(tile.percentage);
    const label = `${tile.name}, ${symbol} ${Math.floor(tile.amount).toLocaleString()}, ${pct}% of spending, ${tile.count} transaction${
        tile.count !== 1 ? "s" : ""
    }`;

    return (
        <Pressable
            disabled={!onPress}
            onPress={onPress}
            accessible
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={label}
            accessibilityHint={onPress ? "Shows these categories as tiles" : undefined}
            style={[styles.slot, { left: rect.x, top: rect.y, ...inner }]}
        >
            {({ pressed }) => (
                <Animated.View
                    style={[
                        styles.tile,
                        size === "small" && styles.tileSmall,
                        {
                            backgroundColor: `${tile.color.slice(0, 7)}${pressed ? "3D" : "24"}`,
                            opacity: appear,
                            transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
                        },
                    ]}
                >
                    {onPress && <ChevronRight size={16} color={theme.colors.onSurfaceVariant} style={styles.chevron} />}
                    {size === "large" && showIcon && <CategoryIcon category={tile.name} type="expense" size={30} />}
                    <View style={styles.body}>
                        <Text
                            style={[
                                styles.pct,
                                size === "large" && styles.pctLarge,
                                size === "small" && styles.pctSmall,
                                { color: tile.color },
                            ]}
                        >
                            {pct}%
                        </Text>
                        {nameLines(tile.name, size).map((line, i) => (
                            <Text
                                key={i}
                                style={[styles.name, size === "small" && styles.nameSmall]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {line}
                            </Text>
                        ))}
                        <MoneyText
                            amount={tile.amount}
                            symbol={symbol}
                            size={size === "large" ? 15 : size === "medium" ? 13 : 11}
                            showDecimals={false}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        />
                    </View>
                </Animated.View>
            )}
        </Pressable>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        slot: {
            position: "absolute",
        },
        tile: {
            flex: 1,
            borderRadius: theme.shape.large,
            padding: 12,
            justifyContent: "space-between",
            overflow: "hidden",
        },
        tileSmall: {
            borderRadius: theme.shape.medium,
            padding: 8,
            justifyContent: "flex-end",
        },
        chevron: {
            position: "absolute",
            top: 8,
            right: 8,
        },
        body: {
            gap: 1,
        },
        pct: {
            ...theme.typescale.titleMedium,
            fontFamily: theme.fonts.bold,
        },
        pctLarge: {
            fontSize: 30,
            lineHeight: 36,
        },
        pctSmall: {
            ...theme.typescale.labelLarge,
            fontFamily: theme.fonts.bold,
        },
        name: {
            ...theme.typescale.labelMedium,
            color: theme.colors.onSurfaceVariant,
        },
        nameSmall: {
            ...theme.typescale.labelSmall,
            letterSpacing: 0,
        },
    });
