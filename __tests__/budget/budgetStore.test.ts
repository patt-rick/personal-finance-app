jest.mock("@react-native-async-storage/async-storage", () => {
    let store: Record<string, string> = {};
    return {
        __esModule: true,
        default: {
            getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
            setItem: jest.fn(async (k: string, v: string) => {
                store[k] = v;
            }),
            removeItem: jest.fn(async (k: string) => {
                delete store[k];
            }),
            __reset: () => {
                store = {};
            },
        },
    };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Budget, Business } from "../../src/types";
import {
    deleteBudgetsForBusinesses,
    loadBudgets,
    persistBudgetMigration,
    removeCategoryFromBudgets,
    upsertBudget,
} from "../../src/features/budget/storage/budgetStore";
import { loadLedger, saveLedger } from "../../src/features/budget/alerts/ledger";
import { resolveBudgetSelection, scopesForCurrency, selectCurrency } from "../../src/features/budget/selection";

const KEY = "@budgets";
const budget = (id: string, businessId: string, categoryLimits: Record<string, number> = { f: 10 }): Budget => ({
    id,
    scope: { kind: "cashbook", businessId },
    period: "monthly",
    limits: [{ periodStart: "2026-10-01", totalLimit: 100, categoryLimits }],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
});

beforeEach(() => (AsyncStorage as unknown as { __reset: () => void }).__reset());

describe("budgetStore", () => {
    it("migrates on read without writing, and writes back on request", async () => {
        await AsyncStorage.setItem(
            KEY,
            JSON.stringify([{ id: "o", businessId: "a", period: "monthly", totalLimit: 5, categoryBudgets: {} }]),
        );
        expect((await loadBudgets())[0].scope).toEqual({ kind: "cashbook", businessId: "a" });
        expect(JSON.parse((await AsyncStorage.getItem(KEY))!)[0].businessId).toBe("a");
        await persistBudgetMigration();
        expect(JSON.parse((await AsyncStorage.getItem(KEY))!)[0].scope.kind).toBe("cashbook");
    });

    it("rejects a second budget for the same scope but allows editing the same one", async () => {
        expect(await upsertBudget(budget("1", "a"))).toBe("ok");
        expect(await upsertBudget(budget("2", "a"))).toBe("duplicate");
        expect(await upsertBudget({ ...budget("1", "a"), period: "weekly" })).toBe("ok");
        expect((await loadBudgets()).map((b) => b.period)).toEqual(["weekly"]);
    });

    it("refuses to write when stored budgets are unreadable", async () => {
        await AsyncStorage.setItem(KEY, "{not json");
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});
        expect(await upsertBudget(budget("1", "a"))).toBe("error");
        spy.mockRestore();
        expect(await AsyncStorage.getItem(KEY)).toBe("{not json");
    });

    it("removes cashbook budgets with their ledger entries, and category limits", async () => {
        await upsertBudget(budget("1", "a"));
        await upsertBudget(budget("2", "b"));
        await saveLedger(["1|2026-10-01|total|80", "2|2026-10-01|total|80"]);
        await deleteBudgetsForBusinesses(["a"]);
        await removeCategoryFromBudgets("f");
        const left = await loadBudgets();
        expect(left.map((b) => b.id)).toEqual(["2"]);
        expect(left[0].limits[0].categoryLimits).toEqual({});
        expect(await loadLedger()).toEqual(["2|2026-10-01|total|80"]);
    });
});

const biz = (id: string, currency = "GHS"): Business => ({ id, name: id, currency, createdAt: "2026-01-01T00:00:00.000Z" });
const books = [biz("a"), biz("b"), biz("c", "USD")];

describe("selection", () => {
    it("lists a currency's global scope first, then only that currency's cashbooks", () => {
        expect(scopesForCurrency("GHS", books)).toEqual([
            { kind: "currency", currency: "GHS" },
            { kind: "cashbook", businessId: "a" },
            { kind: "cashbook", businessId: "b" },
        ]);
    });

    it("re-derives the currency when the selected cashbook's currency changes", () => {
        const moved = [biz("a"), biz("b", "USD"), biz("c", "USD")];
        expect(resolveBudgetSelection({ currency: "GHS", scope: { kind: "cashbook", businessId: "b" } }, null, moved, [])).toEqual({
            currency: "USD",
            scope: { kind: "cashbook", businessId: "b" },
        });
    });

    it("switching currency lands on that currency's first cashbook", () => {
        expect(selectCurrency("USD", books)).toEqual({ currency: "USD", scope: { kind: "cashbook", businessId: "c" } });
    });

    it("follows the open cashbook, keeps a valid pick, and otherwise falls back within the busiest currency", () => {
        expect(resolveBudgetSelection(null, biz("c", "USD"), books, [])).toEqual({
            currency: "USD",
            scope: { kind: "cashbook", businessId: "c" },
        });
        const global = { currency: "USD", scope: { kind: "currency" as const, currency: "USD" } };
        expect(resolveBudgetSelection(global, null, books, [])).toEqual(global);
        expect(resolveBudgetSelection({ currency: "USD", scope: { kind: "cashbook", businessId: "gone" } }, null, books, [])).toEqual({
            currency: "USD",
            scope: { kind: "cashbook", businessId: "c" },
        });
        expect(resolveBudgetSelection(null, null, books, [])).toEqual({ currency: "GHS", scope: { kind: "cashbook", businessId: "a" } });
        expect(resolveBudgetSelection(null, null, [], [])).toBeNull();
    });
});
