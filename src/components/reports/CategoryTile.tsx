import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import CategoryIcon from "../CategoryIcon";
import { TreemapRect } from "../../utils/treemap";
import { exactMoney } from "../../utils/chartScale";
import { formatPercent, MAX_TILE_FONT_SCALE, TILE_PADDING, tileContent } from "../../utils/categoryTiles";

export interface CategoryShare {
    name: string;
    amount: number;
    percentage: number;
    count: number;
    color: string;
}

export const TILE_GAP = 6;

const AMOUNT_SIZE = { large: 15, medium: 13, small: 11 } as const;

/** Android wraps long words mid-word, so a two-line name breaks after the first word and each line shrinks to fit. */
function nameLines(name: string, lines: 1 | 2): string[] {
    if (lines === 1) return [name];
    const words = name.trim().split(/\s+/);
    return [words[0], words.slice(1).join(" ")];
}

export function categorySummary(tile: CategoryShare, symbol: string): string {
    return `${tile.name}, ${exactMoney(tile.amount, symbol)}, ${formatPercent(tile.percentage)} of spending, ${
        tile.count
    } transaction${tile.count !== 1 ? "s" : ""}`;
}

interface CategoryTileProps {
    tile: CategoryShare;
    rect: TreemapRect;
    symbol: string;
    fontScale: number;
    appear: Animated.AnimatedInterpolation<number>;
}

export default function CategoryTile({ tile, rect, symbol, fontScale, appear }: CategoryTileProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const inner = { width: rect.width - TILE_GAP, height: rect.height - TILE_GAP };
    const content = tileContent(inner, tile.name.trim().split(/\s+/).length, fontScale);
    if (!content) return null;
    const { size } = content;

    return (
        <Animated.View
            accessible
            accessibilityLabel={categorySummary(tile, symbol)}
            style={[
                styles.tile,
                {
                    left: rect.x,
                    top: rect.y,
                    ...inner,
                    padding: TILE_PADDING[size],
                    justifyContent: content.showIcon ? "space-between" : "flex-end",
                    borderRadius: size === "small" ? theme.shape.medium : theme.shape.large,
                    backgroundColor: `${tile.color.slice(0, 7)}24`,
                    opacity: appear,
                    transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
                },
            ]}
        >
            {content.showIcon && <CategoryIcon category={tile.name} type="expense" size={30} />}
            <View style={styles.body}>
                <Text
                    style={[
                        styles.pct,
                        size === "large" && styles.pctLarge,
                        size === "small" && styles.pctSmall,
                        { color: tile.color },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={MAX_TILE_FONT_SCALE}
                >
                    {formatPercent(tile.percentage)}
                </Text>
                {nameLines(tile.name, content.nameLines).map((line, i) => (
                    <Text
                        key={i}
                        style={[styles.name, size === "small" && styles.nameSmall]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        maxFontSizeMultiplier={MAX_TILE_FONT_SCALE}
                    >
                        {line}
                    </Text>
                ))}
                {content.showAmount && (
                    <MoneyText
                        amount={tile.amount}
                        symbol={symbol}
                        size={AMOUNT_SIZE[size]}
                        style={{ lineHeight: Math.round(AMOUNT_SIZE[size] * 1.4) }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        maxFontSizeMultiplier={MAX_TILE_FONT_SCALE}
                    />
                )}
            </View>
        </Animated.View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        tile: {
            position: "absolute",
            overflow: "hidden",
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
