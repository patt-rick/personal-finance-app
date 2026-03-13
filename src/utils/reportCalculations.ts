import { Transaction } from "../types";

const CATEGORY_COLORS = [
    "#6366F1",
    "#F59E0B",
    "#10B981",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
    "#06B6D4",
    "#84CC16",
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
                else exp += t.amount;
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
): { name: string; amount: number; percentage: number; color: string }[] {
    const filtered = transactions.filter((t) => {
        const td = new Date(t.date);
        return t.type === type && td >= startDate && td <= endDate;
    });

    const map: Record<string, number> = {};
    for (const t of filtered) {
        const cat = t.category || "Uncategorized";
        map[cat] = (map[cat] || 0) + t.amount;
    }

    const total = filtered.reduce((acc, t) => acc + t.amount, 0);

    return Object.entries(map)
        .map(([name, amount]) => ({
            name,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .map((item, i) => ({ ...item, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
}

export function getMonthComparison(
    transactions: Transaction[],
): { incomeChange: number; expenseChange: number; netChange: number } {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = thisMonthStart;

    let thisIncome = 0;
    let thisExpense = 0;
    let lastIncome = 0;
    let lastExpense = 0;

    for (const t of transactions) {
        const td = new Date(t.date);
        if (td >= thisMonthStart) {
            if (t.type === "income") thisIncome += t.amount;
            else thisExpense += t.amount;
        } else if (td >= lastMonthStart && td < lastMonthEnd) {
            if (t.type === "income") lastIncome += t.amount;
            else lastExpense += t.amount;
        }
    }

    const lastNet = lastIncome - lastExpense;
    const thisNet = thisIncome - thisExpense;

    return {
        incomeChange: lastIncome === 0 ? 0 : ((thisIncome - lastIncome) / lastIncome) * 100,
        expenseChange: lastExpense === 0 ? 0 : ((thisExpense - lastExpense) / lastExpense) * 100,
        netChange: lastNet === 0 ? 0 : ((thisNet - lastNet) / Math.abs(lastNet)) * 100,
    };
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
        const cat = t.category || "Uncategorized";
        if (!map[cat]) map[cat] = { amount: 0, count: 0 };
        map[cat].amount += t.amount;
        map[cat].count += 1;
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
            return t.type === type && td >= startDate && td <= endDate;
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
}
