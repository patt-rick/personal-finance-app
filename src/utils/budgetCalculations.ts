import { Transaction, Budget, CategoryBudgetSpent, Category } from "../types";

/**
 * Get the date range for a given budget period
 */
export const getDateRangeForPeriod = (
    period: "weekly" | "monthly" | "yearly",
): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (period) {
        case "weekly":
            // Start from the beginning of the current week (Sunday)
            const dayOfWeek = now.getDay();
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            break;
        case "monthly":
            // Start from the beginning of the current month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case "yearly":
            // Start from the beginning of the current year
            startDate = new Date(now.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    return { startDate, endDate };
};

/**
 * Calculate spent amount for a specific category within a date range
 */
export const calculateCategorySpent = (
    transactions: Transaction[],
    categoryId: string,
    startDate: Date,
    endDate: Date,
): number => {
    return transactions
        .filter((t) => {
            const txDate = new Date(t.date);
            return (
                t.type === "expense" &&
                t.category === categoryId &&
                txDate >= startDate &&
                txDate <= endDate
            );
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate budget data for all categories
 */
export const calculateBudgetData = (
    budget: Budget,
    transactions: Transaction[],
    categories: Category[],
): CategoryBudgetSpent[] => {
    const { startDate, endDate } = getDateRangeForPeriod(budget.period);
    const result: CategoryBudgetSpent[] = [];

    // Only process expense categories
    const expenseCategories = categories.filter((c) => c.type === "expense");

    for (const category of expenseCategories) {
        const categoryBudget = budget.categoryBudgets[category.id];

        // Skip categories without budget allocation
        if (!categoryBudget || categoryBudget.limit === 0) {
            continue;
        }

        const spent = calculateCategorySpent(transactions, category.id, startDate, endDate);
        const remaining = Math.max(0, categoryBudget.limit - spent);
        const percentage = categoryBudget.limit > 0 ? (spent / categoryBudget.limit) * 100 : 0;

        result.push({
            categoryId: category.id,
            categoryName: category.name,
            limit: categoryBudget.limit,
            spent,
            remaining,
            percentage,
        });
    }

    return result.sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
};

/**
 * Calculate total budget spent
 */
export const calculateTotalSpent = (budgetData: CategoryBudgetSpent[]): number => {
    return budgetData.reduce((sum, item) => sum + item.spent, 0);
};

/**
 * Calculate total budget limit
 */
export const calculateTotalLimit = (budgetData: CategoryBudgetSpent[]): number => {
    return budgetData.reduce((sum, item) => sum + item.limit, 0);
};

/**
 * Calculate budget health score (0-100)
 */
export const calculateBudgetHealthScore = (totalSpent: number, totalLimit: number): number => {
    if (totalLimit === 0) return 100;
    const percentage = (totalSpent / totalLimit) * 100;
    return Math.max(0, 100 - percentage);
};

/**
 * Get budget status color based on percentage
 */
export const getBudgetStatusColor = (
    percentage: number,
    theme: { colors: { success: string; secondary: string; error: string } },
): string => {
    if (percentage < 70) return theme.colors.success;
    if (percentage < 90) return theme.colors.secondary;
    return theme.colors.error;
};

/**
 * Get budget warning message after transaction
 */
export const getBudgetWarningMessage = (
    categoryName: string,
    remaining: number,
    percentage: number,
    currencySymbol: string,
): string | null => {
    if (percentage >= 100) {
        return `⚠️ Budget exceeded for ${categoryName}!`;
    }
    if (percentage >= 90) {
        return `⚠️ Only ${currencySymbol}${remaining.toFixed(2)} left in ${categoryName} budget`;
    }
    if (percentage >= 70) {
        return `${currencySymbol}${remaining.toFixed(2)} remaining in ${categoryName} budget`;
    }
    return null;
};

/**
 * Validate budget configuration
 */
export const validateBudget = (
    totalLimit: number,
    categoryBudgets: { [categoryId: string]: { limit: number } },
): { valid: boolean; error?: string } => {
    if (totalLimit <= 0) {
        return { valid: false, error: "Total budget must be greater than 0" };
    }

    const categorySum = Object.values(categoryBudgets).reduce((sum, cat) => sum + cat.limit, 0);

    if (categorySum > totalLimit) {
        return {
            valid: false,
            error: "Sum of category budgets cannot exceed total budget",
        };
    }

    return { valid: true };
};

/**
 * Get period display name
 */
export const getPeriodDisplayName = (period: "weekly" | "monthly" | "yearly"): string => {
    switch (period) {
        case "weekly":
            return "This Week";
        case "monthly":
            return "This Month";
        case "yearly":
            return "This Year";
    }
};
