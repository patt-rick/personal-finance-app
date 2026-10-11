import { Budget, Business, Category, Transaction } from "../../src/types";
import { buildPeriodView, paceChip, summaryLines } from "../../src/features/budget/dashboardModel";
import { periodRange } from "../../src/features/budget/periods";
import { budgetHistory } from "../../src/features/budget/history";
import { computePace } from "../../src/features/budget/pace";
import { budgetColour } from "../../src/features/budget/colour";

const businesses: Business[] = [{ id: "a", name: "Main", currency: "GHS", createdAt: "2026-01-01T00:00:00.000Z" }];
const categories: Category[] = [
    { id: "f", name: "Food", type: "expense" },
    { id: "t", name: "Transport", type: "expense" },
    { id: "r", name: "Rent", type: "expense" },
    { id: "a", name: "Airtime", type: "expense" },
];
const tx = (amount: number, category?: string, day = 5, fee?: number, month = 9): Transaction => ({
    id: `${amount}-${category}-${day}-${month}`,
    description: "d",
    amount,
    fee,
    category,
    date: new Date(2026, month, day, 12).toISOString(),
    type: "expense",
    businessId: "a",
});
const budget: Budget = {
    id: "b",
    scope: { kind: "cashbook", businessId: "a" },
    period: "monthly",
    limits: [
        { periodStart: "2026-07-01", totalLimit: 1800, categoryLimits: {} },
        { periodStart: "2026-09-01", totalLimit: 2000, categoryLimits: { f: 600, t: 400, gone: 50 } },
    ],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "",
    updatedAt: "",
};
const now = new Date(2026, 9, 20, 12);
const oct = periodRange("monthly", now);

describe("computePace", () => {
    const start = periodRange("monthly", new Date(2026, 9, 1));

    it("is ahead when usage beats elapsed by more than 2 points", () => {
        const p = computePace(1668.9, 2000, start, now, "monthly");
        expect(p.verdict).toBe("ahead");
        expect(p.delta).toBeCloseTo(83.445 - (20 / 31) * 100, 3);
        expect(p.forecast).toBeCloseTo((1668.9 / 20) * 31, 6);
        expect(p.daysLeft).toBe(12);
        expect(p.perDay).toBeCloseTo(331.1 / 12, 6);
    });

    it("is on pace within 2 points above, on track at or below", () => {
        expect(computePace(1310, 2000, start, now, "monthly").verdict).toBe("on-pace");
        expect(computePace(1000, 2000, start, now, "monthly").verdict).toBe("on-track");
    });

    it("is over only past the limit; exactly at the limit is not over", () => {
        expect(computePace(2000, 2000, start, now, "monthly").verdict).toBe("ahead");
        const over = computePace(2100, 2000, start, now, "monthly");
        expect(over.verdict).toBe("over");
        expect(over.perDay).toBe(0);
    });

    it("hides the forecast early in the period", () => {
        expect(computePace(100, 2000, start, new Date(2026, 9, 3), "monthly").forecast).toBeNull();
        expect(computePace(100, 2000, start, new Date(2026, 9, 4), "monthly").forecast).not.toBeNull();
        const year = periodRange("yearly", new Date(2026, 0, 20));
        expect(computePace(100, 2000, year, new Date(2026, 0, 20), "yearly").forecast).toBeNull();
    });
});

describe("budgetColour", () => {
    const palette = { income: "#3E7049", gold: "#8C6A14", expense: "#A8392E" };

    it("holds income until warnAt − 20, gold at warnAt, expense at 100+", () => {
        expect(budgetColour(0, 80, palette)).toBe("#3e7049");
        expect(budgetColour(60, 80, palette)).toBe("#3e7049");
        expect(budgetColour(80, 80, palette)).toBe("#8c6a14");
        expect(budgetColour(100, 80, palette)).toBe("#a8392e");
        expect(budgetColour(250, 80, palette)).toBe("#a8392e");
    });

    it("moves the gold point with the threshold and blends between stops", () => {
        expect(budgetColour(70, 70, palette)).toBe("#8c6a14");
        expect(budgetColour(50, 70, palette)).toBe("#3e7049");
        expect(budgetColour(90, 80, palette)).toBe("#9a5221");
    });
});

describe("buildPeriodView", () => {
    const txs = [
        tx(760, "Food"),
        tx(340.1, "Transport"),
        tx(470, "Rent"),
        tx(30, "Transfer"),
        tx(28, "Airtime"),
        tx(12, undefined),
        tx(20, "Food", 6, 8.8),
    ];
    const view = buildPeriodView(budget, txs, businesses, categories, oct, now);

    it("breaks spend down by every category, limits first, and rows sum to the total", () => {
        expect(view.limit).toBe(2000);
        expect(view.spent).toBeCloseTo(1668.9, 6);
        expect(view.rows.map((r) => [r.key, r.kind])).toEqual([
            ["f", "limit"],
            ["t", "limit"],
            ["r", "category"],
            ["name:Transfer", "category"],
            ["a", "category"],
            ["__uncategorised", "uncategorised"],
            ["__fees", "fees"],
        ]);
        expect(view.rows.reduce((s, r) => s + r.spent, 0)).toBeCloseTo(view.spent, 6);
        expect(view.pace?.verdict).toBe("ahead");
    });

    it("produces chip and summary copy", () => {
        expect(paceChip(view, "₵")).toEqual({ tone: "warning", icon: "ahead", text: "Ahead of pace · +18.9%" });
        expect(summaryLines(view, "₵", "October")).toEqual({
            sentence: { before: "You have ", amount: "₵ 331.10", after: " left for 12 days, about ₵ 27.59 a day." },
            forecast: "At this rate you'll reach ₵ 2,586.80 by 31 Oct.",
        });
    });

    it("has no pace for a past period and no limit before the budget", () => {
        const june = periodRange("monthly", new Date(2026, 5, 10));
        expect(buildPeriodView(budget, txs, businesses, categories, june, now).limit).toBeNull();
        const aug = periodRange("monthly", new Date(2026, 7, 10));
        const past = buildPeriodView(budget, [tx(1900, "Food", 3, undefined, 7)], businesses, categories, aug, now);
        expect(past.pace).toBeNull();
        expect(paceChip(past, "₵")).toEqual({ tone: "error", icon: "over", text: "Finished ₵ 100.00 over" });
        expect(summaryLines(past, "₵", "August").sentence).toEqual({
            before: "August finished ",
            amount: "₵ 100.00 over",
            after: " your ₵ 1,800.00 limit.",
        });
    });
});

describe("budgetHistory", () => {
    it("returns six periods with the limit in force or null", () => {
        const points = budgetHistory(budget, [tx(100, "Food", 3, undefined, 8)], businesses, categories, now, 6);
        expect(points.map((p) => p.limit)).toEqual([null, null, 1800, 1800, 2000, 2000]);
        expect(points[4].spent).toBe(100);
        expect(points[5].current).toBe(true);
        expect(points[4].current).toBe(false);
    });
});
