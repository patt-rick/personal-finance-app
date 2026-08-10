import React from "react";
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { WIDGET_NAMES, WIDGET_CLICK, WIDGET_MESSAGES } from "../constants";
import { loadBusinesses, loadTransactions, loadBudgets, loadCategories } from "../../../utils/storage";
import { readAllWidgetMappings } from "./widgetConfig";
import { resolveWidgetColors, WidgetColors } from "../theme/widgetTheme";
import { buildBalanceView, buildBudgetView, budgetDataForCashbook } from "./widgetData";
import { BalanceWidget } from "../components/BalanceWidget";
import { BudgetWidget } from "../components/BudgetWidget";
import { QuickAddWidget } from "../components/QuickAddWidget";
import { MessageWidget } from "../components/WidgetStates";
import { Business, Transaction, Budget, Category } from "../../../types";

interface Snapshot {
    colors: WidgetColors;
    mappings: Record<string, string>;
    businesses: Business[];
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
}

const renderBalance = (snap: Snapshot, widgetId: number): React.ReactElement => {
    const businessId = snap.mappings[String(widgetId)];
    if (!businessId) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.UNSET, colors: snap.colors });
    const business = snap.businesses.find((b) => b.id === businessId);
    if (!business) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.CASHBOOK_REMOVED, colors: snap.colors });
    return React.createElement(BalanceWidget, {
        view: buildBalanceView(business, snap.transactions),
        colors: snap.colors,
        clickAction: WIDGET_CLICK.OPEN_QUICK_ADD,
    });
};

const renderBudget = (snap: Snapshot, widgetId: number): React.ReactElement => {
    const businessId = snap.mappings[String(widgetId)];
    if (!businessId) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.UNSET, colors: snap.colors });
    const business = snap.businesses.find((b) => b.id === businessId);
    if (!business) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.CASHBOOK_REMOVED, colors: snap.colors });
    const budget = snap.budgets.find((b) => b.businessId === business.id) ?? null;
    const budgetData = budgetDataForCashbook(budget, snap.transactions, snap.categories, business.id);
    return React.createElement(BudgetWidget, {
        view: buildBudgetView(business, budget, budgetData),
        colors: snap.colors,
        clickAction: WIDGET_CLICK.OPEN_QUICK_ADD,
    });
};

const renderQuickAdd = (snap: Snapshot, widgetId: number): React.ReactElement => {
    const businessId = snap.mappings[String(widgetId)];
    if (!businessId) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.UNSET, colors: snap.colors });
    const business = snap.businesses.find((b) => b.id === businessId);
    if (!business) return React.createElement(MessageWidget, { message: WIDGET_MESSAGES.CASHBOOK_REMOVED, colors: snap.colors });
    return React.createElement(QuickAddWidget, {
        cashbookName: business.name,
        colors: snap.colors,
        clickAction: WIDGET_CLICK.OPEN_QUICK_ADD,
    });
};

export const refreshCashbookWidgets = async (): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
        const [colors, mappings, businesses, transactions, budgets, categories] = await Promise.all([
            resolveWidgetColors(),
            readAllWidgetMappings(),
            loadBusinesses(),
            loadTransactions(),
            loadBudgets(),
            loadCategories(),
        ]);
        const snap: Snapshot = { colors, mappings, businesses, transactions, budgets, categories };

        await requestWidgetUpdate({
            widgetName: WIDGET_NAMES.BALANCE,
            renderWidget: ({ widgetId }: { widgetId: number }) => renderBalance(snap, widgetId),
            widgetNotFound: () => {},
        });
        await requestWidgetUpdate({
            widgetName: WIDGET_NAMES.BUDGET,
            renderWidget: ({ widgetId }: { widgetId: number }) => renderBudget(snap, widgetId),
            widgetNotFound: () => {},
        });
        await requestWidgetUpdate({
            widgetName: WIDGET_NAMES.QUICK_ADD,
            renderWidget: ({ widgetId }: { widgetId: number }) => renderQuickAdd(snap, widgetId),
            widgetNotFound: () => {},
        });
    } catch {
        // Never let widget refresh crash app flows.
    }
};
