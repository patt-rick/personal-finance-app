import { Business, Transaction } from "../../../../types";
import { AutoLogSettings, ParsedDraft, RawEvent } from "../../types";
import {
    loadBusinesses,
    saveBusinesses,
    loadTransactions,
    saveTransactions,
} from "../../../../utils/storage";
import { loadSenderMappings, appendSenderMapping } from "../persistence/senderMappings";
import { appendReviewItem } from "../persistence/reviewQueue";
import {
    appendRawHistory,
    indexRawHistory,
    loadRawHistory,
    RawHistoryEntry,
} from "../persistence/rawEvents";
import { Plan, planSaveDraft } from "./saveDraft";
import { withLock } from "./mutex";

const AUTOLOG_LOCK = "autolog";

export async function saveDraft(
    draft: ParsedDraft,
    settings: AutoLogSettings,
    sourceEvent?: RawEvent,
): Promise<Plan> {
    return withLock(AUTOLOG_LOCK, async () => {
        const [businesses, transactions, mappings, history] = await Promise.all([
            loadBusinesses(),
            loadTransactions(),
            loadSenderMappings(),
            loadRawHistory(),
        ]);

        const rawHistory = indexRawHistory(history);
        const plan = planSaveDraft({
            draft,
            settings,
            businesses,
            transactions,
            mappings,
            rawHistory,
            rawHash: sourceEvent?.rawHash,
        });

        await applyPlan(plan, { businesses, transactions });
        await persistHistoryEntry(plan, draft, sourceEvent);
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

async function persistHistoryEntry(
    plan: Plan,
    draft: ParsedDraft,
    event: RawEvent | undefined,
): Promise<void> {
    if (!plan.fingerprint) return;
    const persisted = plan.outcome === "save" || plan.outcome === "replace";
    const txId = persisted ? plan.transaction?.id ?? null : null;
    const entry: RawHistoryEntry = {
        rawHash: event?.rawHash ?? "",
        fingerprint: plan.fingerprint,
        txId,
        occurredAt: new Date(draft.occurredAt).getTime(),
        confidence: draft.confidence,
    };
    try {
        await appendRawHistory(entry);
    } catch {
        // history is best-effort
    }
}
