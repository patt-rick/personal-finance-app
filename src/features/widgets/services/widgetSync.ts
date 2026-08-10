import React from "react";
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { WIDGET_NAMES } from "../constants";
import { loadBusinesses, loadTransactions, loadBudgets, loadCategories } from "../../../utils/storage";
import { calculateBudgetData } from "../../../utils/budgetCalculations";
import { readAllWidgetMappings } from "./widgetConfig";
import { resolveWidgetColors, WidgetColors } from "../theme/widgetTheme";
import { buildBalanceView, buildBudgetView } from "./widgetData";
import { BalanceWidget } from "../components/BalanceWidget";
import { BudgetWidget } from "../components/BudgetWidget";
import { MessageWidget } from "../components/WidgetStates";
import { Business, Transaction, Budget, Category } from "../../../types";
import { WIDGET_CLICK } from "../constants";

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
    const business = businessId ? snap.businesses.find((b) => b.id === businessId) : undefined;
    if (!business) return React.createElement(MessageWidget, { message: "Tap to set up", colors: snap.colors });
    return React.createElement(BalanceWidget, {
        view: buildBalanceView(business, snap.transactions),
        colors: snap.colors,
        clickAction: WIDGET_CLICK.OPEN_QUICK_ADD,
    });
};

const renderBudget = (snap: Snapshot, widgetId: number): React.ReactElement => {
    const businessId = snap.mappings[String(widgetId)];
    const business = businessId ? snap.businesses.find((b) => b.id === businessId) : undefined;
    if (!business) return React.createElement(MessageWidget, { message: "Tap to set up", colors: snap.colors });
    const budget = snap.budgets.find((b) => b.businessId === business.id) ?? null;
    const cashbookTx = snap.transactions.filter((t) => t.businessId === business.id);
    const budgetData = budget ? calculateBudgetData(budget, cashbookTx, snap.categories) : [];
    return React.createElement(BudgetWidget, {
        view: buildBudgetView(business, budget, budgetData),
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
    } catch {
        // Never let widget refresh crash app flows.
    }
};
