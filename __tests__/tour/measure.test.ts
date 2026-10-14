import { needsScroll } from "../../src/features/tour/measure";

const band = { top: 40, bottom: 700 };

describe("needsScroll", () => {
    it("leaves a visible target alone when the card fits below or above it", () => {
        expect(needsScroll({ x: 0, y: 60, width: 300, height: 300 }, band, 200)).toBe(false);
        expect(needsScroll({ x: 0, y: 400, width: 300, height: 280 }, band, 200)).toBe(false);
    });

    it("scrolls a target that is partly outside the band", () => {
        expect(needsScroll({ x: 0, y: 650, width: 300, height: 100 }, band, 200)).toBe(true);
        expect(needsScroll({ x: 0, y: 10, width: 300, height: 100 }, band, 200)).toBe(true);
    });

    it("scrolls a visible target that leaves no room for the card on either side", () => {
        expect(needsScroll({ x: 0, y: 200, width: 300, height: 400 }, band, 200)).toBe(true);
    });

    it("treats exactly enough room as enough", () => {
        expect(needsScroll({ x: 0, y: 240, width: 300, height: 300 }, band, 200)).toBe(false);
        expect(needsScroll({ x: 0, y: 200, width: 300, height: 444 }, band, 200)).toBe(true);
        expect(needsScroll({ x: 0, y: 200, width: 300, height: 445 }, band, 200)).toBe(false);
    });

    it("does not scroll a visible target too tall to ever leave room for the card", () => {
        expect(needsScroll({ x: 0, y: 100, width: 300, height: 500 }, band, 200)).toBe(false);
    });
});
