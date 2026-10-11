import { Transaction } from "../../../types";
import { loadBusinesses, loadCategories } from "../../../utils/storage";
import { withLock } from "../../autoLogging/services/ingestion/mutex";
import { loadBudgets } from "../storage/budgetStore";
import { deliverAlerts } from "./deliverAlerts";
import { evaluateAlerts } from "./evaluateAlerts";
import { loadLedger, saveLedger } from "./ledger";
import { pruneLedger } from "./ledgerKeys";

export function checkBudgetAlerts(prev: Transaction[], next: Transaction[]): Promise<void> {
    return withLock("budget-alerts", async () => {
        const budgets = await loadBudgets();
        if (!budgets.some((b) => b.alerts.enabled)) return;
        const [businesses, categories, ledger] = await Promise.all([loadBusinesses(), loadCategories(), loadLedger()]);
        if (businesses.length === 0) return;
        const now = new Date();
        const { lines, recorded } = evaluateAlerts({
            prev,
            next,
            budgets,
            businesses,
            categories,
            ledger: new Set(ledger),
            now,
        });
        if (recorded.length === 0) return;
        await saveLedger(pruneLedger([...ledger, ...recorded], budgets, now));
        await deliverAlerts(lines);
    });
}
