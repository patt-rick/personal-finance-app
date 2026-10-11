import { Budget, Business, Category, Transaction } from "../../src/types";
import { evaluateAlerts } from "../../src/features/budget/alerts/evaluateAlerts";
import { ledgerKey, pruneLedger } from "../../src/features/budget/alerts/ledgerKeys";
import { emitTransactionsSaved, onTransactionsSaved } from "../../src/utils/transactionEvents";

const businesses: Business[] = [
    { id: "a", name: "Main", currency: "GHS", createdAt: "" },
    { id: "b", name: "Shop", currency: "GHS", createdAt: "" },
];
const categories: Category[] = [{ id: "f", name: "Food", type: "expense" }];
const now = new Date(2026, 9, 20, 12);
const tx = (id: string, amount: number, over: Partial<Transaction> = {}): Transaction => ({
    id,
    description: "d",
    amount,
    category: "Food",
    date: new Date(2026, 9, 10).toISOString(),
    type: "expense",
    businessId: "a",
    ...over,
});
const book: Budget = {
    id: "B",
    scope: { kind: "cashbook", businessId: "a" },
    period: "monthly",
    limits: [{ periodStart: "2026-10-01", totalLimit: 1000, categoryLimits: { f: 600 } }],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "",
    updatedAt: "",
};
const global: Budget = {
    ...book,
    id: "G",
    scope: { kind: "currency", currency: "GHS" },
    limits: [{ periodStart: "2026-10-01", totalLimit: 1300, categoryLimits: {} }],
};
const run = (prev: Transaction[], next: Transaction[], budgets = [book], ledger: string[] = []) =>
    evaluateAlerts({ prev, next, budgets, businesses, categories, ledger: new Set(ledger), now });

describe("evaluateAlerts", () => {
    it("fires when a category crosses the warn threshold", () => {
        const r = run([tx("1", 400)], [tx("1", 400), tx("2", 86.2)]);
        expect(r.lines).toEqual(["Food in Main passed 80% · ₵ 486.20 of ₵ 600.00"]);
        expect(r.recorded).toEqual(["B|2026-10-01|f|80"]);
    });

    it("does not fire twice for the same period", () => {
        expect(run([tx("1", 400)], [tx("1", 400), tx("2", 90)], [book], ["B|2026-10-01|f|80"]).lines).toEqual([]);
    });

    it("shows only the limit message when one save crosses both, but records both", () => {
        const r = run([], [tx("1", 1000, { category: "Rent" })]);
        expect(r.lines).toEqual(["Main reached the limit · ₵ 1,000.00 of ₵ 1,000.00"]);
        expect(r.recorded.sort()).toEqual(["B|2026-10-01|total|100", "B|2026-10-01|total|80"]);
    });

    it("never fires for pre-existing spend, deletes or reductions", () => {
        expect(run([tx("1", 900)], [tx("1", 900), tx("x", 5, { type: "income" })]).lines).toEqual([]);
        expect(run([tx("1", 900), tx("2", 50)], [tx("1", 900)]).lines).toEqual([]);
        expect(run([tx("1", 900)], [tx("1", 700)]).lines).toEqual([]);
    });

    it("stays silent for thresholds a lowered limit already left behind", () => {
        const lowered = { ...book, limits: [{ periodStart: "2026-10-01", totalLimit: 500, categoryLimits: {} }] };
        expect(run([tx("1", 900)], [tx("1", 900), tx("2", 10)], [lowered]).lines).toEqual([]);
    });

    it("combines a cashbook and a global crossing from one save", () => {
        const shop = tx("s", 300, { businessId: "b", category: "Rent" });
        const r = run([tx("1", 700), shop], [tx("1", 700), shop, tx("2", 120, { category: "Rent" })], [book, global]);
        expect(r.lines).toEqual([
            "Main passed 80% · ₵ 820.00 of ₵ 1,000.00",
            "All ₵ cashbooks passed 80% · ₵ 1,120.00 of ₵ 1,300.00",
        ]);
    });

    it("ignores disabled budgets, periods without limits and changes outside the current period", () => {
        expect(run([], [tx("1", 2000)], [{ ...book, alerts: { enabled: false, warnAt: 80 } }]).lines).toEqual([]);
        const future = { ...book, limits: [{ periodStart: "2026-11-01", totalLimit: 10, categoryLimits: {} }] };
        expect(run([], [tx("1", 2000)], [future]).lines).toEqual([]);
        expect(run([], [tx("1", 2000, { date: new Date(2026, 8, 10).toISOString() })]).lines).toEqual([]);
    });
});

describe("pruneLedger", () => {
    it("keeps current and previous period keys of existing budgets only", () => {
        const keys = [
            ledgerKey("B", "2026-10-01", "total", 80),
            ledgerKey("B", "2026-09-01", "f", 100),
            ledgerKey("B", "2026-08-01", "f", 80),
            ledgerKey("X", "2026-10-01", "total", 80),
        ];
        expect(pruneLedger(keys, [book], now)).toEqual(keys.slice(0, 2));
    });
});

describe("transactionEvents", () => {
    it("delivers to listeners, isolates throwing ones and unsubscribes", () => {
        const seen: number[] = [];
        const off = onTransactionsSaved((_p, n) => seen.push(n.length));
        const offBad = onTransactionsSaved(() => {
            throw new Error("boom");
        });
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});
        emitTransactionsSaved([], [tx("1", 1)]);
        off();
        offBad();
        emitTransactionsSaved([], []);
        expect(seen).toEqual([1]);
        spy.mockRestore();
    });
});
