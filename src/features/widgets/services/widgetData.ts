import { Business, Budget, CategoryBudgetSpent, Category } from "../../../types";
import { Transaction } from "../../../types";
import { computeCashbookBalance, computeMonthFlows } from "../../../utils/cashbookBalance";
import {
    calculateTotalSpent,
    getPeriodDisplayName,
    calculateBudgetData,
} from "../../../utils/budgetCalculations";
import { getCurrencySymbol } from "../../../utils/_helpers";
import type { HexColor } from "react-native-android-widget";
import { resolveCashbookColor, resolveCashbookIconKey } from "../../cashbooks/appearance/resolve";

export interface BalanceView {
    cashbookName: string;
    currencySymbol: string;
    balance: number;
    monthIncome: number;
    monthExpense: number;
    accent: HexColor;
    iconKey: string;
}

export type BudgetView =
    | {
          cashbookName: string;
          currencySymbol: string;
          periodLabel: string;
          totalSpent: number;
          totalLimit: number;
          percentage: number;
          noBudget: false;
          accent: HexColor;
          iconKey: string;
      }
    | {
          cashbookName: string;
          currencySymbol: string;
          noBudget: true;
          accent: HexColor;
          iconKey: string;
      };

export interface QuickAddView {
    cashbookName: string;
    accent: HexColor;
    iconKey: string;
}

export const buildQuickAddView = (business: Business): QuickAddView => ({
    cashbookName: business.name,
    accent: resolveCashbookColor(business),
    iconKey: resolveCashbookIconKey(business),
});

export const buildBalanceView = (
    business: Business,
    transactions: Transaction[],
    now: Date = new Date(),
): BalanceView => {
    const { income, expense } = computeMonthFlows(transactions, business.id, now);
    return {
        cashbookName: business.name,
        currencySymbol: getCurrencySymbol(business.currency),
        balance: computeCashbookBalance(transactions, business.id),
        monthIncome: income,
        monthExpense: expense,
        accent: resolveCashbookColor(business),
        iconKey: resolveCashbookIconKey(business),
    };
};

// Budget spend scoped to one cashbook. calculateBudgetData filters by category
// name + date only, so transactions must be pre-filtered by businessId or the
// widget would blend spend across cashbooks.
export const budgetDataForCashbook = (
    budget: Budget | null,
    transactions: Transaction[],
    categories: Category[],
    businessId: string,
): CategoryBudgetSpent[] => {
    if (!budget) return [];
    const cashbookTx = transactions.filter((t) => t.businessId === businessId);
    return calculateBudgetData(budget, cashbookTx, categories);
};

export const buildBudgetView = (
    business: Business,
    budget: Budget | null,
    budgetData: CategoryBudgetSpent[],
): BudgetView => {
    const currencySymbol = getCurrencySymbol(business.currency);
    const accent = resolveCashbookColor(business);
    const iconKey = resolveCashbookIconKey(business);
    if (!budget) {
        return { cashbookName: business.name, currencySymbol, noBudget: true, accent, iconKey };
    }
    const totalSpent = calculateTotalSpent(budgetData);
    const totalLimit = budget.totalLimit;
    const percentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return {
        cashbookName: business.name,
        currencySymbol,
        periodLabel: getPeriodDisplayName(budget.period),
        totalSpent,
        totalLimit,
        percentage,
        noBudget: false,
        accent,
        iconKey,
    };
};
