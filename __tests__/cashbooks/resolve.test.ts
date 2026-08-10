import { CASHBOOK_COLORS } from "../../src/features/cashbooks/appearance/palette";
import {
    resolveCashbookColor,
    resolveCashbookIconKey,
    DEFAULT_CASHBOOK_ICON,
    withAlpha,
} from "../../src/features/cashbooks/appearance/resolve";

describe("resolveCashbookColor", () => {
    it("returns the stored color when it is a valid hex", () => {
        expect(resolveCashbookColor({ id: "x", color: "#123456" })).toBe("#123456");
    });

    it("ignores an invalid stored color and falls back deterministically", () => {
        const a = resolveCashbookColor({ id: "b1", color: "not-a-color" });
        const b = resolveCashbookColor({ id: "b1", color: undefined });
        expect(a).toBe(b);
        expect(CASHBOOK_COLORS).toContain(a);
    });

    it("is deterministic per id and varies across ids", () => {
        expect(resolveCashbookColor({ id: "b1" })).toBe(resolveCashbookColor({ id: "b1" }));
        // Two ids that hash to different buckets
        expect(resolveCashbookColor({ id: "aaaa" })).not.toBe(
            resolveCashbookColor({ id: "aaab" }),
        );
    });
});

describe("resolveCashbookIconKey", () => {
    it("defaults to wallet when unset", () => {
        expect(resolveCashbookIconKey({})).toBe(DEFAULT_CASHBOOK_ICON);
        expect(DEFAULT_CASHBOOK_ICON).toBe("wallet");
    });
});

describe("withAlpha", () => {
    it("prefixes an alpha byte and keeps the last 6 hex digits", () => {
        expect(withAlpha("#7E57C2", "22")).toBe("#227E57C2");
        expect(withAlpha("#FF7E57C2", "22")).toBe("#227E57C2");
    });
});
