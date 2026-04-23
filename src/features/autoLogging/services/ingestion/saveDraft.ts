import { Business, Transaction } from "../../../../types";
import { AutoLogSettings, ParsedDraft, ReviewItem, SenderMapping } from "../../types";
import { resolveBusiness } from "../routing/resolveBusiness";
import { findDuplicate } from "../dedupe/match";

export type PlanOutcome = "save" | "review" | "replace" | "drop";

export interface PlanInput {
    draft: ParsedDraft;
    settings: AutoLogSettings;
    businesses: Business[];
    transactions: Transaction[];
    mappings: SenderMapping[];
    now?: Date;
    idGenerator?: () => string;
}

export interface Plan {
    outcome: PlanOutcome;
    newBusiness?: Business;
    newMapping?: SenderMapping;
    transaction?: Transaction;
    reviewItem?: ReviewItem;
    replaceTransactionId?: string;
}

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function planSaveDraft(input: PlanInput): Plan {
    const now = input.now ?? new Date();
    const idGen = input.idGenerator ?? (() => now.getTime().toString() + Math.floor(Math.random() * 1000));

    const resolve = resolveBusiness(
        input.draft,
        input.settings,
        input.businesses,
        input.mappings,
        now,
    );

    const transaction = draftToTransaction(input.draft, resolve.businessId, idGen());

    const draftTimeMs = new Date(input.draft.occurredAt).getTime();
    const candidates: Array<{
        amount: number;
        merchant: string | null;
        timestampMs: number;
        confidence?: number;
        txId: string;
    }> = [];
    for (const tx of input.transactions) {
        if (!tx.autoLogged) continue;
        const txTimeMs = new Date(tx.date).getTime();
        if (Math.abs(txTimeMs - draftTimeMs) > DEDUPE_WINDOW_MS) continue;
        candidates.push({
            amount: tx.amount,
            merchant: tx.description ?? null,
            timestampMs: txTimeMs,
            confidence: tx.confidence,
            txId: tx.id,
        });
    }

    const hit = findDuplicate(input.draft, candidates);
    if (hit) {
        if (hit.shouldReplace) {
            return {
                outcome: "replace",
                newBusiness: resolve.newBusiness,
                newMapping: resolve.newMapping,
                transaction,
                replaceTransactionId: candidates[hit.index].txId,
            };
        }
        return { outcome: "drop" };
    }

    const { settings } = input;
    const lowConfidence = input.draft.confidence < settings.minConfidenceForAutoSave;
    const mustReview = settings.askBeforeSaving || (settings.reviewLowConfidenceOnly && lowConfidence);

    if (mustReview) {
        const reviewItem: ReviewItem = {
            id: transaction.id,
            draft: input.draft,
            businessId: resolve.businessId,
            createdAt: now.toISOString(),
        };
        return {
            outcome: "review",
            newBusiness: resolve.newBusiness,
            newMapping: resolve.newMapping,
            reviewItem,
        };
    }

    return {
        outcome: "save",
        newBusiness: resolve.newBusiness,
        newMapping: resolve.newMapping,
        transaction,
    };
}

function draftToTransaction(draft: ParsedDraft, businessId: string, id: string): Transaction {
    return {
        id,
        description: draft.merchant ?? (draft.type === "income" ? "Auto income" : "Auto expense"),
        amount: draft.amount,
        date: draft.occurredAt,
        type: draft.type === "transfer" ? "expense" : draft.type,
        businessId,
        category: draft.category,
        remark: draft.rawText.slice(0, 280),
        source: draft.source,
        sourceApp: draft.sourceApp ?? draft.senderDisplay,
        rawText: draft.rawText,
        autoLogged: true,
        confidence: draft.confidence,
        reviewStatus: "confirmed",
    };
}
