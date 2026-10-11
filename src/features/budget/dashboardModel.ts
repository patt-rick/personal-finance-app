import { Budget, Business, Category, Transaction } from "../../types";
import { exactMoney } from "../../utils/chartScale";
import { formatPercent } from "../../utils/categoryTiles";
import { FEES_CATEGORY_LABEL } from "../../utils/transactionAmount";
import { addDays } from "./dates";
import { limitsForPeriod } from "./limits";
import { computePace, Pace } from "./pace";
import { isCurrentPeriod, PeriodRange, shortMonthName } from "./periods";
import { computePeriodSpend, expenseCategoryIndex } from "./spend";

export interface BudgetRow {
    key: string;
    label: string;
    kind: "limit" | "category" | "uncategorised" | "fees";
    spent: number;
    limit: number | null;
}

export interface BudgetPeriodView {
    range: PeriodRange;
    current: boolean;
    limit: number | null;
    spent: number;
    rows: BudgetRow[];
    pace: Pace | null;
}

export function buildPeriodView(
    budget: Budget,
    transactions: Transaction[],
    businesses: Business[],
    categories: Category[],
    range: PeriodRange,
    now: Date,
): BudgetPeriodView {
    const limits = limitsForPeriod(budget, range.key);
    const byId = new Map(categories.filter((c) => c.type === "expense").map((c) => [c.id, c]));
    const limited = Object.entries(limits?.categoryLimits ?? {}).filter(([id]) => byId.has(id));
    const limitedIds = new Set(limited.map(([id]) => id));
    const spend = computePeriodSpend(
        transactions,
        businesses,
        budget.scope,
        range,
        expenseCategoryIndex(categories),
        new Set(byId.keys()),
    );
    const rows: BudgetRow[] = limited
        .map(([id, limit]) => ({
            key: id,
            label: byId.get(id)!.name,
            kind: "limit" as const,
            spent: spend.byCategory.get(id) ?? 0,
            limit,
        }))
        .sort((a, b) => b.spent / b.limit - a.spent / a.limit);
    const unlimited: BudgetRow[] = [
        ...[...spend.byCategory]
            .filter(([id, spent]) => !limitedIds.has(id) && spent > 0)
            .map(([id, spent]) => ({ key: id, label: byId.get(id)!.name, kind: "category" as const, spent, limit: null })),
        ...[...spend.byUnknownName].map(([name, spent]) => ({
            key: `name:${name}`,
            label: name,
            kind: "category" as const,
            spent,
            limit: null,
        })),
    ].sort((a, b) => b.spent - a.spent);
    rows.push(...unlimited);
    const named = [...spend.byUnknownName.values()].reduce((sum, v) => sum + Math.round(v * 100), 0);
    const uncategorised = (Math.round(spend.other * 100) - named) / 100;
    if (uncategorised > 0) {
        rows.push({ key: "__uncategorised", label: "Uncategorized", kind: "uncategorised", spent: uncategorised, limit: null });
    }
    if (spend.fees > 0) rows.push({ key: "__fees", label: FEES_CATEGORY_LABEL, kind: "fees", spent: spend.fees, limit: null });
    const current = isCurrentPeriod(range, now);
    const limit = limits?.totalLimit ?? null;
    return {
        range,
        current,
        limit,
        spent: spend.total,
        rows,
        pace: current && limit ? computePace(spend.total, limit, range, now, budget.period) : null,
    };
}

export type ChipTone = "success" | "warning" | "error";
export type ChipIcon = "check" | "ahead" | "over";

export interface ChipContent {
    tone: ChipTone;
    icon: ChipIcon;
    text: string;
}

export function paceChip(view: BudgetPeriodView, symbol: string): ChipContent | null {
    if (view.limit === null) return null;
    const diff = Math.abs(view.spent - view.limit);
    if (!view.pace) {
        return view.spent > view.limit
            ? { tone: "error", icon: "over", text: `Finished ${exactMoney(diff, symbol)} over` }
            : { tone: "success", icon: "check", text: `Finished ${exactMoney(diff, symbol)} under` };
    }
    const p = view.pace;
    if (p.verdict === "over") return { tone: "error", icon: "over", text: `Over by ${exactMoney(diff, symbol)}` };
    if (p.verdict === "ahead") return { tone: "warning", icon: "ahead", text: `Ahead of pace · +${formatPercent(p.delta)}` };
    if (p.verdict === "on-pace") return { tone: "success", icon: "check", text: "On pace" };
    return { tone: "success", icon: "check", text: `On track · ${formatPercent(-p.delta)} under pace` };
}

export interface SummaryLines {
    sentence: { before: string; amount: string; after: string };
    forecast: string | null;
}

export function summaryLines(view: BudgetPeriodView, symbol: string, periodName: string): SummaryLines {
    const money = (v: number) => exactMoney(v, symbol);
    if (view.limit === null) {
        return {
            sentence: { before: "No limit was set for this period. You spent ", amount: money(view.spent), after: "." },
            forecast: null,
        };
    }
    if (!view.pace) {
        const over = view.spent > view.limit;
        return {
            sentence: {
                before: `${periodName} finished `,
                amount: `${money(Math.abs(view.spent - view.limit))} ${over ? "over" : "under"}`,
                after: ` your ${money(view.limit)} limit.`,
            },
            forecast: null,
        };
    }
    const p = view.pace;
    const last = addDays(view.range.end, -1);
    const forecast =
        p.forecast === null
            ? null
            : `At this rate you'll reach ${money(p.forecast)} by ${last.getDate()} ${shortMonthName(last)}.`;
    if (p.verdict === "over") {
        return {
            sentence: { before: "You're ", amount: `${money(view.spent - view.limit)} over`, after: ` your ${money(view.limit)} limit.` },
            forecast,
        };
    }
    const days = `${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}`;
    return {
        sentence: {
            before: "You have ",
            amount: money(view.limit - view.spent),
            after: ` left for ${days}, about ${money(p.perDay)} a day.`,
        },
        forecast,
    };
}
