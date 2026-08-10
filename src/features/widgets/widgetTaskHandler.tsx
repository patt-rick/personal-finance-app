import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { Linking } from "react-native";
import { loadBusinesses, loadTransactions, loadBudgets, loadCategories } from "../../utils/storage";
import { calculateBudgetData } from "../../utils/budgetCalculations";
import { WIDGET_NAMES, WIDGET_CLICK } from "./constants";
import { getWidgetBusinessId, removeWidgetMapping } from "./services/widgetConfig";
import { resolveWidgetColors } from "./theme/widgetTheme";
import { buildBalanceView, buildBudgetView } from "./services/widgetData";
import { buildQuickAddLink } from "./services/deepLink";
import { BalanceWidget } from "./components/BalanceWidget";
import { BudgetWidget } from "./components/BudgetWidget";
import { QuickAddWidget } from "./components/QuickAddWidget";
import { MessageWidget } from "./components/WidgetStates";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const widgetInfo = props.widgetInfo;
    const widgetName = widgetInfo.widgetName;
    const widgetId = widgetInfo.widgetId;

    // Handle quick-add tap by opening the app via deep link.
    if (props.clickAction === WIDGET_CLICK.OPEN_QUICK_ADD) {
        const businessId = await getWidgetBusinessId(widgetId);
        await Linking.openURL(buildQuickAddLink(businessId));
        return;
    }

    if (props.widgetAction === "WIDGET_DELETED") {
        await removeWidgetMapping(widgetId);
        return;
    }

    const colors = await resolveWidgetColors();
    const businessId = await getWidgetBusinessId(widgetId);
    if (!businessId) {
        props.renderWidget(<MessageWidget message="Tap to set up" colors={colors} />);
        return;
    }

    const businesses = await loadBusinesses();
    const business = businesses.find((b) => b.id === businessId) ?? null;
    if (!business) {
        props.renderWidget(
            <MessageWidget message="Cashbook removed — tap to reconfigure" colors={colors} />,
        );
        return;
    }

    if (widgetName === WIDGET_NAMES.QUICK_ADD) {
        props.renderWidget(
            <QuickAddWidget cashbookName={business.name} colors={colors} clickAction={WIDGET_CLICK.OPEN_QUICK_ADD} />,
        );
        return;
    }

    const transactions = await loadTransactions();

    if (widgetName === WIDGET_NAMES.BALANCE) {
        const view = buildBalanceView(business, transactions);
        props.renderWidget(
            <BalanceWidget view={view} colors={colors} clickAction={WIDGET_CLICK.OPEN_QUICK_ADD} />,
        );
        return;
    }

    if (widgetName === WIDGET_NAMES.BUDGET) {
        const [budgets, categories] = await Promise.all([loadBudgets(), loadCategories()]);
        const budget = budgets.find((b) => b.businessId === businessId) ?? null;
        const budgetData = budget ? calculateBudgetData(budget, transactions, categories) : [];
        const view = buildBudgetView(business, budget, budgetData);
        props.renderWidget(
            <BudgetWidget view={view} colors={colors} clickAction={WIDGET_CLICK.OPEN_QUICK_ADD} />,
        );
        return;
    }
}
