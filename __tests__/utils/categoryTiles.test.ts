import { fitTreemap, formatPercent, planTiles, tileContent } from "../../src/utils/categoryTiles";

describe("tileContent", () => {
    it("gives a roomy tile the icon, percentage, name and amount", () => {
        expect(tileContent({ width: 160, height: 200 }, 2)).toEqual({
            size: "large",
            showIcon: true,
            nameLines: 1,
            showAmount: true,
        });
    });

    it("drops the amount rather than clipping it when a medium tile is short", () => {
        const content = tileContent({ width: 120, height: 66 }, 1);
        expect(content).toMatchObject({ size: "medium", nameLines: 1, showAmount: false });
    });

    it("prefers smaller type over hiding the amount", () => {
        expect(tileContent({ width: 120, height: 70 }, 1)).toMatchObject({ size: "small", showAmount: true });
    });

    it("keeps the amount on a medium tile tall enough for every line", () => {
        expect(tileContent({ width: 120, height: 86 }, 1)).toMatchObject({ nameLines: 1, showAmount: true });
    });

    it("needs more height for the same content when the system font is scaled up", () => {
        expect(tileContent({ width: 120, height: 86 }, 1)).toMatchObject({ size: "medium" });
        expect(tileContent({ width: 120, height: 86 }, 1, 1.3)).toMatchObject({ size: "small" });
        expect(tileContent({ width: 120, height: 80 }, 1, 1.3)).toMatchObject({ showAmount: false });
    });

    it("returns null when not even the percentage and a one-line name fit", () => {
        expect(tileContent({ width: 120, height: 30 }, 1)).toBeNull();
        expect(tileContent({ width: 30, height: 200 }, 1)).toBeNull();
    });
});

describe("fitTreemap", () => {
    const fits = (r: { width: number; height: number }) => r.width >= 60 && r.height >= 50;

    it("keeps every tile when all of them are readable", () => {
        const { count, rects } = fitTreemap([40, 30, 20, 10], 300, 300, 6, fits);
        expect(count).toBe(4);
        expect(rects).toHaveLength(4);
    });

    it("moves the smallest tiles out until the rest are readable", () => {
        const { count, rects } = fitTreemap([60, 30, 8, 1, 1], 300, 300, 6, fits);
        expect(count).toBeLessThan(5);
        expect(count).toBeGreaterThanOrEqual(2);
        expect(rects).toHaveLength(count);
        rects.forEach((r) => expect(fits({ width: r.width - 6, height: r.height - 6 })).toBe(true));
    });

    it("returns no tiles when even a single tile would be unreadable", () => {
        expect(fitTreemap([10], 40, 40, 6, fits).count).toBe(0);
    });
});

describe("planTiles", () => {
    const cat = (name: string, amount: number, total = 1000) => ({ name, amount, percentage: (amount / total) * 100 });

    it("lists a share that would read as 0% instead of giving it a tile, even when it would fit", () => {
        const tiny = cat("Tiny", 0.4);
        const { tiles, leftover } = planTiles([cat("Rent", 600), cat("Food", 399.6), tiny], 340, 300, 6, 1);
        expect(tiles.map((t) => t.name)).toEqual(["Rent", "Food"]);
        expect(leftover).toEqual([tiny]);
    });

    it("moves slivers to the leftovers and keeps the original order there", () => {
        const all = [cat("A", 700), cat("B", 250), cat("C", 30), cat("D", 12), cat("E", 8)];
        const { tiles, rects, leftover } = planTiles(all, 340, 300, 6, 1);
        expect(tiles.length + leftover.length).toBe(5);
        expect(rects).toHaveLength(tiles.length);
        expect(leftover.map((c) => c.name)).toEqual(all.slice(tiles.length).map((c) => c.name));
        expect(leftover.length).toBeGreaterThan(0);
    });
});

describe("formatPercent", () => {
    it("always shows one decimal and never reads a non-zero share as 0% or a partial one as 100%", () => {
        expect(formatPercent(48.24)).toBe("48.2%");
        expect(formatPercent(21)).toBe("21.0%");
        expect(formatPercent(0.04)).toBe("<0.1%");
        expect(formatPercent(99.96)).toBe(">99.9%");
        expect(formatPercent(100)).toBe("100.0%");
    });
});
