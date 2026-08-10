import { Transaction } from "../types";

export const computeCashbookBalance = (
    transactions: Transaction[],
    businessId: string,
): number =>
    transactions
        .filter((t) => t.businessId === businessId)
        .reduce((sum, t) => (t.type === "income" ? sum + t.amount : sum - t.amount), 0);

export const computeMonthFlows = (
    transactions: Transaction[],
    businessId: string,
    now: Date = new Date(),
): { income: number; expense: number } => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
        if (t.businessId !== businessId) continue;
        const d = new Date(t.date);
        if (d < start || d > now) continue;
        if (t.type === "income") income += t.amount;
        else expense += t.amount;
    }
    return { income, expense };
};
