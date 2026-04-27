import { Business, Transaction } from "../../../../types";
import { AutoLogSettings, ParsedDraft, ReviewItem, SenderMapping } from "../../types";
import { resolveBusiness } from "../routing/resolveBusiness";
import { findDuplicate } from "../dedupe/match";
import { fingerprint } from "../dedupe/fingerprint";
import { RawHistoryLookup } from "../persistence/rawEvents";

export type PlanOutcome = "save" | "review" | "replace" | "drop";

export interface PlanInput {
    draft: ParsedDraft;
    settings: AutoLogSettings;
    businesses: Business[];
    transactions: Transaction[];
    mappings: SenderMapping[];
    rawHistory?: RawHistoryLookup;
    rawHash?: string;
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
    fingerprint?: string;
}

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function planSaveDraft(input: PlanInput): Plan {
    const now = input.now ?? new Date();
    const idGen = input.idGenerator ?? (() => now.getTime().toString() + Math.floor(Math.random() * 1000));

    const draftFp = fingerprint(input.draft);

    const historyHit = checkRawHistory(input, draftFp);
    if (historyHit && historyHit.outcome === "drop") return { ...historyHit, fingerprint: draftFp };

    const resolve = resolveBusiness(
        input.draft,
        input.settings,
        input.businesses,
        input.mappings,
        now,
    );

    const transaction = draftToTransaction(input.draft, resolve.businessId, idGen());

    if (historyHit && historyHit.outcome === "replace" && historyHit.replaceTransactionId) {
        return {
            outcome: "replace",
            newBusiness: resolve.newBusiness,
            newMapping: resolve.newMapping,
            transaction,
            replaceTransactionId: historyHit.replaceTransactionId,
            fingerprint: draftFp,
        };
    }

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
                fingerprint: draftFp,
            };
        }
        return { outcome: "drop", fingerprint: draftFp };
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
            fingerprint: draftFp,
        };
    }

    return {
        outcome: "save",
        newBusiness: resolve.newBusiness,
        newMapping: resolve.newMapping,
        transaction,
        fingerprint: draftFp,
    };
}

function checkRawHistory(input: PlanInput, draftFp: string): Plan | null {
    const lookup = input.rawHistory;
    if (!lookup) return null;

    if (input.rawHash) {
        const byHash = lookup.byRawHash.get(input.rawHash);
        if (byHash) return { outcome: "drop" };
    }

    const byFp = lookup.byFingerprint.get(draftFp);
    if (!byFp) return null;
    if (input.draft.confidence > (byFp.confidence ?? 0) && byFp.txId) {
        return { outcome: "replace", replaceTransactionId: byFp.txId };
    }
    return { outcome: "drop" };
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
