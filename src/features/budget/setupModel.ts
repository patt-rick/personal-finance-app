import { Budget, BudgetPeriod, BudgetScope, BudgetWarnAt } from "../../types";
import { periodRange } from "./periods";
import { withLimits } from "./limits";

export interface BudgetDraft {
    period: BudgetPeriod;
    totalLimit: number;
    categoryLimits: Record<string, number>;
    alerts: { enabled: boolean; warnAt: BudgetWarnAt };
}

export type DraftError = { kind: "total" } | { kind: "category"; id: string } | { kind: "over"; allocated: number };

export const MONEY_INPUT = /^(\d[\d,]*\.?\d{0,2})?$/;

export function parseMoney(text: string): number | null {
    const clean = text.replace(/,/g, "").trim().replace(/\.$/, "");
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
    return Math.round(parseFloat(clean) * 100) / 100;
}

export function validateDraft(
    totalText: string,
    categories: { id: string; text: string }[],
): { ok: true; totalLimit: number; categoryLimits: Record<string, number> } | { ok: false; error: DraftError } {
    const total = parseMoney(totalText);
    if (total === null || total <= 0) return { ok: false, error: { kind: "total" } };
    const categoryLimits: Record<string, number> = {};
    let allocatedCents = 0;
    for (const c of categories) {
        const v = parseMoney(c.text);
        if (v === null || v <= 0) return { ok: false, error: { kind: "category", id: c.id } };
        categoryLimits[c.id] = v;
        allocatedCents += Math.round(v * 100);
    }
    if (allocatedCents > Math.round(total * 100)) {
        return { ok: false, error: { kind: "over", allocated: allocatedCents / 100 } };
    }
    return { ok: true, totalLimit: total, categoryLimits };
}

export function applyDraft(
    existing: Budget | null,
    scope: BudgetScope,
    draft: BudgetDraft,
    now: Date,
    makeId: () => string,
): Budget {
    const fresh = [
        { periodStart: periodRange(draft.period, now).key, totalLimit: draft.totalLimit, categoryLimits: draft.categoryLimits },
    ];
    const iso = now.toISOString();
    if (!existing) {
        return { id: makeId(), scope, period: draft.period, limits: fresh, alerts: draft.alerts, createdAt: iso, updatedAt: iso };
    }
    if (existing.period !== draft.period) {
        return { ...existing, period: draft.period, limits: fresh, alerts: draft.alerts, updatedAt: iso };
    }
    return {
        ...withLimits(existing, { totalLimit: draft.totalLimit, categoryLimits: draft.categoryLimits }, now),
        alerts: draft.alerts,
    };
}
