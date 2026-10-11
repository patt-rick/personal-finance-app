import { BudgetPeriod } from "../../types";
import { daysElapsed, daysInPeriod, daysLeft, PeriodRange } from "./periods";

export type PaceVerdict = "on-track" | "on-pace" | "ahead" | "over";

export interface Pace {
    verdict: PaceVerdict;
    usedPct: number;
    elapsedPct: number;
    delta: number;
    forecast: number | null;
    perDay: number;
    daysLeft: number;
}

/** Assumes even spending across the period; the forecast is withheld while too few days have passed to mean anything. */
export function computePace(spent: number, limit: number, range: PeriodRange, now: Date, period: BudgetPeriod): Pace {
    const elapsed = daysElapsed(range, now);
    const total = daysInPeriod(range);
    const usedPct = (spent / limit) * 100;
    const elapsedPct = (elapsed / total) * 100;
    const delta = usedPct - elapsedPct;
    const left = daysLeft(range, now);
    const verdict: PaceVerdict = spent > limit ? "over" : delta > 2 ? "ahead" : delta > 0 ? "on-pace" : "on-track";
    const tooEarly = period === "yearly" ? now.getMonth() === range.start.getMonth() : elapsed <= 3;
    return {
        verdict,
        usedPct,
        elapsedPct,
        delta,
        forecast: tooEarly ? null : (spent / elapsed) * total,
        perDay: Math.max(0, limit - spent) / left,
        daysLeft: left,
    };
}
