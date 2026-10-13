import { placeTooltip } from "../../src/features/tour/placement";

const screen = { width: 360, height: 760 };
const bounds = { top: 40, bottom: 660 };
const tooltip = { width: 300, height: 150 };
const place = (target: { x: number; y: number; width: number; height: number } | null) =>
    placeTooltip({ target, tooltip, screen, bounds });

describe("placeTooltip", () => {
    it("sits below the target when there is room", () => {
        expect(place({ x: 30, y: 100, width: 300, height: 120 })).toEqual({
            top: 232,
            left: 30,
            arrowX: 150,
            side: "below",
        });
    });

    it("flips above when the card would cross the bottom bound", () => {
        const placement = place({ x: 30, y: 560, width: 300, height: 60 });
        expect(placement.side).toBe("above");
        expect(placement.top).toBe(560 - 12 - 150);
    });

    it("overlaps the lower part of a target too tall to clear on either side", () => {
        const placement = place({ x: 20, y: 150, width: 320, height: 420 });
        expect(placement).toMatchObject({ side: "over", top: 510, arrowX: null });
    });

    it("keeps the card inside the side margins and the arrow on the target", () => {
        const left = place({ x: 0, y: 100, width: 40, height: 40 });
        expect(left.left).toBe(16);
        expect(left.arrowX).toBe(24);

        const right = place({ x: 310, y: 100, width: 40, height: 40 });
        expect(right.left).toBe(44);
        expect(right.arrowX).toBe(276);
    });

    it("centres the card when there is no target", () => {
        expect(place(null)).toEqual({ top: 275, left: 30, arrowX: null, side: "center" });
    });
});
