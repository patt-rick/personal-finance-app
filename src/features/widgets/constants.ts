export const WIDGET_NAMES = {
    BALANCE: "BalanceWidget",
    BUDGET: "BudgetWidget",
    QUICK_ADD: "QuickAddWidget",
} as const;

export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

// AsyncStorage key for the widgetId -> businessId mapping.
export const WIDGET_CASHBOOK_MAP_KEY = "@widget_cashbook_map";

// Deep-link path for the quick-add flow: financetracker://quick-add?businessId=<id>
export const QUICK_ADD_PATH = "quick-add";
