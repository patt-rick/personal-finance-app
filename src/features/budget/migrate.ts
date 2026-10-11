import { Budget, BudgetPeriod, LegacyBudget } from "../../types";
import { periodRange } from "./periods";
import { scopeKey } from "./scope";

const PERIODS: BudgetPeriod[] = ["weekly", "monthly", "yearly"];

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

function isBudget(x: unknown): x is Budget {
    if (!isObj(x) || typeof x.id !== "string" || !isObj(x.scope) || !isObj(x.alerts)) return false;
    const scope = x.scope;
    const scopeOk =
        (scope.kind === "cashbook" && typeof scope.businessId === "string") ||
        (scope.kind === "currency" && typeof scope.currency === "string");
    return scopeOk && PERIODS.includes(x.period as BudgetPeriod) && Array.isArray(x.limits) && x.limits.length > 0;
}

function isLegacy(x: unknown): x is LegacyBudget {
    return (
        isObj(x) &&
        typeof x.id === "string" &&
        typeof x.businessId === "string" &&
        typeof x.totalLimit === "number" &&
        PERIODS.includes(x.period as BudgetPeriod)
    );
}

function fromLegacy(old: LegacyBudget): Budget {
    const created = old.createdAt && !isNaN(Date.parse(old.createdAt)) ? new Date(old.createdAt) : new Date();
    const categoryLimits: Record<string, number> = {};
    for (const [id, entry] of Object.entries(old.categoryBudgets ?? {})) {
        const limit = entry?.limit;
        if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) categoryLimits[id] = limit;
    }
    const createdAt = old.createdAt ?? created.toISOString();
    return {
        id: old.id,
        scope: { kind: "cashbook", businessId: old.businessId },
        period: old.period,
        limits: [{ periodStart: periodRange(old.period, created).key, totalLimit: old.totalLimit, categoryLimits }],
        alerts: { enabled: true, warnAt: 80 },
        createdAt,
        updatedAt: old.updatedAt ?? createdAt,
    };
}

/** Pure and idempotent; never drops a well-formed budget, only junk entries and duplicate scopes (newest kept). */
export function migrateBudgets(raw: unknown): { budgets: Budget[]; changed: boolean } {
    if (!Array.isArray(raw)) return { budgets: [], changed: false };
    let changed = false;
    const converted: Budget[] = [];
    for (const item of raw) {
        if (isBudget(item)) converted.push(item);
        else if (isLegacy(item)) {
            converted.push(fromLegacy(item));
            changed = true;
        } else changed = true;
    }
    const byScope = new Map<string, Budget>();
    for (const b of converted) {
        const key = scopeKey(b.scope);
        const kept = byScope.get(key);
        if (!kept) byScope.set(key, b);
        else {
            changed = true;
            if (b.updatedAt > kept.updatedAt) byScope.set(key, b);
        }
    }
    return { budgets: [...byScope.values()], changed };
}
