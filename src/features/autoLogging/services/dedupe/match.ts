import { ParsedDraft } from "../../types";
import { normalizeMerchant } from "./hash";

export interface DedupeCandidate {
    amount: number;
    merchant?: string | null;
    timestampMs: number;
    confidence?: number;
}

export interface DedupeHit {
    index: number;
    shouldReplace: boolean;
}

export function findDuplicate(
    draft: ParsedDraft,
    recent: DedupeCandidate[],
    windowMs = 2 * 60 * 1000,
): DedupeHit | null {
    const draftTimeMs = new Date(draft.occurredAt).getTime();
    const draftMerchant = normalizeMerchant(draft.merchant);

    for (let i = 0; i < recent.length; i++) {
        const c = recent[i];
        if (c.amount !== draft.amount) continue;
        if (Math.abs(c.timestampMs - draftTimeMs) > windowMs) continue;

        const candidateMerchant = normalizeMerchant(c.merchant);
        if (candidateMerchant && draftMerchant && candidateMerchant !== draftMerchant) continue;

        const shouldReplace = draft.confidence > (c.confidence ?? 0);
        return { index: i, shouldReplace };
    }
    return null;
}
