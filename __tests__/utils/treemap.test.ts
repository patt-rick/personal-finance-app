import { layoutTreemap } from "../../src/utils/treemap";

const area = (r: { width: number; height: number }) => r.width * r.height;

describe("layoutTreemap", () => {
    it("gives each value an area proportional to its share and fills the box", () => {
        const rects = layoutTreemap([44, 14, 10, 10, 9, 13], 300, 200);
        expect(rects).toHaveLength(6);
        const total = 44 + 14 + 10 + 10 + 9 + 13;
        rects.forEach((r, i) => {
            expect(area(r)).toBeCloseTo(([44, 14, 10, 10, 9, 13][i] / total) * 300 * 200, 3);
            expect(r.x).toBeGreaterThanOrEqual(-1e-9);
            expect(r.y).toBeGreaterThanOrEqual(-1e-9);
            expect(r.x + r.width).toBeLessThanOrEqual(300 + 1e-9);
            expect(r.y + r.height).toBeLessThanOrEqual(200 + 1e-9);
        });
    });

    it("never overlaps tiles", () => {
        const rects = layoutTreemap([5, 4, 3, 2, 1], 320, 240);
        for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
                const a = rects[i];
                const b = rects[j];
                const overlapW = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
                const overlapH = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
                expect(overlapW <= 1e-6 || overlapH <= 1e-6).toBe(true);
            }
        }
    });

    it("keeps tiles close to square instead of thin slivers", () => {
        const rects = layoutTreemap([30, 25, 20, 15, 10], 320, 240);
        rects.forEach((r) => expect(Math.max(r.width / r.height, r.height / r.width)).toBeLessThan(3));
    });

    it("returns the whole box for one value and zero-size tiles for zero values", () => {
        expect(layoutTreemap([7], 100, 50)).toEqual([{ x: 0, y: 0, width: 100, height: 50 }]);
        const rects = layoutTreemap([10, 0], 100, 50);
        expect(area(rects[0])).toBeCloseTo(5000);
        expect(area(rects[1])).toBe(0);
        expect(layoutTreemap([], 100, 50)).toEqual([]);
    });
});
