import { BudgetPeriod } from "../../types";
import { addDays, calendarDaysBetween, startOfDay, toLocalISODate } from "./dates";

export interface PeriodRange {
    start: Date;
    end: Date;
    key: string;
}

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export const monthName = (d: Date): string => MONTHS[d.getMonth()];

export const shortMonthName = (d: Date): string => MONTHS[d.getMonth()].slice(0, 3);

const make = (start: Date, end: Date): PeriodRange => ({ start, end, key: toLocalISODate(start) });

export function periodRange(period: BudgetPeriod, at: Date): PeriodRange {
    const y = at.getFullYear();
    const m = at.getMonth();
    if (period === "weekly") {
        const start = addDays(startOfDay(at), -((at.getDay() + 6) % 7));
        return make(start, addDays(start, 7));
    }
    if (period === "monthly") return make(new Date(y, m, 1), new Date(y, m + 1, 1));
    return make(new Date(y, 0, 1), new Date(y + 1, 0, 1));
}

export const previousPeriod = (period: BudgetPeriod, r: PeriodRange): PeriodRange =>
    periodRange(period, addDays(r.start, -1));

export const nextPeriod = (period: BudgetPeriod, r: PeriodRange): PeriodRange => periodRange(period, r.end);

export function recentPeriods(period: BudgetPeriod, now: Date, count: number): PeriodRange[] {
    const out = [periodRange(period, now)];
    while (out.length < count) out.unshift(previousPeriod(period, out[0]));
    return out;
}

export const daysInPeriod = (r: PeriodRange): number => calendarDaysBetween(r.start, r.end);

export const inPeriod = (date: Date, r: PeriodRange): boolean => date >= r.start && date < r.end;

export const isCurrentPeriod = (r: PeriodRange, now: Date): boolean => inPeriod(now, r);

export function daysElapsed(r: PeriodRange, now: Date): number {
    return Math.min(daysInPeriod(r), Math.max(1, calendarDaysBetween(r.start, now) + 1));
}

export const daysLeft = (r: PeriodRange, now: Date): number => daysInPeriod(r) - daysElapsed(r, now) + 1;

export const periodNoun = (period: BudgetPeriod): string =>
    period === "weekly" ? "week" : period === "monthly" ? "month" : "year";

export const periodAdjective = (period: BudgetPeriod): string =>
    period === "weekly" ? "Weekly" : period === "monthly" ? "Monthly" : "Yearly";

export function formatPeriodLabel(period: BudgetPeriod, r: PeriodRange): string {
    if (period === "yearly") return String(r.start.getFullYear());
    if (period === "monthly") return `${monthName(r.start)} ${r.start.getFullYear()}`;
    const last = addDays(r.end, -1);
    return r.start.getMonth() === last.getMonth()
        ? `${r.start.getDate()}–${last.getDate()} ${shortMonthName(last)}`
        : `${r.start.getDate()} ${shortMonthName(r.start)} – ${last.getDate()} ${shortMonthName(last)}`;
}

/** The name a period is talked about by: "October", "5–11 Oct", "2026". */
export const periodName = (period: BudgetPeriod, r: PeriodRange): string =>
    period === "monthly" ? monthName(r.start) : formatPeriodLabel(period, r);

export const formatPeriodShort = (period: BudgetPeriod, r: PeriodRange): string =>
    period === "yearly"
        ? String(r.start.getFullYear())
        : period === "monthly"
          ? shortMonthName(r.start)
          : `${r.start.getDate()} ${shortMonthName(r.start)}`;
