import { Budget, BudgetLimits } from "../../types";
import { periodRange } from "./periods";

/** The limits in force for a period: the latest entry starting at or before it, or null before the budget existed. */
export function limitsForPeriod(budget: Budget, periodKey: string): BudgetLimits | null {
    let found: BudgetLimits | null = null;
    for (const l of budget.limits) if (l.periodStart <= periodKey) found = l;
    return found;
}

export function withLimits(budget: Budget, next: Omit<BudgetLimits, "periodStart">, now: Date): Budget {
    const periodStart = periodRange(budget.period, now).key;
    const limits = [...budget.limits.filter((l) => l.periodStart !== periodStart), { periodStart, ...next }].sort((a, b) =>
        a.periodStart.localeCompare(b.periodStart),
    );
    return { ...budget, limits, updatedAt: now.toISOString() };
}
