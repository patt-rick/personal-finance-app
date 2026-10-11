import { Budget, Business, Category, Transaction } from "../../../types";
import { exactMoney } from "../../../utils/chartScale";
import { parseTxDate } from "../dates";
import { limitsForPeriod } from "../limits";
import { inPeriod, periodRange } from "../periods";
import { businessIdsForScope, scopeName, scopeSymbol } from "../scope";
import { computePeriodSpend, expenseCategoryIndex } from "../spend";
import { ledgerKey } from "./ledgerKeys";

export interface EvaluateInput {
    prev: Transaction[];
    next: Transaction[];
    budgets: Budget[];
    businesses: Business[];
    categories: Category[];
    ledger: ReadonlySet<string>;
    now: Date;
}

export interface EvaluateResult {
    lines: string[];
    recorded: string[];
}

/** Every added or removed transaction, and both versions of every edited one. */
function changedTransactions(prev: Transaction[], next: Transaction[]): Transaction[] {
    const before = new Map(prev.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const out: Transaction[] = [];
    for (const t of next) {
        seen.add(t.id);
        const old = before.get(t.id);
        if (!old) out.push(t);
        else if (old !== t && JSON.stringify(old) !== JSON.stringify(t)) out.push(old, t);
    }
    for (const t of prev) if (!seen.has(t.id)) out.push(t);
    return out;
}

const cents = (v: number) => Math.round(v * 100);

/** A threshold fires only when this save carries spend across it, and only once per budget, period and target. */
export function evaluateAlerts(input: EvaluateInput): EvaluateResult {
    const { prev, next, budgets, businesses, categories, ledger, now } = input;
    const result: EvaluateResult = { lines: [], recorded: [] };
    const active = budgets.filter((b) => b.alerts.enabled);
    if (active.length === 0) return result;
    const changed = changedTransactions(prev, next).filter((t) => t.type === "expense");
    if (changed.length === 0) return result;
    const index = expenseCategoryIndex(categories);
    const names = new Map(categories.filter((c) => c.type === "expense").map((c) => [c.id, c.name]));

    for (const budget of active) {
        const range = periodRange(budget.period, now);
        const limits = limitsForPeriod(budget, range.key);
        if (!limits) continue;
        const ids = businessIdsForScope(budget.scope, businesses);
        if (!changed.some((t) => ids.has(t.businessId) && inPeriod(parseTxDate(t.date), range))) continue;
        const limited = Object.entries(limits.categoryLimits).filter(([id]) => names.has(id));
        const limitedIds = new Set(limited.map(([id]) => id));
        const before = computePeriodSpend(prev, businesses, budget.scope, range, index, limitedIds);
        const after = computePeriodSpend(next, businesses, budget.scope, range, index, limitedIds);
        const scope = scopeName(budget.scope, businesses);
        const symbol = scopeSymbol(budget.scope, businesses);
        const targets = [
            { key: "total", label: scope, limit: limits.totalLimit, from: before.total, to: after.total },
            ...limited.map(([id, limit]) => ({
                key: id,
                label: `${names.get(id)} in ${scope}`,
                limit,
                from: before.byCategory.get(id) ?? 0,
                to: after.byCategory.get(id) ?? 0,
            })),
        ];
        for (const target of targets) {
            const lc = cents(target.limit);
            if (lc <= 0) continue;
            const crossed = [budget.alerts.warnAt, 100].filter(
                (th) =>
                    cents(target.from) * 100 < th * lc &&
                    cents(target.to) * 100 >= th * lc &&
                    !ledger.has(ledgerKey(budget.id, range.key, target.key, th)),
            );
            if (crossed.length === 0) continue;
            crossed.forEach((th) => result.recorded.push(ledgerKey(budget.id, range.key, target.key, th)));
            const top = Math.max(...crossed);
            const verb = top >= 100 ? "reached its limit" : `passed ${top}%`;
            result.lines.push(
                `${target.label} ${verb} · ${exactMoney(target.to, symbol)} of ${exactMoney(target.limit, symbol)}`,
            );
        }
    }
    return result;
}
