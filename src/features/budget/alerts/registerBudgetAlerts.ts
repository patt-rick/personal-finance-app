import { AppState } from "react-native";
import { onTransactionsSaved } from "../../../utils/transactionEvents";
import { checkBudgetAlerts } from "./checkBudgetAlerts";
import { flushQueuedAlerts } from "./deliverAlerts";

export function registerBudgetAlerts(): () => void {
    const off = onTransactionsSaved((prev, next) => {
        checkBudgetAlerts(prev, next).catch((error) => console.error("Budget alert check failed:", error));
    });
    const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") flushQueuedAlerts();
    });
    return () => {
        off();
        sub.remove();
    };
}
