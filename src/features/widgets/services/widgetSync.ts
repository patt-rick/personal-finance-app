import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { WIDGET_NAMES } from "../constants";
import { loadBusinesses, loadTransactions, loadBudgets, loadCategories } from "../../../utils/storage";
import { readAllWidgetMappings } from "./widgetConfig";
import { resolveWidgetColors } from "../theme/widgetTheme";
import { renderWidgetForCashbookId } from "./renderWidget";

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
        const inputs = { transactions, budgets, categories };

        for (const widgetName of Object.values(WIDGET_NAMES)) {
            await requestWidgetUpdate({
                widgetName,
                renderWidget: ({ widgetId }: { widgetId: number }) =>
                    renderWidgetForCashbookId(widgetName, mappings[String(widgetId)], businesses, colors, inputs),
                widgetNotFound: () => {},
            });
        }
    } catch {
        // Never let widget refresh crash app flows.
    }
};
