import { Business, BudgetScope } from "../../types";
import { cashbookCurrency } from "../../utils/transfers";
import { getCurrencySymbol } from "../../utils/_helpers";

export const scopeKey = (s: BudgetScope): string =>
    s.kind === "cashbook" ? `cashbook:${s.businessId}` : `currency:${s.currency}`;

export const sameScope = (a: BudgetScope, b: BudgetScope): boolean => scopeKey(a) === scopeKey(b);

export function businessIdsForScope(scope: BudgetScope, businesses: Business[]): Set<string> {
    return new Set(
        businesses
            .filter((b) =>
                scope.kind === "cashbook" ? b.id === scope.businessId : cashbookCurrency(b) === scope.currency,
            )
            .map((b) => b.id),
    );
}

export function scopeCurrency(scope: BudgetScope, businesses: Business[]): string {
    if (scope.kind === "currency") return scope.currency;
    const book = businesses.find((b) => b.id === scope.businessId);
    return book ? cashbookCurrency(book) : "USD";
}

export const scopeSymbol = (scope: BudgetScope, businesses: Business[]): string =>
    getCurrencySymbol(scopeCurrency(scope, businesses));

/** getCurrencySymbol falls back to "$" for codes it doesn't know, so those read as their code instead. */
export const currencyLabel = (code: string): string => {
    const symbol = getCurrencySymbol(code);
    return symbol === "$" && code !== "USD" ? code : symbol;
};

export function scopeName(scope: BudgetScope, businesses: Business[]): string {
    if (scope.kind === "currency") return `All ${currencyLabel(scope.currency)} cashbooks`;
    return businesses.find((b) => b.id === scope.businessId)?.name ?? "Cashbook";
}
