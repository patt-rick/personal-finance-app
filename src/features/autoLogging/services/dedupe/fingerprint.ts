import { ParsedDraft } from "../../types";
import { extractStrongReference, normalizeMerchantKey } from "../parser/normalize";

const TIME_BUCKET_MS = 2 * 60 * 1000;

export function fingerprint(draft: ParsedDraft): string {
    const sender = draft.senderKey || "?";
    const currency = draft.currencyCode ?? "?";
    const amount = Number.isFinite(draft.amount) ? draft.amount.toFixed(2) : "0.00";
    const merchant = normalizeMerchantKey(draft.merchant);
    const occurred = new Date(draft.occurredAt).getTime();

    const strongReference = extractStrongReference(draft.rawText ?? "");
    if (strongReference) {
        return ["v1", sender, currency, amount, "r", strongReference.toUpperCase()].join("|");
    }
    const bucket = Number.isFinite(occurred) ? Math.floor(occurred / TIME_BUCKET_MS) : 0;
    return ["v1", sender, currency, amount, "t", merchant, bucket].join("|");
}
