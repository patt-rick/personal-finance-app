import { Business, Transaction } from "../types";
import { cashbookCurrency } from "./transfers";

export interface ReportCurrency {
    code: string;
    cashbooks: string[];
}

/** The currencies the user's cashbooks use, busiest first (most transactions, then most cashbooks). */
export function reportCurrencies(businesses: Business[], transactions: Transaction[]): ReportCurrency[] {
    const cashbooks = new Map<string, string[]>();
    const currencyOf = new Map<string, string>();
    for (const b of businesses) {
        const code = cashbookCurrency(b);
        currencyOf.set(b.id, code);
        cashbooks.set(code, [...(cashbooks.get(code) ?? []), b.name]);
    }
    const activity = new Map<string, number>();
    for (const t of transactions) {
        const code = currencyOf.get(t.businessId);
        if (code) activity.set(code, (activity.get(code) ?? 0) + 1);
    }
    return [...cashbooks.entries()]
        .map(([code, names]) => ({ code, cashbooks: names }))
        .sort(
            (a, b) =>
                (activity.get(b.code) ?? 0) - (activity.get(a.code) ?? 0) ||
                b.cashbooks.length - a.cashbooks.length ||
                a.code.localeCompare(b.code),
        );
}
