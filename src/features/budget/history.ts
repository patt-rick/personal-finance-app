import { Budget, Business, Category, Transaction } from "../../types";
import { limitsForPeriod } from "./limits";
import { isCurrentPeriod, PeriodRange, recentPeriods } from "./periods";
import { computePeriodSpend, expenseCategoryIndex } from "./spend";

export interface HistoryPoint {
    range: PeriodRange;
    spent: number;
    limit: number | null;
    current: boolean;
}

export function budgetHistory(
    budget: Budget,
    transactions: Transaction[],
    businesses: Business[],
    categories: Category[],
    now: Date,
    count = 6,
): HistoryPoint[] {
    const index = expenseCategoryIndex(categories);
    const none = new Set<string>();
    return recentPeriods(budget.period, now, count).map((range) => ({
        range,
        spent: computePeriodSpend(transactions, businesses, budget.scope, range, index, none).total,
        limit: limitsForPeriod(budget, range.key)?.totalLimit ?? null,
        current: isCurrentPeriod(range, now),
    }));
}
