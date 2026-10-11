import { Business, Category, Transaction } from "../../src/types";
import { businessIdsForScope, currencyLabel, scopeName } from "../../src/features/budget/scope";
import { computePeriodSpend, expenseCategoryIndex } from "../../src/features/budget/spend";
import { periodRange } from "../../src/features/budget/periods";

const biz = (id: string, currency?: string, name = id): Business => ({
    id,
    name,
    currency,
    createdAt: "2026-01-01T00:00:00.000Z",
});
let seq = 0;
const tx = (over: Partial<Transaction>): Transaction => ({
    id: `t${seq++}`,
    description: "d",
    amount: 0,
    date: new Date(2026, 9, 5, 12).toISOString(),
    type: "expense",
    businessId: "a",
    ...over,
});
const businesses = [biz("a", "GHS", "Main"), biz("b", "GHS", "Shop"), biz("c", "USD"), biz("d")];
const categories: Category[] = [
    { id: "f", name: "Food", type: "expense" },
    { id: "f2", name: "food ", type: "expense" },
    { id: "fi", name: "Food", type: "income" },
    { id: "t", name: "Transport", type: "expense" },
];
const oct = periodRange("monthly", new Date(2026, 9, 11));
const index = expenseCategoryIndex(categories);

describe("scope", () => {
    it("covers one cashbook or every book in a currency, with no-currency books as USD", () => {
        expect([...businessIdsForScope({ kind: "cashbook", businessId: "a" }, businesses)]).toEqual(["a"]);
        expect([...businessIdsForScope({ kind: "currency", currency: "GHS" }, businesses)]).toEqual(["a", "b"]);
        expect([...businessIdsForScope({ kind: "currency", currency: "USD" }, businesses)]).toEqual(["c", "d"]);
    });

    it("names scopes", () => {
        expect(scopeName({ kind: "cashbook", businessId: "a" }, businesses)).toBe("Main");
        expect(scopeName({ kind: "currency", currency: "GHS" }, businesses)).toBe("All ₵ cashbooks");
        expect(currencyLabel("KES")).toBe("KES");
        expect(currencyLabel("USD")).toBe("$");
    });
});

describe("expenseCategoryIndex", () => {
    it("matches expense names trimmed and case-insensitively, first in list wins", () => {
        expect(index.get("food")).toBe("f");
        expect(index.get("transport")).toBe("t");
    });
});

describe("computePeriodSpend", () => {
    it("counts gross totals, net category spend, fees and everything else", () => {
        const txs = [
            tx({ amount: 100, fee: 2, category: "FOOD" }),
            tx({ amount: 50, category: "Transport" }),
            tx({ amount: 30, category: "Rent" }),
            tx({ amount: 20 }),
            tx({ amount: 999, type: "income", category: "Food" }),
            tx({ amount: 70, date: new Date(2026, 8, 30).toISOString(), category: "Food" }),
        ];
        const s = computePeriodSpend(txs, businesses, { kind: "cashbook", businessId: "a" }, oct, index, new Set(["f"]));
        expect(s.total).toBe(202);
        expect(s.fees).toBe(2);
        expect(s.byCategory.get("f")).toBe(100);
        expect(s.other).toBe(100);
        expect(s.total).toBe([...s.byCategory.values()].reduce((a, b) => a + b, 0) + s.other + s.fees);
    });

    it("places a bare recurring date on its local day", () => {
        const txs = [tx({ amount: 15, date: "2026-10-01" }), tx({ amount: 9, date: "2026-09-30" })];
        expect(computePeriodSpend(txs, businesses, { kind: "cashbook", businessId: "a" }, oct, index, new Set()).total).toBe(15);
    });

    it("keeps other books out of a cashbook scope and pulls them into a currency scope", () => {
        const txs = [tx({ amount: 10 }), tx({ amount: 5, businessId: "b" }), tx({ amount: 7, businessId: "c" })];
        expect(computePeriodSpend(txs, businesses, { kind: "cashbook", businessId: "a" }, oct, index, new Set()).total).toBe(10);
        expect(computePeriodSpend(txs, businesses, { kind: "currency", currency: "GHS" }, oct, index, new Set()).total).toBe(15);
    });

    it("drops internal transfer principals in a currency scope but keeps their fees, like Reports", () => {
        const txs = [
            tx({ amount: 200, fee: 3, transferId: "x", category: "Transfer" }),
            tx({ amount: 200, type: "income", businessId: "b", transferId: "x", category: "Transfer" }),
        ];
        const global = computePeriodSpend(txs, businesses, { kind: "currency", currency: "GHS" }, oct, index, new Set());
        expect(global.total).toBe(3);
        expect(global.fees).toBe(3);
        const book = computePeriodSpend(txs, businesses, { kind: "cashbook", businessId: "a" }, oct, index, new Set());
        expect(book.total).toBe(203);
    });

    it("keeps a transfer half whose other side was deleted", () => {
        const txs = [tx({ amount: 40, transferId: "y" })];
        expect(computePeriodSpend(txs, businesses, { kind: "currency", currency: "GHS" }, oct, index, new Set()).total).toBe(40);
    });
});
