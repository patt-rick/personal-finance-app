import { Business, Budget, CategoryBudgetSpent } from "../../../types";
import { Transaction } from "../../../types";
import { computeCashbookBalance, computeMonthFlows } from "../../../utils/cashbookBalance";
import {
    calculateTotalSpent,
    getPeriodDisplayName,
} from "../../../utils/budgetCalculations";
import { getCurrencySymbol } from "../../../utils/_helpers";

export interface BalanceView {
    cashbookName: string;
    currencySymbol: string;
    balance: number;
    monthIncome: number;
    monthExpense: number;
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
      }
    | {
          cashbookName: string;
          currencySymbol: string;
          noBudget: true;
      };

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
    };
};

export const buildBudgetView = (
    business: Business,
    budget: Budget | null,
    budgetData: CategoryBudgetSpent[],
): BudgetView => {
    const currencySymbol = getCurrencySymbol(business.currency);
    if (!budget) {
        return { cashbookName: business.name, currencySymbol, noBudget: true };
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
    };
};
