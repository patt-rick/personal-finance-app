import { Budget, BudgetLimits, BudgetPeriod, BudgetWarnAt, LegacyBudget } from "../../types";
import { periodRange } from "./periods";
import { scopeKey } from "./scope";

const PERIODS: BudgetPeriod[] = ["weekly", "monthly", "yearly"];

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

const WARN_AT: BudgetWarnAt[] = [70, 80, 90];

const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function cleanCategoryLimits(raw: unknown): Record<string, number> {
    const out: Record<string, number> = {};
    if (!isObj(raw)) return out;
    for (const [id, v] of Object.entries(raw)) if (positive(v)) out[id] = v;
    return out;
}

/** Validates a stored budget in the current shape, repairing what it safely can; null means it isn't one. */
function normaliseBudget(x: unknown): Budget | null {
    if (!isObj(x) || typeof x.id !== "string" || !isObj(x.scope)) return null;
    const scope = x.scope;
    const scopeOk =
        (scope.kind === "cashbook" && typeof scope.businessId === "string") ||
        (scope.kind === "currency" && typeof scope.currency === "string");
    if (!scopeOk || !PERIODS.includes(x.period as BudgetPeriod) || !Array.isArray(x.limits)) return null;
    const limits: BudgetLimits[] = x.limits
        .filter(
            (l): l is Record<string, unknown> =>
                isObj(l) && typeof l.periodStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.periodStart) && positive(l.totalLimit),
        )
        .map((l) => ({
            periodStart: l.periodStart as string,
            totalLimit: l.totalLimit as number,
            categoryLimits: cleanCategoryLimits(l.categoryLimits),
        }))
        .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
    if (limits.length === 0) return null;
    const alerts = isObj(x.alerts) ? x.alerts : {};
    return {
        id: x.id,
        scope: scope.kind === "cashbook" ? { kind: "cashbook", businessId: scope.businessId as string } : { kind: "currency", currency: scope.currency as string },
        period: x.period as BudgetPeriod,
        limits,
        alerts: {
            enabled: typeof alerts.enabled === "boolean" ? alerts.enabled : true,
            warnAt: WARN_AT.includes(alerts.warnAt as BudgetWarnAt) ? (alerts.warnAt as BudgetWarnAt) : 80,
        },
        createdAt: typeof x.createdAt === "string" ? x.createdAt : "",
        updatedAt: typeof x.updatedAt === "string" ? x.updatedAt : "",
    };
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
        const current = normaliseBudget(item);
        if (current) {
            converted.push(current);
            if (JSON.stringify(current) !== JSON.stringify(item)) changed = true;
        } else if (isLegacy(item)) {
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
