import { compactMoney, exactMoney, niceCeil } from "../../src/utils/chartScale";

describe("niceCeil", () => {
    it("rounds up to a readable axis maximum", () => {
        expect(niceCeil(610)).toBe(700);
        expect(niceCeil(410)).toBe(500);
        expect(niceCeil(12345)).toBe(15000);
        expect(niceCeil(2000)).toBe(2000);
        expect(niceCeil(0.4)).toBe(1);
    });

    it("falls back to 1 for empty data", () => {
        expect(niceCeil(0)).toBe(1);
        expect(niceCeil(-5)).toBe(1);
    });
});

describe("compactMoney", () => {
    it("shortens thousands and millions", () => {
        expect(compactMoney(950, "₵")).toBe("₵950");
        expect(compactMoney(12400, "₵")).toBe("₵12.4k");
        expect(compactMoney(3000, "₵")).toBe("₵3k");
        expect(compactMoney(2_500_000, "$")).toBe("$2.5m");
    });

    it("rolls over to the next unit instead of showing 1000k", () => {
        expect(compactMoney(999.6, "₵")).toBe("₵1k");
        expect(compactMoney(999_960, "₵")).toBe("₵1m");
    });
});

describe("exactMoney", () => {
    it("rounds to the cent instead of truncating", () => {
        expect(exactMoney(15929.77, "₵")).toBe("₵ 15,929.77");
        expect(exactMoney(15929.999, "₵")).toBe("₵ 15,930.00");
        expect(exactMoney(-2.5, "$")).toBe("-$ 2.50");
        expect(exactMoney(7, "")).toBe("7.00");
        expect(exactMoney(-0.001, "₵")).toBe("₵ 0.00");
    });
});
