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

// Custom URL scheme (mirrors app.json "scheme").
export const DEEP_LINK_SCHEME = "financetracker";

// Widget click-action identifiers (passed as renderWidget clickAction, handled in the task handler).
export const WIDGET_CLICK = {
    OPEN_QUICK_ADD: "OPEN_QUICK_ADD",
} as const;
