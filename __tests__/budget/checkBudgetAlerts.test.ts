const ledgerStore: { keys: string[] } = { keys: [] };

jest.mock("../../src/utils/storage", () => ({
    loadBusinesses: jest.fn(async () => [{ id: "a", name: "Main", currency: "GHS", createdAt: "" }]),
    loadCategories: jest.fn(async () => []),
}));
jest.mock("../../src/features/budget/storage/budgetStore", () => ({
    loadBudgets: jest.fn(async () => [
        {
            id: "B",
            scope: { kind: "cashbook", businessId: "a" },
            period: "monthly",
            limits: [{ periodStart: "2000-01-01", totalLimit: 100, categoryLimits: {} }],
            alerts: { enabled: true, warnAt: 80 },
            createdAt: "",
            updatedAt: "",
        },
    ]),
}));
jest.mock("../../src/features/budget/alerts/ledger", () => ({
    loadLedger: jest.fn(async () => [...ledgerStore.keys]),
    saveLedger: jest.fn(async (keys: string[]) => {
        ledgerStore.keys = keys;
    }),
}));
jest.mock("../../src/features/budget/alerts/deliverAlerts", () => ({ deliverAlerts: jest.fn(async () => {}) }));

import { Transaction } from "../../src/types";
import { checkBudgetAlerts } from "../../src/features/budget/alerts/checkBudgetAlerts";
import { deliverAlerts } from "../../src/features/budget/alerts/deliverAlerts";

const spend = (id: string, amount: number): Transaction => ({
    id,
    description: "d",
    amount,
    date: new Date().toISOString(),
    type: "expense",
    businessId: "a",
});

it("delivers once when two checks for the same crossing run at the same time", async () => {
    const prev = [spend("1", 10)];
    const next = [...prev, spend("2", 85)];
    await Promise.all([checkBudgetAlerts(prev, next), checkBudgetAlerts(prev, next)]);
    expect(deliverAlerts).toHaveBeenCalledTimes(1);
    expect(deliverAlerts).toHaveBeenCalledWith(["Main passed 80% · ₵ 95.00 of ₵ 100.00"]);
    expect(ledgerStore.keys).toHaveLength(1);
});
