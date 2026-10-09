import { Transaction } from "../types";
import { grossAmount, FEES_CATEGORY_LABEL } from "./transactionAmount";

const CATEGORY_COLORS = [
    "#0066FF",
    "#F59E0B",
    "#3B82F6",
    "#EF4444",
    "#A855F7",
    "#EC4899",
    "#06B6D4",
    "#EAB308",
    "#6366F1",
    "#14B8A6",
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getMonthlyTrends(
    transactions: Transaction[],
    monthCount: number,
): { labels: string[]; income: number[]; expense: number[] } {
    const now = new Date();
    const labels: string[] = [];
    const income: number[] = [];
    const expense: number[] = [];

    for (let i = monthCount - 1; i >= 0; i--) {
        const year = now.getFullYear();
        const month = now.getMonth() - i;
        const d = new Date(year, month, 1);
        labels.push(SHORT_MONTHS[d.getMonth()]);

        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

        let inc = 0;
        let exp = 0;
        for (const t of transactions) {
            const td = new Date(t.date);
            if (td >= monthStart && td < monthEnd) {
                if (t.type === "income") inc += t.amount;
                else exp += grossAmount(t);
            }
        }
        income.push(inc);
        expense.push(exp);
    }

    return { labels, income, expense };
}

export function getCategoryBreakdown(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
    type: "income" | "expense",
    colors?: string[],
): { name: string; amount: number; percentage: number; color: string }[] {
    const palette = colors || CATEGORY_COLORS;
    const filtered = transactions.filter((t) => {
        const td = new Date(t.date);
        return t.type === type && td >= startDate && td <= endDate;
    });

    const map: Record<string, number> = {};
    for (const t of filtered) {
        if (t.amount <= 0) continue;
        const cat = t.category || "Uncategorized";
        map[cat] = (map[cat] || 0) + t.amount;
    }

    const feeTotal = filtered.reduce((s, t) => s + (t.fee ?? 0), 0);
    if (feeTotal > 0 && type === "expense") {
        map[FEES_CATEGORY_LABEL] = (map[FEES_CATEGORY_LABEL] || 0) + feeTotal;
    }

    const total = Object.values(map).reduce((acc, amount) => acc + amount, 0);

    return Object.entries(map)
        .map(([name, amount]) => ({
            name,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .map((item, i) => ({ ...item, color: palette[i % palette.length] }));
}

export function getTopCategories(
    transactions: Transaction[],
    limit: number,
    type: "income" | "expense",
    startDate: Date,
    endDate: Date,
): { name: string; amount: number; count: number }[] {
    const filtered = transactions.filter((t) => {
        const td = new Date(t.date);
        return t.type === type && td >= startDate && td <= endDate;
    });

    const map: Record<string, { amount: number; count: number }> = {};
    for (const t of filtered) {
        if (t.amount <= 0) continue;
        const cat = t.category || "Uncategorized";
        if (!map[cat]) map[cat] = { amount: 0, count: 0 };
        map[cat].amount += t.amount;
        map[cat].count += 1;
    }

    if (type === "expense") {
        const feeTotal = filtered.reduce((s, t) => s + (t.fee ?? 0), 0);
        if (feeTotal > 0) {
            const feeCount = filtered.filter((t) => (t.fee ?? 0) > 0).length;
            const existing = map[FEES_CATEGORY_LABEL] ?? { amount: 0, count: 0 };
            map[FEES_CATEGORY_LABEL] = {
                amount: existing.amount + feeTotal,
                count: existing.count + feeCount,
            };
        }
    }

    return Object.entries(map)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
}

export function getBiggestTransactions(
    transactions: Transaction[],
    limit: number,
    type: "income" | "expense",
    startDate: Date,
    endDate: Date,
): Transaction[] {
    return transactions
        .filter((t) => {
            const td = new Date(t.date);
            return t.type === type && t.amount > 0 && td >= startDate && td <= endDate;
        })
        .sort((a, b) => grossAmount(b) - grossAmount(a))
        .slice(0, limit);
}
