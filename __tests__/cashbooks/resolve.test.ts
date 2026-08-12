import { CASHBOOK_COLORS } from "../../src/features/cashbooks/appearance/palette";
import {
    resolveCashbookColor,
    resolveCashbookIconKey,
    DEFAULT_CASHBOOK_ICON,
    withAlpha,
    readableOn,
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

    it("returns a stored key that exists in the registry", () => {
        expect(resolveCashbookIconKey({ icon: "shopping-cart" })).toBe("shopping-cart");
    });

    it("falls back to the default for an unknown stored key", () => {
        expect(resolveCashbookIconKey({ icon: "totally-unknown" })).toBe(DEFAULT_CASHBOOK_ICON);
    });
});

describe("withAlpha", () => {
    it("prefixes an alpha byte and keeps the last 6 hex digits", () => {
        expect(withAlpha("#7E57C2", "22")).toBe("#227E57C2");
        expect(withAlpha("#FF7E57C2", "22")).toBe("#227E57C2");
    });
});

describe("readableOn", () => {
    it("uses white text on dark fills and dark text on light fills", () => {
        expect(readableOn("#000000")).toBe("#FFFFFF");
        expect(readableOn("#FFFFFF")).toBe("#1A1A1A");
    });

    it("keeps mid-tone palette accents legible", () => {
        expect(readableOn("#42A5F5")).toBe("#FFFFFF"); // blue reads as dark
        expect(readableOn("#FFA726")).toBe("#1A1A1A"); // orange reads as light
    });

    it("ignores a leading alpha byte and reads the RGB channels", () => {
        expect(readableOn("#22FFA726")).toBe("#1A1A1A");
    });
});
