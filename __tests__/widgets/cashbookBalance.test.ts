import { Transaction } from "../../src/types";
import { computeCashbookBalance, computeMonthFlows } from "../../src/utils/cashbookBalance";

const tx = (over: Partial<Transaction>): Transaction => ({
    id: "t",
    description: "d",
    amount: 0,
    date: "2026-08-05T10:00:00.000Z",
    type: "expense",
    businessId: "b1",
    ...over,
});

describe("computeCashbookBalance", () => {
    it("nets income minus expense for the given cashbook only", () => {
        const txns = [
            tx({ id: "1", type: "income", amount: 100, businessId: "b1" }),
            tx({ id: "2", type: "expense", amount: 30, businessId: "b1" }),
            tx({ id: "3", type: "income", amount: 999, businessId: "b2" }),
        ];
        expect(computeCashbookBalance(txns, "b1")).toBe(70);
    });

    it("returns 0 for a cashbook with no transactions", () => {
        expect(computeCashbookBalance([], "b1")).toBe(0);
    });
});

describe("computeMonthFlows", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");

    it("sums income and expense within the current month for the cashbook", () => {
        const txns = [
            tx({ id: "1", type: "income", amount: 200, date: "2026-08-02T00:00:00.000Z" }),
            tx({ id: "2", type: "expense", amount: 50, date: "2026-08-10T00:00:00.000Z" }),
            tx({ id: "3", type: "expense", amount: 999, date: "2026-07-31T00:00:00.000Z" }),
            tx({ id: "4", type: "income", amount: 999, businessId: "b2", date: "2026-08-05T00:00:00.000Z" }),
        ];
        expect(computeMonthFlows(txns, "b1", now)).toEqual({ income: 200, expense: 50 });
    });
});
