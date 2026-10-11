import { Business, Budget, Category, Transaction } from "../../src/types";
import {
    buildBalanceView,
    buildBudgetView,
    buildQuickAddView,
} from "../../src/features/widgets/services/widgetData";
import {
    resolveCashbookColor,
    resolveCashbookIconKey,
} from "../../src/features/cashbooks/appearance/resolve";

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
            tx({ id: "2", type: "expense", amount: 120, fee: 5, date: "2026-08-10T00:00:00.000Z" }),
        ];
        expect(buildBalanceView(business(), txns, now)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            balance: 175,
            monthIncome: 300,
            monthExpense: 125,
            accent: resolveCashbookColor(business()),
            iconKey: resolveCashbookIconKey(business()),
        });
    });

    it("defaults the currency symbol when the cashbook has no currency", () => {
        const view = buildBalanceView(business({ currency: undefined }), [], new Date());
        expect(view.currencySymbol).toBe("$");
    });
});

describe("buildBudgetView", () => {
    const budget: Budget = {
        id: "bud1",
        scope: { kind: "cashbook", businessId: "b1" },
        period: "monthly",
        limits: [{ periodStart: "2026-08-01", totalLimit: 1000, categoryLimits: { "6": 400 } }],
        alerts: { enabled: true, warnAt: 80 },
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
    };
    const categories: Category[] = [{ id: "6", name: "Food", type: "expense" }];
    const now = new Date(2026, 7, 15, 12);

    it("counts every expense in the cashbook, gross, against the total", () => {
        const txns = [
            tx({ id: "a", category: "Food", amount: 250, date: new Date(2026, 7, 5).toISOString() }),
            tx({ id: "b", category: "Rent", amount: 100, fee: 5, date: new Date(2026, 7, 6).toISOString() }),
            tx({ id: "c", businessId: "b2", amount: 999, date: new Date(2026, 7, 6).toISOString() }),
        ];
        expect(buildBudgetView(business(), budget, txns, categories, now)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            periodLabel: "This Month",
            totalSpent: 355,
            totalLimit: 1000,
            percentage: 35.5,
            warnAt: 80,
            noBudget: false,
            accent: resolveCashbookColor(business()),
            iconKey: resolveCashbookIconKey(business()),
        });
    });

    it("flags noBudget without a budget or without a limit for the period", () => {
        const none = {
            cashbookName: "Personal",
            currencySymbol: "₵",
            noBudget: true,
            accent: resolveCashbookColor(business()),
            iconKey: resolveCashbookIconKey(business()),
        };
        expect(buildBudgetView(business(), null, [], categories, now)).toEqual(none);
        expect(buildBudgetView(business(), budget, [], categories, new Date(2026, 6, 1))).toEqual(none);
    });
});

describe("buildQuickAddView", () => {
    it("carries the cashbook name, accent, and icon key", () => {
        const b = business({ color: "#26A69A", icon: "shopping-cart" });
        expect(buildQuickAddView(b)).toEqual({
            cashbookName: "Personal",
            accent: "#26A69A",
            iconKey: "shopping-cart",
        });
    });
});
