import { Budget } from "../../src/types";
import { limitsForPeriod, withLimits } from "../../src/features/budget/limits";
import { migrateBudgets } from "../../src/features/budget/migrate";
import { applyDraft, parseMoney, validateDraft } from "../../src/features/budget/setupModel";

const base: Budget = {
    id: "b1",
    scope: { kind: "cashbook", businessId: "a" },
    period: "monthly",
    limits: [
        { periodStart: "2026-05-01", totalLimit: 1800, categoryLimits: {} },
        { periodStart: "2026-08-01", totalLimit: 2000, categoryLimits: { f: 600 } },
    ],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
};

describe("limitsForPeriod", () => {
    it("uses the latest entry at or before the period", () => {
        expect(limitsForPeriod(base, "2026-06-01")?.totalLimit).toBe(1800);
        expect(limitsForPeriod(base, "2026-08-01")?.totalLimit).toBe(2000);
        expect(limitsForPeriod(base, "2026-10-01")?.totalLimit).toBe(2000);
    });

    it("returns null before the budget existed", () => {
        expect(limitsForPeriod(base, "2026-04-01")).toBeNull();
    });
});

describe("withLimits", () => {
    it("adds an entry for the current period and overwrites it on a second edit", () => {
        const now = new Date(2026, 9, 11);
        const once = withLimits(base, { totalLimit: 2500, categoryLimits: {} }, now);
        const twice = withLimits(once, { totalLimit: 2600, categoryLimits: {} }, now);
        expect(twice.limits.map((l) => [l.periodStart, l.totalLimit])).toEqual([
            ["2026-05-01", 1800],
            ["2026-08-01", 2000],
            ["2026-10-01", 2600],
        ]);
        expect(limitsForPeriod(twice, "2026-09-01")?.totalLimit).toBe(2000);
    });
});

const legacy = (over: Record<string, unknown> = {}) => ({
    id: "old1",
    businessId: "a",
    period: "monthly",
    totalLimit: 2000,
    categoryBudgets: { f: { limit: 600 }, z: { limit: 0 } },
    createdAt: new Date(2026, 2, 15).toISOString(),
    updatedAt: new Date(2026, 2, 15).toISOString(),
    ...over,
});

describe("migrateBudgets", () => {
    it("converts legacy budgets and drops zero category limits", () => {
        const { budgets, changed } = migrateBudgets([legacy()]);
        expect(changed).toBe(true);
        expect(budgets).toEqual([
            {
                id: "old1",
                scope: { kind: "cashbook", businessId: "a" },
                period: "monthly",
                limits: [{ periodStart: "2026-03-01", totalLimit: 2000, categoryLimits: { f: 600 } }],
                alerts: { enabled: true, warnAt: 80 },
                createdAt: legacy().createdAt,
                updatedAt: legacy().updatedAt,
            },
        ]);
    });

    it("is idempotent", () => {
        const once = migrateBudgets([legacy()]).budgets;
        expect(migrateBudgets(once)).toEqual({ budgets: once, changed: false });
    });

    it("dedupes one scope, keeping the newest", () => {
        const older = legacy({ id: "x", updatedAt: "2026-01-01T00:00:00.000Z" });
        const newer = legacy({ id: "y", updatedAt: "2026-02-01T00:00:00.000Z" });
        expect(migrateBudgets([older, newer]).budgets.map((b) => b.id)).toEqual(["y"]);
    });

    it("never drops a budget because its cashbook is unknown", () => {
        expect(migrateBudgets([legacy({ businessId: "ghost" })]).budgets).toHaveLength(1);
    });

    it("repairs a current-shape budget with bad alerts, limits or ordering", () => {
        const { budgets, changed } = migrateBudgets([
            {
                id: "n",
                scope: { kind: "currency", currency: "GHS" },
                period: "monthly",
                limits: [
                    { periodStart: "2026-09-01", totalLimit: 900, categoryLimits: { f: 100, z: -1 } },
                    { periodStart: "2026-05-01", totalLimit: 500 },
                    { periodStart: "bad", totalLimit: 1 },
                    { periodStart: "2026-06-01" },
                ],
                alerts: {},
                createdAt: "c",
                updatedAt: "u",
            },
        ]);
        expect(changed).toBe(true);
        expect(budgets[0].alerts).toEqual({ enabled: true, warnAt: 80 });
        expect(budgets[0].limits).toEqual([
            { periodStart: "2026-05-01", totalLimit: 500, categoryLimits: {} },
            { periodStart: "2026-09-01", totalLimit: 900, categoryLimits: { f: 100 } },
        ]);
    });

    it("tolerates non-arrays and junk entries", () => {
        expect(migrateBudgets(null).budgets).toEqual([]);
        expect(migrateBudgets([42, { nope: true }]).budgets).toEqual([]);
    });
});

describe("parseMoney", () => {
    it("accepts up to two decimals, separators and a trailing dot", () => {
        expect(parseMoney("2,000.5")).toBe(2000.5);
        expect(parseMoney("100.")).toBe(100);
        expect(parseMoney("12.345")).toBeNull();
        expect(parseMoney("")).toBeNull();
        expect(parseMoney("abc")).toBeNull();
    });
});

describe("validateDraft", () => {
    it("requires a positive total", () => {
        expect(validateDraft("0", [])).toEqual({ ok: false, error: { kind: "total" } });
    });

    it("requires each category amount", () => {
        expect(validateDraft("100", [{ id: "f", text: "" }])).toEqual({ ok: false, error: { kind: "category", id: "f" } });
    });

    it("rejects categories over the total, to the cent", () => {
        expect(validateDraft("100", [{ id: "f", text: "60" }, { id: "t", text: "40.01" }])).toEqual({
            ok: false,
            error: { kind: "over", allocated: 100.01 },
        });
        expect(validateDraft("100", [{ id: "f", text: "60" }, { id: "t", text: "40" }]).ok).toBe(true);
    });

    it("returns parsed limits", () => {
        expect(validateDraft("100", [{ id: "f", text: "60" }])).toEqual({
            ok: true,
            totalLimit: 100,
            categoryLimits: { f: 60 },
        });
    });
});

describe("applyDraft", () => {
    const now = new Date(2026, 9, 11);
    const draft = {
        period: "monthly" as const,
        totalLimit: 2000,
        categoryLimits: {},
        alerts: { enabled: true, warnAt: 80 as const },
    };

    it("creates a budget for the scope", () => {
        const b = applyDraft(null, { kind: "currency", currency: "GHS" }, draft, now, () => "id1");
        expect(b.limits).toEqual([{ periodStart: "2026-10-01", totalLimit: 2000, categoryLimits: {} }]);
        expect(b.scope).toEqual({ kind: "currency", currency: "GHS" });
    });

    it("resets history when the period type changes", () => {
        const existing = applyDraft(null, { kind: "cashbook", businessId: "a" }, draft, new Date(2026, 5, 1), () => "id1");
        const weekly = applyDraft(existing, existing.scope, { ...draft, period: "weekly" }, now, () => "x");
        expect(weekly.id).toBe("id1");
        expect(weekly.limits).toEqual([{ periodStart: "2026-10-05", totalLimit: 2000, categoryLimits: {} }]);
    });

    it("appends history otherwise", () => {
        const existing = applyDraft(null, { kind: "cashbook", businessId: "a" }, draft, new Date(2026, 5, 1), () => "id1");
        const edited = applyDraft(existing, existing.scope, { ...draft, totalLimit: 2500 }, now, () => "x");
        expect(edited.limits.map((l) => l.periodStart)).toEqual(["2026-06-01", "2026-10-01"]);
    });
});
