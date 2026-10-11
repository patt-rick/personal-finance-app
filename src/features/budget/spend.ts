import { Business, BudgetScope, Category, Transaction } from "../../types";
import { excludeInternalTransfers } from "../../utils/transfers";
import { businessIdsForScope } from "./scope";
import { inPeriod, PeriodRange } from "./periods";
import { parseTxDate } from "./dates";

const norm = (s: string) => s.trim().toLowerCase();

/** Sums run in whole cents so a total that lands exactly on a limit compares as equal. */
const toCents = (v: number) => Math.round(v * 100);

/** Expense category name → id; names compare trimmed and case-insensitively, the first in list order wins. */
export function expenseCategoryIndex(categories: Category[]): Map<string, string> {
    const index = new Map<string, string>();
    for (const c of categories) {
        if (c.type !== "expense") continue;
        const k = norm(c.name);
        if (!index.has(k)) index.set(k, c.id);
    }
    return index;
}

export interface PeriodSpend {
    total: number;
    byCategory: Map<string, number>;
    other: number;
    fees: number;
}

export function computePeriodSpend(
    transactions: Transaction[],
    businesses: Business[],
    scope: BudgetScope,
    range: PeriodRange,
    categoryIndex: Map<string, string>,
    limitedIds: ReadonlySet<string>,
): PeriodSpend {
    const ids = businessIdsForScope(scope, businesses);
    const scoped = excludeInternalTransfers(transactions.filter((t) => ids.has(t.businessId)));
    let total = 0;
    let fees = 0;
    let other = 0;
    const byCategory = new Map<string, number>();
    for (const t of scoped) {
        if (t.type !== "expense" || !inPeriod(parseTxDate(t.date), range)) continue;
        const amount = toCents(t.amount);
        const fee = toCents(t.fee ?? 0);
        total += amount + fee;
        fees += fee;
        const id = t.category ? categoryIndex.get(norm(t.category)) : undefined;
        if (id && limitedIds.has(id)) byCategory.set(id, (byCategory.get(id) ?? 0) + amount);
        else other += amount;
    }
    return {
        total: total / 100,
        fees: fees / 100,
        other: other / 100,
        byCategory: new Map([...byCategory].map(([id, cents]) => [id, cents / 100])),
    };
}
