import { Category } from "../../../../types";
import { ParsedDraft, RawEvent, SemanticType } from "../../types";
import { extractAmount, extractMerchant, extractReference, normalizeText } from "./normalize";
import { applyAliases } from "../routing/senderAliases";
import { normalizeSender } from "../routing/normalizeSender";
import { deriveDisplayName } from "../routing/displayName";
import { categorize } from "./categorize";
import { scoreConfidence } from "./confidence";

const FINANCIAL_PATTERNS: RegExp[] = [
    /\bdebit(?:ed)?\b/i,
    /\bcredit(?:ed)?\b/i,
    /\b(?:paid|spent)\b[^.!?\n]{0,40}\b(?:to|at|via|on|towards?)\b/i,
    /\bamount\s+(?:paid|spent|debited|credited)\b/i,
    /\bsuccessfully\s+(?:paid|sent|received|transferred)\b/i,
    /\b(?:received|deposited)\b[^.!?\n]{0,40}\bfrom\b/i,
    /\bpayment\s+(?:received|sent|to|from|made|of)\b/i,
    /\b(?:you\s+have\s+)?(?:sent|received|paid|spent)\s+(?:GHS|GHC|USD|EUR|GBP|NGN|KES)\b/i,
    /\btransfer(?:r?ed)?\b/i,
    /\bcharged\b/i,
    /\bpurchase[ds]?\b/i,
    /\bwithdraw(?:al|n|ed)?\b/i,
    /\bdeposit(?:ed)?\b/i,
    /\bsalary\b/i,
    /\brefund(?:ed)?\b/i,
    /\bbought\b/i,
    /\bdeducted\b/i,
    /\bpayout\b/i,
    /\breversal\b/i,
    /\bcash[\s-]*(?:in|out)\b/i,
];

const SPAM_PATTERNS: RegExp[] = [
    /\b(?:congratulations|congrats)\b/i,
    /\b(?:you\s+won|winner)\b/i,
    /\b(?:promo|promotion|promotional)\b/i,
    /\boffer\b/i,
    /\breward\b/i,
    /\bdiscount\b/i,
    /\blottery\b/i,
    /\bclick\s+here\b/i,
    /\bclaim\s+now\b/i,
    /\bfree\s+gift\b/i,
    /\b(?:get|getting|gets|got)\s+paid\b/i,
    /\byou(?:'|')?ll?\s+get\s+paid\b/i,
    /\bpaid\s+for\s+testing\b/i,
    /\bdrop\s+your\b/i,
    /\bbefore\s+(?:it(?:'|')?s\s+)?too\s+late\b/i,
    /\bget\s+in\s+now\b/i,
    /\b(?:dm|pm)\s+me\b/i,
    /\b(?:airdrop|presale|whitelist|giveaway)\b/i,
    /\b(?:sol|solana|btc|bitcoin|eth|ethereum|usdt|usdc)\s+(?:address|wallet)\b/i,
    /\bwallet\s+address\b/i,
    /\btest\s+the\s+app\b/i,
    /\b(?:t\.me|bit\.ly|tinyurl|t\.co)\//i,
];

const EXPENSE_PATTERNS: RegExp[] = [
    /\bdebit/i,
    /\b(?:paid|spent)\b[^.!?\n]{0,40}\b(?:to|at|via|on|towards?)\b/i,
    /\bamount\s+(?:paid|spent)\b/i,
    /\bpayment\s+(?:to|sent|made|of)\b/i,
    /\bcharged\b/i,
    /\bpurchase[ds]?\b/i,
    /\bwithdraw(al|n)?\b/i,
    /\bbought\b/i,
    /\bdeducted\b/i,
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

    const financialHits = countMatches(text, FINANCIAL_PATTERNS);
    const spamHits = countMatches(text, SPAM_PATTERNS);
    if (financialHits === 0) return null;
    if (spamHits > 0 && financialHits <= spamHits) return null;

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
