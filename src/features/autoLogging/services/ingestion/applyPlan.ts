import { Business, Transaction } from "../../../../types";
import { AutoLogSettings, ParsedDraft } from "../../types";
import {
    loadBusinesses,
    saveBusinesses,
    loadTransactions,
    saveTransactions,
} from "../../../../utils/storage";
import { loadSenderMappings, appendSenderMapping } from "../persistence/senderMappings";
import { appendReviewItem } from "../persistence/reviewQueue";
import { Plan, planSaveDraft } from "./saveDraft";
import { withLock } from "./mutex";

const AUTOLOG_LOCK = "autolog";

export async function saveDraft(draft: ParsedDraft, settings: AutoLogSettings): Promise<Plan> {
    return withLock(AUTOLOG_LOCK, async () => {
        const [businesses, transactions, mappings] = await Promise.all([
            loadBusinesses(),
            loadTransactions(),
            loadSenderMappings(),
        ]);

        const plan = planSaveDraft({
            draft,
            settings,
            businesses,
            transactions,
            mappings,
        });

        await applyPlan(plan, { businesses, transactions });
        return plan;
    });
}

async function applyPlan(
    plan: Plan,
    state: { businesses: Business[]; transactions: Transaction[] },
): Promise<void> {
    if (plan.outcome === "drop") return;

    if (plan.newBusiness) {
        await saveBusinesses([...state.businesses, plan.newBusiness]);
    }
    if (plan.newMapping) {
        await appendSenderMapping(plan.newMapping);
    }

    if (plan.outcome === "save" && plan.transaction) {
        await saveTransactions([...state.transactions, plan.transaction]);
        return;
    }

    if (plan.outcome === "replace" && plan.transaction && plan.replaceTransactionId) {
        const next = state.transactions.map((t) =>
            t.id === plan.replaceTransactionId ? plan.transaction! : t,
        );
        await saveTransactions(next);
        return;
    }

    if (plan.outcome === "review" && plan.reviewItem) {
        await appendReviewItem(plan.reviewItem);
    }
}
