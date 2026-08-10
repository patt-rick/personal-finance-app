import { iconNodeToSvg, cashbookIconSvg } from "../../src/features/cashbooks/appearance/iconSvg";

describe("iconNodeToSvg", () => {
    it("wraps nodes in a Lucide-style svg with the given stroke", () => {
        const svg = iconNodeToSvg([["path", { d: "M1 2" }]], "#FF0000", 20);
        expect(svg).toContain('stroke="#FF0000"');
        expect(svg).toContain('viewBox="0 0 24 24"');
        expect(svg).toContain('width="20"');
        expect(svg).toContain('<path d="M1 2" />');
        expect(svg.startsWith("<svg")).toBe(true);
    });
});

describe("cashbookIconSvg", () => {
    it("renders a known icon with the stroke color", () => {
        const svg = cashbookIconSvg("wallet", "#26A69A");
        expect(svg).toContain('stroke="#26A69A"');
        expect(svg).toContain("<path");
    });

    it("falls back to the default icon for an unknown key", () => {
        expect(cashbookIconSvg("does-not-exist", "#000000")).toBe(
            cashbookIconSvg("wallet", "#000000"),
        );
    });
});
