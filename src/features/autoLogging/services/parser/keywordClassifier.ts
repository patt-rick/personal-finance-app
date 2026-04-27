import { Category } from "../../../../types";
import { ParsedDraft, RawEvent, SemanticType } from "../../types";
import { extractAmount, extractMerchant, extractReference, lowerKey, normalizeText } from "./normalize";
import { applyAliases } from "../routing/senderAliases";
import { normalizeSender } from "../routing/normalizeSender";
import { deriveDisplayName } from "../routing/displayName";
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
    "withdrawn",
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

const EXPENSE_PATTERNS: RegExp[] = [
    /\bdebit/i,
    /\bpaid\b/i,
    /\bpayment\b/i,
    /\bcharged\b/i,
    /\bpurchase[ds]?\b/i,
    /\bwithdraw(al|n)?\b/i,
    /\bbought\b/i,
    /\bdeducted\b/i,
    /\bspent\b/i,
    /\bcash\s*out\b/i,
];

const INCOME_PATTERNS: RegExp[] = [
    /\bcredit/i,
    /\breceived\b/i,
    /\brefund\b/i,
    /\bdeposit\b/i,
    /\bsalary\b/i,
    /\bpayout\b/i,
    /\bcash\s*in\b/i,
    /\breversal\b/i,
];

const TRANSFER_PATTERNS: RegExp[] = [
    /\btransfer\b/i,
    /\bsent\b[^.]{0,40}\bto\b/i,
    /\bsend\b[^.]{0,40}\bto\b/i,
    /\bp2p\b/i,
];

const MAX_FALLBACK_CONFIDENCE = 0.5;

interface ClassifyResult {
    type: ParsedDraft["type"];
    semanticType: SemanticType;
    strength: number;
}

export function classify(text: string): ClassifyResult | null {
    const expenseHits = countMatches(text, EXPENSE_PATTERNS);
    const incomeHits = countMatches(text, INCOME_PATTERNS);
    const transferHits = countMatches(text, TRANSFER_PATTERNS);

    if (expenseHits === 0 && incomeHits === 0 && transferHits === 0) return null;

    if (incomeHits > expenseHits && incomeHits > transferHits) {
        return { type: "income", semanticType: "income", strength: Math.min(1, incomeHits / 2) };
    }
    if (transferHits > 0 && transferHits >= expenseHits && transferHits >= incomeHits) {
        return { type: "transfer", semanticType: "transfer", strength: Math.min(1, transferHits / 2) };
    }
    return {
        type: "expense",
        semanticType: "expense",
        strength: Math.min(1, Math.max(expenseHits, 1) / 2),
    };
}

export function classifyEvent(event: RawEvent, categories: Category[]): ParsedDraft | null {
    const text = normalizeText(event.body ?? "");
    if (!text) return null;

    const lower = lowerKey(text);
    const financialHits = FINANCIAL_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    const spamHits = SPAM_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    if (financialHits === 0) return null;
    if (spamHits > financialHits) return null;

    const amountResult = extractAmount(text);
    if (amountResult.amount === null) return null;

    const merchant = extractMerchant(text);
    const reference = extractReference(text) ?? undefined;
    const cls = classify(text);
    if (!cls) return null;

    const category = categorize(merchant, text, cls.type, categories);

    const rawConfidence = scoreConfidence({
        hasAmount: true,
        hasCurrency: amountResult.currencyCode !== null,
        hasMerchant: merchant !== null,
        typeStrength: cls.strength,
        categoryConfident: category.confident,
        hasFinancialKeyword: true,
    });
    const confidence = Math.min(MAX_FALLBACK_CONFIDENCE, rawConfidence);

    const rawSenderId = event.source === "sms" ? event.sender ?? "" : event.packageName ?? "";
    const senderKey = applyAliases(normalizeSender(event.source, rawSenderId));
    const senderDisplay = deriveDisplayName(event.source, rawSenderId);

    return {
        amount: amountResult.amount,
        currencyCode: amountResult.currencyCode,
        merchant,
        type: cls.type,
        category: category.category,
        description: merchant ?? (cls.type === "income" ? "Auto income" : "Auto expense"),
        occurredAt: new Date(event.timestamp).toISOString(),
        confidence,
        source: event.source,
        sourceApp: event.packageName,
        senderKey,
        senderDisplay,
        rawText: event.body,
        reference,
        semanticType: cls.semanticType,
    };
}

function countMatches(text: string, patterns: RegExp[]): number {
    let count = 0;
    for (const pattern of patterns) if (pattern.test(text)) count++;
    return count;
}
