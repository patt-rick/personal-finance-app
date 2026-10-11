import { layoutTreemap, TreemapRect } from "./treemap";

export type TileSize = "large" | "medium" | "small";

export interface TileContent {
    size: TileSize;
    showIcon: boolean;
    nameLines: 1 | 2;
    showAmount: boolean;
}

interface Box {
    width: number;
    height: number;
}

/** Tile text stops growing past this system font scale, so the height maths has a ceiling. */
export const MAX_TILE_FONT_SCALE = 1.3;

// Line heights match the text styles CategoryTile renders at each size, before system font scaling.
export const TILE_PADDING: Record<TileSize, number> = { large: 12, medium: 12, small: 8 };
const PCT_LINE: Record<TileSize, number> = { large: 36, medium: 24, small: 20 };
const AMOUNT_LINE: Record<TileSize, number> = { large: 21, medium: 18, small: 15 };
const NAME_LINE = 16;
const LINE_GAP = 1;
const ICON = 30;
const ICON_GAP = 6;
const MIN_WIDTH: Record<TileSize, number> = { large: 120, medium: 84, small: 0 };
/** Room for a percentage like "48.2%" at the small size. */
const PCT_WIDTH = 44;

function neededHeight(content: TileContent, fontScale: number): number {
    const { size } = content;
    return (
        TILE_PADDING[size] * 2 +
        (content.showIcon ? ICON + ICON_GAP : 0) +
        PCT_LINE[size] * fontScale +
        content.nameLines * (NAME_LINE * fontScale + LINE_GAP) +
        (content.showAmount ? AMOUNT_LINE[size] * fontScale + LINE_GAP : 0)
    );
}

/**
 * The richest tile layout that fits inside `inner` without clipping, or null when not even the percentage and a
 * one-line name fit. Smaller type is preferred over hiding the amount.
 */
export function tileContent(inner: Box, nameWords: number, fontScale = 1): TileContent | null {
    if (inner.width < TILE_PADDING.small * 2 + PCT_WIDTH * fontScale) return null;
    const split: 1 | 2 = nameWords > 1 ? 2 : 1;
    const candidates: TileContent[] = [
        { size: "large", showIcon: true, nameLines: 1, showAmount: true },
        { size: "medium", showIcon: false, nameLines: split, showAmount: true },
        { size: "medium", showIcon: false, nameLines: 1, showAmount: true },
        { size: "small", showIcon: false, nameLines: split, showAmount: true },
        { size: "small", showIcon: false, nameLines: 1, showAmount: true },
        { size: "medium", showIcon: false, nameLines: 1, showAmount: false },
        { size: "small", showIcon: false, nameLines: 1, showAmount: false },
    ];
    return (
        candidates.find((c) => inner.width >= MIN_WIDTH[c.size] && neededHeight(c, fontScale) <= inner.height) ?? null
    );
}

/**
 * Lays out the largest leading run of `values` (sorted largest first) whose tiles all pass `fits`. Each rect
 * includes `gap`; `fits` receives the rect with the gap taken off.
 */
export function fitTreemap(
    values: number[],
    width: number,
    height: number,
    gap: number,
    fits: (inner: Box, index: number) => boolean,
): { count: number; rects: TreemapRect[] } {
    for (let count = values.length; count > 0; count--) {
        const rects = layoutTreemap(values.slice(0, count), width + gap, height + gap);
        if (rects.every((r, i) => fits({ width: r.width - gap, height: r.height - gap }, i))) {
            return { count, rects };
        }
    }
    return { count: 0, rects: [] };
}

/**
 * Splits categories (largest first) into those drawn as readable tiles and the leftovers listed below the map.
 * A share that would read as 0% never becomes a tile.
 */
export function planTiles<T extends { name: string; amount: number; percentage: number }>(
    categories: T[],
    width: number,
    height: number,
    gap: number,
    fontScale: number,
): { tiles: T[]; rects: TreemapRect[]; leftover: T[] } {
    const candidates = categories.filter((c) => c.percentage >= 0.05 && c.amount > 0);
    const { count, rects } = fitTreemap(
        candidates.map((c) => c.amount),
        width,
        height,
        gap,
        (inner, i) => tileContent(inner, candidates[i].name.trim().split(/\s+/).length, fontScale) !== null,
    );
    const tiles = candidates.slice(0, count);
    const tiled = new Set(tiles);
    return { tiles, rects, leftover: categories.filter((c) => !tiled.has(c)) };
}

/** Shares always carry one decimal; a slice too small or too large for that never reads as 0% or 100%. */
export function formatPercent(p: number): string {
    if (p > 0 && p < 0.05) return "<0.1%";
    if (p < 100 && p >= 99.95) return ">99.9%";
    return `${p.toFixed(1)}%`;
}
