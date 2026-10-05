jest.mock("../../src/utils/storage", () => ({
    loadTransactions: jest.fn(async () => []),
    loadBudgets: jest.fn(async () => []),
    loadCategories: jest.fn(async () => []),
}));
jest.mock("../../src/features/widgets/components/BalanceWidget", () => ({ BalanceWidget: () => null }));
jest.mock("../../src/features/widgets/components/BudgetWidget", () => ({ BudgetWidget: () => null }));
jest.mock("../../src/features/widgets/components/QuickAddWidget", () => ({ QuickAddWidget: () => null }));
jest.mock("../../src/features/widgets/components/WidgetStates", () => ({ MessageWidget: () => null }));

import * as storage from "../../src/utils/storage";
import { Business, Transaction } from "../../src/types";
import { WIDGET_NAMES, WIDGET_MESSAGES } from "../../src/features/widgets/constants";
import type { WidgetColors } from "../../src/features/widgets/theme/widgetTheme";
import {
    isWidgetName,
    loadWidgetInputs,
    renderCashbookWidget,
    renderWidgetForCashbookId,
    WidgetInputs,
} from "../../src/features/widgets/services/renderWidget";
import { BalanceWidget } from "../../src/features/widgets/components/BalanceWidget";
import { BudgetWidget } from "../../src/features/widgets/components/BudgetWidget";
import { QuickAddWidget } from "../../src/features/widgets/components/QuickAddWidget";
import { MessageWidget } from "../../src/features/widgets/components/WidgetStates";

const colors = {} as WidgetColors;
const business: Business = { id: "b1", name: "Shop", createdAt: "2026-01-01T00:00:00.000Z", currency: "GHS" };
const income: Transaction = {
    id: "t1",
    description: "Sale",
    amount: 50,
    date: "2026-10-01T10:00:00.000Z",
    type: "income",
    businessId: "b1",
};
const inputs: WidgetInputs = { transactions: [income], budgets: [], categories: [] };

describe("renderWidget", () => {
    it("narrows widget names", () => {
        expect(isWidgetName(WIDGET_NAMES.BUDGET)).toBe(true);
        expect(isWidgetName("SomethingElse")).toBe(false);
    });

    it("renders the matching component for each widget", () => {
        const balance = renderCashbookWidget(WIDGET_NAMES.BALANCE, business, colors, inputs);
        expect(balance.type).toBe(BalanceWidget);
        expect((balance.props as any).view.balance).toBe(50);
        expect(renderCashbookWidget(WIDGET_NAMES.BUDGET, business, colors, inputs).type).toBe(BudgetWidget);
        expect(renderCashbookWidget(WIDGET_NAMES.QUICK_ADD, business, colors, inputs).type).toBe(QuickAddWidget);
    });

    it("shows a setup message when the widget has no cashbook", () => {
        const el = renderWidgetForCashbookId(WIDGET_NAMES.BALANCE, null, [business], colors, inputs);
        expect(el.type).toBe(MessageWidget);
        expect((el.props as any).message).toBe(WIDGET_MESSAGES.UNSET);
    });

    it("shows a removed message when the mapped cashbook no longer exists", () => {
        const el = renderWidgetForCashbookId(WIDGET_NAMES.BALANCE, "gone", [business], colors, inputs);
        expect(el.type).toBe(MessageWidget);
        expect((el.props as any).message).toBe(WIDGET_MESSAGES.CASHBOOK_REMOVED);
    });

    it("does not read transactions for the quick-add widget", async () => {
        jest.clearAllMocks();
        await loadWidgetInputs(WIDGET_NAMES.QUICK_ADD);
        expect(storage.loadTransactions).not.toHaveBeenCalled();
        await loadWidgetInputs(WIDGET_NAMES.BALANCE);
        expect(storage.loadBudgets).not.toHaveBeenCalled();
        expect(storage.loadCategories).not.toHaveBeenCalled();
        jest.clearAllMocks();
        await loadWidgetInputs(WIDGET_NAMES.BUDGET);
        expect(storage.loadTransactions).toHaveBeenCalledTimes(1);
        expect(storage.loadBudgets).toHaveBeenCalledTimes(1);
    });
});
