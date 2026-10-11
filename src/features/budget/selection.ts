import { Business, BudgetScope, Transaction } from "../../types";
import { reportCurrencies } from "../../utils/reportCurrency";
import { cashbookCurrency } from "../../utils/transfers";
import { businessIdsForScope, scopeCurrency } from "./scope";

export interface BudgetSelection {
    currency: string;
    scope: BudgetScope;
}

/** The chips for one currency: its global budget first, then each of its cashbooks. */
export function scopesForCurrency(currency: string, businesses: Business[]): BudgetScope[] {
    return [
        { kind: "currency", currency },
        ...businesses
            .filter((b) => cashbookCurrency(b) === currency)
            .map((b): BudgetScope => ({ kind: "cashbook", businessId: b.id })),
    ];
}

export function selectCurrency(currency: string, businesses: Business[]): BudgetSelection {
    const first = businesses.find((b) => cashbookCurrency(b) === currency);
    return { currency, scope: first ? { kind: "cashbook", businessId: first.id } : { kind: "currency", currency } };
}

export function resolveBudgetSelection(
    previous: BudgetSelection | null,
    openCashbook: Business | null,
    businesses: Business[],
    transactions: Transaction[],
): BudgetSelection | null {
    const open = openCashbook ? businesses.find((b) => b.id === openCashbook.id) : undefined;
    if (open) return { currency: cashbookCurrency(open), scope: { kind: "cashbook", businessId: open.id } };
    if (previous && businessIdsForScope(previous.scope, businesses).size > 0) {
        return { scope: previous.scope, currency: scopeCurrency(previous.scope, businesses) };
    }
    const codes = reportCurrencies(businesses, transactions).map((c) => c.code);
    const currency = previous && codes.includes(previous.currency) ? previous.currency : codes[0];
    return currency ? selectCurrency(currency, businesses) : null;
}
