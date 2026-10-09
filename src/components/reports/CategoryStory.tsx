import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import { layoutTreemap } from "../../utils/treemap";
import CategoryTile, { CategoryShare, TILE_GAP } from "./CategoryTile";
import { slice, useReveal } from "./motion";

export type { CategoryShare };

interface CategoryStoryProps {
    categories: CategoryShare[];
    others: CategoryShare[];
    symbol: string;
    active: boolean;
    reduced: boolean | null;
}

const MAP_HEIGHT = 300;
const STAGGER = 0.1;
const TILE_SPAN = 0.45;
const REST_NAME = "Everything else";

export default function CategoryStory({ categories, others, symbol, active, reduced }: CategoryStoryProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [width, setWidth] = useState(0);
    const [showOthers, setShowOthers] = useState(false);

    useEffect(() => setShowOthers(false), [others]);

    const rest = useMemo<CategoryShare | null>(
        () =>
            others.length === 0
                ? null
                : {
                      name: REST_NAME,
                      amount: others.reduce((sum, c) => sum + c.amount, 0),
                      percentage: others.reduce((sum, c) => sum + c.percentage, 0),
                      count: others.reduce((sum, c) => sum + c.count, 0),
                      color: theme.colors.outline,
                  },
        [others, theme],
    );

    if (categories.length === 0) return null;
    const top = categories[0];
    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

    return (
        <View>
            <Text style={styles.lede}>
                {top.name} took {Math.round(top.percentage)}% of your spending.
            </Text>
            {showOthers && rest && (
                <View style={styles.othersBar}>
                    <Pressable
                        onPress={() => setShowOthers(false)}
                        accessibilityRole="button"
                        accessibilityLabel="Back to top categories"
                        hitSlop={8}
                        style={styles.back}
                    >
                        <ChevronLeft size={18} color={theme.colors.primary} />
                        <Text style={styles.backText}>Top categories</Text>
                    </Pressable>
                    <View style={styles.othersTotal}>
                        <Text style={styles.othersLabel}>{REST_NAME}</Text>
                        <MoneyText amount={rest.amount} symbol={symbol} size={14} showDecimals={false} />
                    </View>
                </View>
            )}
            <View style={styles.map} onLayout={onLayout}>
                {width > 0 && (
                    <TileMap
                        key={showOthers ? "others" : "top"}
                        tiles={showOthers ? others : rest ? [...categories, rest] : categories}
                        width={width}
                        symbol={symbol}
                        active={active}
                        reduced={reduced}
                        onOpenRest={showOthers || !rest ? undefined : () => setShowOthers(true)}
                    />
                )}
            </View>
        </View>
    );
}

/** One treemap of tiles; remounted for each view so its pop-in plays again. */
function TileMap({
    tiles,
    width,
    symbol,
    active,
    reduced,
    onOpenRest,
}: {
    tiles: CategoryShare[];
    width: number;
    symbol: string;
    active: boolean;
    reduced: boolean | null;
    onOpenRest?: () => void;
}) {
    const rects = useMemo(
        () => layoutTreemap(tiles.map((t) => t.amount), width + TILE_GAP, MAP_HEIGHT + TILE_GAP),
        [tiles, width],
    );
    const progress = useReveal(active, reduced, { duration: 500 + tiles.length * 120 });

    return (
        <>
            {tiles.map((tile, i) => {
                const from = Math.min(i * STAGGER, 1 - TILE_SPAN);
                const isRest = onOpenRest !== undefined && tile.name === REST_NAME && i === tiles.length - 1;
                return (
                    <CategoryTile
                        key={`${i}:${tile.name}`}
                        tile={tile}
                        rect={rects[i]}
                        symbol={symbol}
                        appear={slice(progress, from, from + TILE_SPAN)}
                        showIcon={!isRest}
                        onPress={isRest ? onOpenRest : undefined}
                    />
                );
            })}
        </>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        lede: {
            ...theme.typescale.bodyLarge,
            letterSpacing: 0,
            color: theme.colors.onSurfaceVariant,
            paddingHorizontal: 20,
            marginBottom: 12,
        },
        othersBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            marginBottom: 10,
        },
        back: {
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            marginLeft: -4,
        },
        backText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.primary,
        },
        othersTotal: {
            flexDirection: "row",
            alignItems: "baseline",
            gap: 6,
        },
        othersLabel: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        map: {
            height: MAP_HEIGHT,
            marginHorizontal: 20,
        },
    });
