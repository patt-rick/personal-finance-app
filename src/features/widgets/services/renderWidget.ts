import React from "react";
import { loadTransactions, loadBudgets, loadCategories } from "../../../utils/storage";
import { Business, Transaction, Budget, Category } from "../../../types";
import { WIDGET_NAMES, WIDGET_CLICK, WIDGET_MESSAGES, WidgetName } from "../constants";
import type { WidgetColors } from "../theme/widgetTheme";
import { buildBalanceView, buildBudgetView, budgetDataForCashbook, buildQuickAddView } from "./widgetData";
import { BalanceWidget } from "../components/BalanceWidget";
import { BudgetWidget } from "../components/BudgetWidget";
import { QuickAddWidget } from "../components/QuickAddWidget";
import { MessageWidget } from "../components/WidgetStates";

export interface WidgetInputs {
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
}

const WIDGET_NAME_SET: ReadonlySet<string> = new Set(Object.values(WIDGET_NAMES));

export const isWidgetName = (name: string): name is WidgetName => WIDGET_NAME_SET.has(name);

export const loadWidgetInputs = async (name: WidgetName): Promise<WidgetInputs> => {
    if (name === WIDGET_NAMES.QUICK_ADD) return { transactions: [], budgets: [], categories: [] };
    const [transactions, budgets, categories] = await Promise.all([
        loadTransactions(),
        name === WIDGET_NAMES.BUDGET ? loadBudgets() : Promise.resolve([]),
        name === WIDGET_NAMES.BUDGET ? loadCategories() : Promise.resolve([]),
    ]);
    return { transactions, budgets, categories };
};

export const renderCashbookWidget = (
    name: WidgetName,
    business: Business,
    colors: WidgetColors,
    inputs: WidgetInputs,
): React.ReactElement => {
    const clickAction = WIDGET_CLICK.OPEN_QUICK_ADD;
    switch (name) {
        case WIDGET_NAMES.QUICK_ADD:
            return React.createElement(QuickAddWidget, { view: buildQuickAddView(business), colors, clickAction });
        case WIDGET_NAMES.BALANCE:
            return React.createElement(BalanceWidget, {
                view: buildBalanceView(business, inputs.transactions),
                colors,
                clickAction,
            });
        case WIDGET_NAMES.BUDGET: {
            const budget = inputs.budgets.find((b) => b.businessId === business.id) ?? null;
            const budgetData = budgetDataForCashbook(budget, inputs.transactions, inputs.categories, business.id);
            return React.createElement(BudgetWidget, {
                view: buildBudgetView(business, budget, budgetData),
                colors,
                clickAction,
            });
        }
    }
};

export const renderWidgetForCashbookId = (
    name: WidgetName,
    businessId: string | null | undefined,
    businesses: Business[],
    colors: WidgetColors,
    inputs: WidgetInputs,
): React.ReactElement => {
    if (!businessId) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.UNSET, colors });
    const business = businesses.find((b) => b.id === businessId);
    if (!business) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.CASHBOOK_REMOVED, colors });
    return renderCashbookWidget(name, business, colors, inputs);
};
