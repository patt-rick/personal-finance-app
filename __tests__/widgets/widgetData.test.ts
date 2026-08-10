import { Business, Budget, Category, CategoryBudgetSpent, Transaction } from "../../src/types";
import {
    buildBalanceView,
    buildBudgetView,
    budgetDataForCashbook,
} from "../../src/features/widgets/services/widgetData";

const business = (over: Partial<Business> = {}): Business => ({
    id: "b1",
    name: "Personal",
    createdAt: "2026-01-01T00:00:00.000Z",
    currency: "GHS",
    ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
    id: "t",
    description: "d",
    amount: 0,
    date: "2026-08-05T10:00:00.000Z",
    type: "expense",
    businessId: "b1",
    ...over,
});

describe("buildBalanceView", () => {
    it("builds name, currency symbol, balance, and month flows", () => {
        const now = new Date("2026-08-15T00:00:00.000Z");
        const txns = [
            tx({ id: "1", type: "income", amount: 300, date: "2026-08-01T00:00:00.000Z" }),
            tx({ id: "2", type: "expense", amount: 120, date: "2026-08-10T00:00:00.000Z" }),
        ];
        expect(buildBalanceView(business(), txns, now)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            balance: 180,
            monthIncome: 300,
            monthExpense: 120,
        });
    });

    it("defaults the currency symbol when the cashbook has no currency", () => {
        const view = buildBalanceView(business({ currency: undefined }), [], new Date());
        expect(view.currencySymbol).toBe("$");
    });
});

describe("buildBudgetView", () => {
    const spent: CategoryBudgetSpent[] = [
        { categoryId: "6", categoryName: "Food", limit: 400, spent: 250, remaining: 150, percentage: 62.5 },
    ];
    const budget: Budget = {
        id: "bud1",
        businessId: "b1",
        period: "monthly",
        totalLimit: 1000,
        categoryBudgets: { "6": { limit: 400 } },
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
    };

    it("summarizes spent vs total limit with a period label", () => {
        expect(buildBudgetView(business(), budget, spent)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            periodLabel: "This Month",
            totalSpent: 250,
            totalLimit: 1000,
            percentage: 25,
            noBudget: false,
        });
    });

    it("flags noBudget when the cashbook has no budget", () => {
        expect(buildBudgetView(business(), null, [])).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            noBudget: true,
        });
    });
});

describe("budgetDataForCashbook", () => {
    const categories: Category[] = [{ id: "6", name: "Food", type: "expense" }];
    const budget: Budget = {
        id: "bud1",
        businessId: "b1",
        period: "monthly",
        totalLimit: 1000,
        categoryBudgets: { "6": { limit: 400 } },
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
    };

    it("scopes spend to the pinned cashbook before aggregating", () => {
        const today = new Date().toISOString();
        const txns = [
            tx({ id: "a", businessId: "b1", category: "Food", amount: 250, date: today }),
            tx({ id: "b", businessId: "b2", category: "Food", amount: 999, date: today }),
        ];
        const result = budgetDataForCashbook(budget, txns, categories, "b1");
        expect(result).toHaveLength(1);
        expect(result[0].categoryName).toBe("Food");
        expect(result[0].spent).toBe(250);
    });

    it("returns an empty array when the budget is null", () => {
        expect(budgetDataForCashbook(null, [], categories, "b1")).toEqual([]);
    });
});
