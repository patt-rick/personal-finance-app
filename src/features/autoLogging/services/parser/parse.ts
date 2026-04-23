import { Category } from "../../../../types";
import { ParsedDraft, RawEvent } from "../../types";
import { normalizeSender } from "../routing/normalizeSender";
import { applyAliases } from "../routing/senderAliases";
import { deriveDisplayName } from "../routing/displayName";
import { extractAmount } from "./amount";
import { extractMerchant } from "./merchant";
import { inferType } from "./type";
import { categorize } from "./categorize";
import { scoreConfidence } from "./confidence";

const FINANCIAL_KEYWORDS = [
    "debit",
    "credit",
    "paid",
    "sent",
    "received",
    "transfer",
    "charged",
    "purchase",
    "withdrawal",
    "deposit",
    "salary",
    "refund",
    "bought",
    "deducted",
    "spent",
    "payout",
    "reversal",
];

const SPAM_KEYWORDS = [
    "won",
    "winner",
    "promo",
    "offer",
    "reward",
    "discount",
    "congratulations",
    "lottery",
    "click here",
    "claim now",
    "free gift",
];

export function parse(event: RawEvent, categories: Category[]): ParsedDraft | null {
    const text = event.body ?? "";
    if (!text) return null;

    const lower = text.toLowerCase();
    const financialHits = FINANCIAL_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    const spamHits = SPAM_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    if (financialHits === 0) return null;
    if (spamHits > financialHits) return null;

    const amountResult = extractAmount(text);
    if (amountResult.amount === null) return null;

    const merchant = extractMerchant(text);
    const typeResult = inferType(text);
    const effectiveType = typeResult.type;
    const category = categorize(merchant, text, effectiveType, categories);

    const confidence = scoreConfidence({
        hasAmount: true,
        hasCurrency: amountResult.currencyCode !== null,
        hasMerchant: merchant !== null,
        typeStrength: typeResult.strength,
        categoryConfident: category.confident,
        hasFinancialKeyword: financialHits > 0,
    });

    const rawSenderId = event.source === "sms" ? event.sender ?? "" : event.packageName ?? "";
    const senderKey = applyAliases(normalizeSender(event.source, rawSenderId));
    const senderDisplay = deriveDisplayName(event.source, rawSenderId);

    return {
        amount: amountResult.amount,
        currencyCode: amountResult.currencyCode,
        merchant,
        type: effectiveType,
        category: category.category,
        description: merchant ?? (effectiveType === "income" ? "Auto income" : "Auto expense"),
        occurredAt: new Date(event.timestamp).toISOString(),
        confidence,
        source: event.source,
        sourceApp: event.packageName,
        senderKey,
        senderDisplay,
        rawText: text,
    };
}
