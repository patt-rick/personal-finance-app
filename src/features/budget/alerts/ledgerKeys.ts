import { Budget } from "../../../types";
import { periodRange, previousPeriod } from "../periods";

export const ledgerKey = (budgetId: string, periodKey: string, target: string, threshold: number): string =>
    `${budgetId}|${periodKey}|${target}|${threshold}`;

/** Keeps entries for existing budgets from the previous period onward. */
export function pruneLedger(keys: string[], budgets: Budget[], now: Date): string[] {
    const cutoff = new Map(budgets.map((b) => [b.id, previousPeriod(b.period, periodRange(b.period, now)).key]));
    return [...new Set(keys)].filter((k) => {
        const [id, periodKey] = k.split("|");
        const from = cutoff.get(id);
        return from !== undefined && periodKey >= from;
    });
}
