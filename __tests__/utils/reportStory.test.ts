import {
    buildPeriodSummary,
    buildMonthOverMonth,
    heroCopy,
    changeSentence,
    buildKeptCurve,
} from "../../src/utils/reportStory";
import { Transaction } from "../../src/types";

let seq = 0;
const tx = (p: Partial<Transaction>): Transaction => ({
    id: `t${seq++}`,
    description: "x",
    amount: 0,
    date: "2026-10-05T10:00:00.000Z",
    type: "expense",
    businessId: "b1",
    ...p,
});

const fmt = (n: number) => `GHS ${n}`;

describe("buildPeriodSummary", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    const end = new Date("2026-10-31T23:59:59.000Z");

    it("sums income, gross expense and fees inside the range only", () => {
        const s = buildPeriodSummary(
            [
                tx({ type: "income", amount: 1000 }),
                tx({ type: "expense", amount: 300, fee: 5 }),
                tx({ type: "expense", amount: 200 }),
                tx({ type: "expense", amount: 999, date: "2026-09-30T23:00:00.000Z" }),
                tx({ type: "income", amount: 999, date: "2026-11-01T00:00:01.000Z" }),
            ],
            start,
            end,
        );
        expect(s).toEqual({ income: 1000, expense: 505, net: 495, fees: 5 });
    });

    it("rounds away float dust so an even month reads as even", () => {
        const s = buildPeriodSummary(
            [
                tx({ type: "income", amount: 30.3 }),
                tx({ type: "expense", amount: 10.1 }),
                tx({ type: "expense", amount: 20.2 }),
            ],
            start,
            end,
        );
        expect(s.net).toBe(0);
        expect(heroCopy(s, fmt).tone).toBe("even");
    });

    it("includes transactions exactly on the range boundaries", () => {
        const s = buildPeriodSummary(
            [
                tx({ type: "income", amount: 10, date: start.toISOString() }),
                tx({ type: "income", amount: 20, date: end.toISOString() }),
            ],
            start,
            end,
        );
        expect(s.income).toBe(30);
    });
});

describe("buildMonthOverMonth", () => {
    const now = new Date(2026, 9, 10, 12, 0);

    it("compares this month so far with the same days of last month", () => {
        const m = buildMonthOverMonth(
            [
                tx({ type: "income", amount: 1100, date: new Date(2026, 9, 2).toISOString() }),
                tx({ type: "expense", amount: 400, fee: 0, date: new Date(2026, 9, 3).toISOString() }),
                tx({ type: "income", amount: 1000, date: new Date(2026, 8, 2).toISOString() }),
                tx({ type: "expense", amount: 500, date: new Date(2026, 8, 3).toISOString() }),
                tx({ type: "expense", amount: 9999, date: new Date(2026, 8, 20).toISOString() }),
                tx({ type: "expense", amount: 9999, date: new Date(2026, 7, 3).toISOString() }),
            ],
            now,
        );
        expect(m).toEqual({
            income: { current: 1100, previous: 1000 },
            spending: { current: 400, previous: 500 },
            net: { current: 700, previous: 500 },
        });
    });

    it("clamps to the end of a shorter previous month", () => {
        const m = buildMonthOverMonth(
            [tx({ type: "income", amount: 5, date: new Date(2026, 1, 28, 20).toISOString() })],
            new Date(2026, 2, 31, 9),
        );
        expect(m.income.previous).toBe(5);
    });
});

describe("heroCopy", () => {
    it("tells how much was kept from what came in", () => {
        expect(heroCopy({ income: 500, expense: 300, net: 200, fees: 0 }, fmt)).toEqual({
            tone: "kept",
            lead: "You kept",
            amount: 200,
            tail: "of the GHS 500 that came in.",
        });
    });

    it("tells how much more went out than came in", () => {
        expect(heroCopy({ income: 500, expense: 800, net: -300, fees: 0 }, fmt)).toEqual({
            tone: "overspent",
            lead: "You spent",
            amount: 300,
            tail: "more than the GHS 500 that came in.",
        });
    });

    it("handles spending with no income", () => {
        expect(heroCopy({ income: 0, expense: 80, net: -80, fees: 0 }, fmt)).toMatchObject({
            tone: "overspent",
            amount: 80,
            tail: "with no income recorded.",
        });
    });

    it("handles income with no spending", () => {
        expect(heroCopy({ income: 70, expense: 0, net: 70, fees: 0 }, fmt)).toMatchObject({
            tone: "kept",
            amount: 70,
            tail: "and spent nothing.",
        });
    });

    it("handles breaking even", () => {
        expect(heroCopy({ income: 90, expense: 90, net: 0, fees: 0 }, fmt)).toMatchObject({
            tone: "even",
            lead: "You spent all",
            amount: 90,
            tail: "that came in.",
        });
    });
});

describe("changeSentence", () => {
    const pair = (current: number, previous: number) => ({ current, previous });

    it("explains missing history", () => {
        expect(changeSentence("spending", pair(10, 0))).toEqual({
            text: "No spending last month to compare with.",
            direction: "flat",
            good: null,
        });
    });

    it("treats tiny changes as no change", () => {
        expect(changeSentence("income", pair(1003, 1000)).text).toBe("Income is about the same as last month.");
    });

    it("judges lower spending as good and higher income as good", () => {
        expect(changeSentence("spending", pair(876, 1000))).toEqual({
            text: "Spending is 12% lower than last month.",
            direction: "down",
            good: true,
        });
        expect(changeSentence("income", pair(108, 100))).toMatchObject({
            text: "Income is 8% higher than last month.",
            direction: "up",
            good: true,
        });
        expect(changeSentence("net", pair(80, 100)).good).toBe(false);
    });

    it("tells the story when net flips sign instead of quoting a percentage", () => {
        expect(changeSentence("net", pair(500, -500))).toMatchObject({ direction: "up", good: true });
        expect(changeSentence("net", pair(500, -500)).text).not.toMatch(/%/);
        expect(changeSentence("net", pair(-200, 300))).toMatchObject({ direction: "down", good: false });
    });

    it("describes overspending in both months by the size of the overspend", () => {
        expect(changeSentence("net", pair(-50, -100))).toEqual({
            text: "You're overspending 50% less than last month.",
            direction: "up",
            good: true,
        });
        expect(changeSentence("net", pair(-150, -100)).text).toBe("You're overspending 50% more than last month.");
    });

    it("calls out breaking even", () => {
        expect(changeSentence("net", pair(0, -100))).toMatchObject({ direction: "flat", good: true });
    });
});

describe("buildKeptCurve", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    const end = new Date("2026-10-11T00:00:00.000Z");

    it("runs from zero to the period net, stepping when money moves", () => {
        const curve = buildKeptCurve(
            [
                tx({ type: "income", amount: 1000, date: "2026-10-02T12:00:00.000Z" }),
                tx({ type: "expense", amount: 300, fee: 5, date: "2026-10-06T12:00:00.000Z" }),
            ],
            start,
            end,
            10,
        );
        expect(curve).toHaveLength(11);
        expect(curve[0]).toBe(0);
        expect(curve[1]).toBe(0);
        expect(curve[2]).toBe(1000);
        expect(curve[5]).toBe(1000);
        expect(curve[6]).toBe(695);
        expect(curve[10]).toBe(695);
    });

    it("ignores transactions outside the period and can go below zero", () => {
        const curve = buildKeptCurve(
            [
                tx({ type: "income", amount: 5000, date: "2026-09-30T23:00:00.000Z" }),
                tx({ type: "expense", amount: 40, date: "2026-10-03T00:00:00.000Z" }),
                tx({ type: "income", amount: 5000, date: "2026-10-12T00:00:00.000Z" }),
            ],
            start,
            end,
            10,
        );
        expect(curve[10]).toBe(-40);
        expect(Math.max(...curve)).toBe(0);
    });

    it("returns a flat line for an empty or zero-length period", () => {
        expect(buildKeptCurve([], start, end, 4)).toEqual([0, 0, 0, 0, 0]);
        expect(buildKeptCurve([tx({ type: "income", amount: 10, date: start.toISOString() })], start, start, 4)).toEqual([
            10, 10, 10, 10, 10,
        ]);
    });
});
