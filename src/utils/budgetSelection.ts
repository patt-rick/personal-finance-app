import { Business } from "../types";

export function resolveBudgetSelection(
    previous: Business | null,
    openCashbook: Business | null,
    businesses: Business[],
): Business | null {
    const byId = (id: string | undefined) => (id ? businesses.find((b) => b.id === id) : undefined);
    return byId(openCashbook?.id) ?? byId(previous?.id) ?? businesses[0] ?? null;
}
