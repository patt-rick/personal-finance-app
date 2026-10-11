import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../../theme/theme";
import MoneyText from "../MoneyText";
import { TreemapRect } from "../../utils/treemap";
import { formatPercent, MAX_TILE_FONT_SCALE, planTiles } from "../../utils/categoryTiles";
import { exactMoney } from "../../utils/chartScale";
import CategoryTile, { CategoryShare, categorySummary, TILE_GAP } from "./CategoryTile";
import CategoryRow from "./CategoryRow";
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

const sum = (list: CategoryShare[], key: "amount" | "percentage" | "count") =>
    list.reduce((total, c) => total + c[key], 0);

const transactionsLabel = (count: number) => `${count} transaction${count !== 1 ? "s" : ""}`;

export default function CategoryStory({ categories, others, symbol, active, reduced }: CategoryStoryProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const fontScale = Math.min(useWindowDimensions().fontScale, MAX_TILE_FONT_SCALE);
    const [width, setWidth] = useState(0);
    const [showOthers, setShowOthers] = useState(false);

    useEffect(() => setShowOthers(false), [categories, others]);

    const top = useMemo(
        () => planTiles(categories, width, MAP_HEIGHT, TILE_GAP, fontScale),
        [categories, width, fontScale],
    );
    const rest = useMemo(() => [...top.leftover, ...others], [top, others]);
    const drill = useMemo(
        () => planTiles(rest, width, MAP_HEIGHT, TILE_GAP, fontScale),
        [rest, width, fontScale],
    );

    if (categories.length === 0) return null;

    const restTotal = sum(rest, "amount");
    const restShare = sum(rest, "percentage");
    const drilling = showOthers && rest.length > 1;
    const view = drilling ? drill : { ...top, leftover: [] as CategoryShare[] };
    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

    const renderRow = (c: CategoryShare) => (
        <CategoryRow
            key={c.name}
            name={c.name}
            detail={transactionsLabel(c.count)}
            amount={c.amount}
            percent={formatPercent(c.percentage)}
            color={c.color}
            symbol={symbol}
            accessibilityLabel={categorySummary(c, symbol)}
        />
    );

    const restLabel = [
        REST_NAME,
        `${rest.length} categories`,
        exactMoney(restTotal, symbol),
        `${formatPercent(restShare)} of spending`,
    ].join(", ");

    const footer = drilling ? (
        view.leftover.map(renderRow)
    ) : rest.length === 1 ? (
        renderRow(rest[0])
    ) : rest.length > 1 ? (
        <CategoryRow
            name={REST_NAME}
            detail={`${rest.length} more categories`}
            amount={restTotal}
            percent={formatPercent(restShare)}
            color={theme.colors.outline}
            symbol={symbol}
            accessibilityLabel={restLabel}
            onPress={() => setShowOthers(true)}
        />
    ) : null;

    return (
        <View>
            <Text style={styles.lede}>
                {categories[0].name} took {formatPercent(categories[0].percentage)} of your spending.
            </Text>
            {drilling && (
                <View style={styles.othersBar}>
                    <Pressable
                        onPress={() => setShowOthers(false)}
                        accessibilityRole="button"
                        accessibilityLabel="Back to top categories"
                        hitSlop={12}
                        style={styles.back}
                    >
                        <ChevronLeft size={18} color={theme.colors.primary} />
                        <Text style={styles.backText}>Top categories</Text>
                    </Pressable>
                    <View style={styles.othersTotal}>
                        <Text style={styles.othersLabel}>{REST_NAME}</Text>
                        <MoneyText amount={restTotal} symbol={symbol} size={14} />
                    </View>
                </View>
            )}
            <View style={styles.body} onLayout={onLayout}>
                {width > 0 && view.tiles.length > 0 && (
                    <View style={styles.map}>
                        <TileMap
                            key={drilling ? "others" : "top"}
                            tiles={view.tiles}
                            rects={view.rects}
                            symbol={symbol}
                            fontScale={fontScale}
                            active={active}
                            reduced={reduced}
                        />
                    </View>
                )}
                {width > 0 && footer}
            </View>
        </View>
    );
}

/** One treemap of tiles; remounted for each view so its pop-in plays again. */
function TileMap({
    tiles,
    rects,
    symbol,
    fontScale,
    active,
    reduced,
}: {
    tiles: CategoryShare[];
    rects: TreemapRect[];
    symbol: string;
    fontScale: number;
    active: boolean;
    reduced: boolean | null;
}) {
    const progress = useReveal(active, reduced, { duration: 500 + tiles.length * 120 });

    return (
        <>
            {tiles.map((tile, i) => {
                const from = Math.min(i * STAGGER, 1 - TILE_SPAN);
                return (
                    <CategoryTile
                        key={`${i}:${tile.name}`}
                        tile={tile}
                        rect={rects[i]}
                        symbol={symbol}
                        fontScale={fontScale}
                        appear={slice(progress, from, from + TILE_SPAN)}
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
            minHeight: 40,
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
        body: {
            marginHorizontal: 20,
            gap: TILE_GAP,
        },
        map: {
            height: MAP_HEIGHT,
        },
    });
