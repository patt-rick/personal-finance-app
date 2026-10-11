import { Business, BudgetScope, Transaction } from "../../types";
import { reportCurrencies } from "../../utils/reportCurrency";
import { businessIdsForScope } from "./scope";

/** Currency scopes (busiest first) come before the individual cashbooks. */
export function availableScopes(businesses: Business[], transactions: Transaction[]): BudgetScope[] {
    return [
        ...reportCurrencies(businesses, transactions).map((c): BudgetScope => ({ kind: "currency", currency: c.code })),
        ...businesses.map((b): BudgetScope => ({ kind: "cashbook", businessId: b.id })),
    ];
}

export function resolveScopeSelection(
    previous: BudgetScope | null,
    openCashbook: Business | null,
    businesses: Business[],
): BudgetScope | null {
    if (openCashbook && businesses.some((b) => b.id === openCashbook.id)) {
        return { kind: "cashbook", businessId: openCashbook.id };
    }
    if (previous && businessIdsForScope(previous, businesses).size > 0) return previous;
    return businesses[0] ? { kind: "cashbook", businessId: businesses[0].id } : null;
}
