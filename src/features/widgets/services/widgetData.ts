import { Business, Budget, Category, Transaction } from "../../../types";
import { computeCashbookBalance, computeMonthFlows } from "../../../utils/cashbookBalance";
import { periodRange } from "../../budget/periods";
import { limitsForPeriod } from "../../budget/limits";
import { computePeriodSpend, expenseCategoryIndex } from "../../budget/spend";
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
          warnAt: number;
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

const PERIOD_LABEL = { weekly: "This Week", monthly: "This Month", yearly: "This Year" } as const;

export const buildBudgetView = (
    business: Business,
    budget: Budget | null,
    transactions: Transaction[],
    categories: Category[],
    now: Date = new Date(),
): BudgetView => {
    const currencySymbol = getCurrencySymbol(business.currency);
    const accent = resolveCashbookColor(business);
    const iconKey = resolveCashbookIconKey(business);
    const range = budget ? periodRange(budget.period, now) : null;
    const limits = budget && range ? limitsForPeriod(budget, range.key) : null;
    if (!budget || !range || !limits) {
        return { cashbookName: business.name, currencySymbol, noBudget: true, accent, iconKey };
    }
    const totalSpent = computePeriodSpend(
        transactions,
        [business],
        budget.scope,
        range,
        expenseCategoryIndex(categories),
        new Set(),
    ).total;
    const totalLimit = limits.totalLimit;
    return {
        cashbookName: business.name,
        currencySymbol,
        periodLabel: PERIOD_LABEL[budget.period],
        totalSpent,
        totalLimit,
        percentage: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0,
        warnAt: budget.alerts.warnAt,
        noBudget: false,
        accent,
        iconKey,
    };
};
