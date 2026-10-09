import { Transaction } from "../types";
import { grossAmount } from "./transactionAmount";

// Float sums like 30.3 - (10.1 + 20.2) leave dust that would flip "kept" / "overspent" copy.
const cents = (n: number) => Math.round(n * 100) / 100;

export interface PeriodSummary {
    income: number;
    expense: number;
    net: number;
    fees: number;
}

export function buildPeriodSummary(transactions: Transaction[], start: Date, end: Date): PeriodSummary {
    let income = 0;
    let expense = 0;
    let fees = 0;
    for (const t of transactions) {
        const td = new Date(t.date);
        if (td < start || td > end) continue;
        if (t.type === "income") {
            income += t.amount;
        } else {
            expense += grossAmount(t);
            fees += t.fee ?? 0;
        }
    }
    return { income: cents(income), expense: cents(expense), net: cents(income - expense), fees: cents(fees) };
}

export type ChangeMetric = "income" | "spending" | "net";

export interface MetricPair {
    current: number;
    previous: number;
}

export type MonthOverMonth = Record<ChangeMetric, MetricPair>;

/** This month so far against the same span of days last month, so a part month never meets a full one. */
export function buildMonthOverMonth(transactions: Transaction[], now: Date = new Date()): MonthOverMonth {
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sameDayLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
    );
    const lastEnd = sameDayLastMonth < thisStart ? sameDayLastMonth : new Date(thisStart.getTime() - 1);
    const current = buildPeriodSummary(transactions, thisStart, now);
    const previous = buildPeriodSummary(transactions, lastStart, lastEnd);
    return {
        income: { current: current.income, previous: previous.income },
        spending: { current: current.expense, previous: previous.expense },
        net: { current: current.net, previous: previous.net },
    };
}

export interface HeroCopy {
    tone: "kept" | "overspent" | "even";
    lead: string;
    amount: number;
    tail: string;
}

export function heroCopy(summary: PeriodSummary, format: (n: number) => string): HeroCopy {
    const { income, expense, net } = summary;
    if (net > 0) {
        return {
            tone: "kept",
            lead: "You kept",
            amount: net,
            tail: expense === 0 ? "and spent nothing." : `of the ${format(income)} that came in.`,
        };
    }
    if (net < 0) {
        return {
            tone: "overspent",
            lead: "You spent",
            amount: income === 0 ? expense : -net,
            tail: income === 0 ? "with no income recorded." : `more than the ${format(income)} that came in.`,
        };
    }
    return { tone: "even", lead: "You spent all", amount: income, tail: "that came in." };
}

export interface ChangeSentence {
    text: string;
    direction: "up" | "down" | "flat";
    good: boolean | null;
}

const METRIC_LABEL: Record<ChangeMetric, string> = {
    income: "Income",
    spending: "Spending",
    net: "What you kept",
};

const NO_HISTORY: Record<ChangeMetric, string> = {
    income: "No income last month to compare with.",
    spending: "No spending last month to compare with.",
    net: "Nothing kept or overspent last month to compare with.",
};

export function changeSentence(metric: ChangeMetric, { current, previous }: MetricPair): ChangeSentence {
    if (previous === 0) return { text: NO_HISTORY[metric], direction: "flat", good: null };
    if (metric === "net" && previous < 0 && current > 0) {
        return { text: "You're keeping money again after overspending last month.", direction: "up", good: true };
    }
    if (metric === "net" && previous > 0 && current < 0) {
        return { text: "You've spent more than came in, after keeping money last month.", direction: "down", good: false };
    }
    if (metric === "net" && current === 0) {
        return { text: "You've broken even so far this month.", direction: "flat", good: previous < 0 };
    }
    if (metric === "net" && previous < 0 && current < 0) {
        const shift = Math.round(Math.abs((current - previous) / previous) * 100);
        if (shift === 0) return { text: "You're overspending about as much as last month.", direction: "flat", good: null };
        const less = current > previous;
        return {
            text: `You're overspending ${shift.toLocaleString()}% ${less ? "less" : "more"} than last month.`,
            direction: less ? "up" : "down",
            good: less,
        };
    }
    const change = ((current - previous) / Math.abs(previous)) * 100;
    const label = METRIC_LABEL[metric];
    const rounded = Math.round(Math.abs(change));
    if (rounded === 0) {
        return { text: `${label} is about the same as last month.`, direction: "flat", good: null };
    }
    const up = change > 0;
    return {
        text: `${label} is ${rounded.toLocaleString()}% ${up ? "higher" : "lower"} than last month.`,
        direction: up ? "up" : "down",
        good: metric === "spending" ? !up : up,
    };
}
