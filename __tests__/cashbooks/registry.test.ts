import { CASHBOOK_COLORS } from "../../src/features/cashbooks/appearance/palette";
import {
    CASHBOOK_ICON_NODES,
    CASHBOOK_ICON_KEYS,
} from "../../src/features/cashbooks/appearance/icons.data";
import { DEFAULT_CASHBOOK_ICON } from "../../src/features/cashbooks/appearance/resolve";

describe("cashbook appearance registry", () => {
    it("palette entries are all valid 6-digit hex and unique", () => {
        const seen = new Set<string>();
        for (const c of CASHBOOK_COLORS) {
            expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(seen.has(c)).toBe(false);
            seen.add(c);
        }
        expect(CASHBOOK_COLORS.length).toBeGreaterThanOrEqual(8);
    });

    it("every icon key maps to a non-empty iconNode", () => {
        expect(CASHBOOK_ICON_KEYS.length).toBeGreaterThanOrEqual(8);
        for (const key of CASHBOOK_ICON_KEYS) {
            const nodes = CASHBOOK_ICON_NODES[key];
            expect(Array.isArray(nodes)).toBe(true);
            expect(nodes.length).toBeGreaterThan(0);
        }
    });

    it("includes the default icon", () => {
        expect(CASHBOOK_ICON_KEYS).toContain(DEFAULT_CASHBOOK_ICON);
    });
});
