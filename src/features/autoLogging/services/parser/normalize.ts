export interface AmountResult {
    amount: number | null;
    currencyCode: string | null;
    fee?: number;
}

const NO_AMOUNT: AmountResult = { amount: null, currencyCode: null };

const SYMBOL_TO_CODE: Record<string, string> = {
    "$": "USD",
    "us$": "USD",
    "€": "EUR",
    "£": "GBP",
    "₵": "GHS",
    "gh₵": "GHS",
    "gh¢": "GHS",
    "₦": "NGN",
};

const CURRENCY_CODES = ["GHS", "USD", "EUR", "GBP", "NGN", "KES"] as const;

const ZERO_WIDTH_RE = /[​-‍﻿]/g;
const CURLY_QUOTES_RE = /[‘’]/g;
const DOUBLE_CURLY_QUOTES_RE = /[“”]/g;
const CEDIS_TOKEN_RE = /\b(?:gh¢|gh₵|ghc|ghs|cedis?)\b/gi;

export function normalizeText(input: string): string {
    if (!input) return "";
    return input
        .replace(ZERO_WIDTH_RE, "")
        .replace(CURLY_QUOTES_RE, "'")
        .replace(DOUBLE_CURLY_QUOTES_RE, '"')
        .replace(/\s+/g, " ")
        .trim();
}

export function lowerKey(input: string): string {
    return normalizeText(input).toLowerCase();
}

const NUMBER_BODY = String.raw`\d{1,3}(?:[,\s]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;
const SYMBOL_GROUP = String.raw`GH₵|GH¢|US\$|[$€£₵₦]`;
const CODE_GROUP = String.raw`GHS|GHC|USD|EUR|GBP|NGN|KES`;
const MAGNITUDE = String.raw`(?:\s*([kKmM])\b)?`;

const PREFIX_RE = new RegExp(
    String.raw`(${CODE_GROUP}|${SYMBOL_GROUP})\s*(${NUMBER_BODY})${MAGNITUDE}`,
    "gi",
);
const SUFFIX_RE = new RegExp(
    String.raw`(${NUMBER_BODY})${MAGNITUDE}\s*(${CODE_GROUP}|${SYMBOL_GROUP})`,
    "gi",
);

const BALANCE_HINT_RE = /\b(bal(?:ance)?|avail(?:able)?|new\s+bal|remaining)\b/i;
const ACCOUNT_NUMBER_HINT_RE = /\b(acc(?:t|ount)?(?:\s*(?:no|number))?|a\/c)\b\s*[:#]?\s*$/i;
const FEE_HINT_RE = /\b(fee|fees|commission|levy|surcharge|stamp\s*duty|vat|service\s*charge|transaction\s*charge)\b/i;

interface AmountCandidate {
    amount: number;
    currencyCode: string | null;
    index: number;
    matchLength: number;
    suspectedBalance: boolean;
    suspectedAccount: boolean;
    suspectedFee: boolean;
}

export function extractAmount(rawText: string): AmountResult {
    const text = normalizeText(rawText);
    if (!text) return NO_AMOUNT;
    const candidates: AmountCandidate[] = [];

    walkPrefix(text, candidates);
    walkSuffix(text, candidates);

    if (candidates.length === 0) return NO_AMOUNT;

    const filtered = candidates.filter((c) => !c.suspectedAccount);
    const pool = filtered.length > 0 ? filtered : candidates;

    const primary = pool.filter((c) => !c.suspectedBalance && !c.suspectedFee);
    if (primary.length > 0) {
        const last = primary[primary.length - 1];
        const feeCandidate = pool.find((c) => c.suspectedFee && c.currencyCode === last.currencyCode);
        return {
            amount: last.amount,
            currencyCode: last.currencyCode,
            fee: feeCandidate?.amount,
        };
    }

    const nonBalance = pool.filter((c) => !c.suspectedBalance);
    if (nonBalance.length > 0) {
        const last = nonBalance[nonBalance.length - 1];
        return { amount: last.amount, currencyCode: last.currencyCode };
    }

    const last = pool[pool.length - 1];
    return { amount: last.amount, currencyCode: last.currencyCode };
}

function walkPrefix(text: string, out: AmountCandidate[]): void {
    PREFIX_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PREFIX_RE.exec(text)) !== null) {
        const [whole, currencyToken, numberToken, magnitudeToken] = match;
        const amount = applyMagnitude(toNumber(numberToken), magnitudeToken);
        if (amount === null) continue;
        out.push({
            amount,
            currencyCode: toCode(currencyToken),
            index: match.index,
            matchLength: whole.length,
            suspectedBalance: looksLikeBalance(text, match.index),
            suspectedAccount: looksLikeAccountNumber(numberToken, magnitudeToken),
            suspectedFee: looksLikeFee(text, match.index),
        });
    }
}

function walkSuffix(text: string, out: AmountCandidate[]): void {
    SUFFIX_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SUFFIX_RE.exec(text)) !== null) {
        const [whole, numberToken, magnitudeToken, currencyToken] = match;
        const amount = applyMagnitude(toNumber(numberToken), magnitudeToken);
        if (amount === null) continue;
        out.push({
            amount,
            currencyCode: toCode(currencyToken),
            index: match.index,
            matchLength: whole.length,
            suspectedBalance: looksLikeBalance(text, match.index),
            suspectedAccount: looksLikeAccountNumber(numberToken, magnitudeToken),
            suspectedFee: looksLikeFee(text, match.index),
        });
    }
}

function looksLikeBalance(text: string, index: number): boolean {
    const start = Math.max(0, index - 24);
    return BALANCE_HINT_RE.test(text.slice(start, index));
}

function looksLikeFee(text: string, index: number): boolean {
    const start = Math.max(0, index - 24);
    return FEE_HINT_RE.test(text.slice(start, index));
}

function looksLikeAccountNumber(numberToken: string, magnitudeToken: string | undefined): boolean {
    if (magnitudeToken) return false;
    const digits = numberToken.replace(/[^\d]/g, "");
    if (digits.length < 10) return false;
    if (numberToken.includes(".")) return false;
    if (numberToken.includes(",") || numberToken.includes(" ")) return false;
    return true;
}

function toNumber(raw: string): number | null {
    const cleaned = raw.replace(/[,\s]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

function applyMagnitude(value: number | null, token: string | undefined): number | null {
    if (value === null) return null;
    if (!token) return value;
    const t = token.toLowerCase();
    if (t === "k") return value * 1000;
    if (t === "m") return value * 1_000_000;
    return value;
}

function toCode(raw: string): string | null {
    const upper = raw.toUpperCase();
    if (upper === "GHC") return "GHS";
    if ((CURRENCY_CODES as readonly string[]).includes(upper)) return upper;
    return SYMBOL_TO_CODE[raw.toLowerCase()] ?? null;
}

const REFERENCE_PATTERNS: RegExp[] = [
    /\btxn\s*id[:#\s-]*(.+)/i,
    /\btransaction\s*id[:#\s-]*(.+)/i,
    /\btrans\s*id[:#\s-]*(.+)/i,
    /\b(?:reference|ref(?:erence)?\.?|ref\s*no\.?|ref#|sender\s*reference|beneficiary\s*reference)[:#\s-]*(.+)/i,
    /\b(?:narration|remark|memo|particulars|description)[:#\s-]*(.+)/i,
    /\breceipt\s*(?:no\.?|number|#)?[:#\s-]*(.+)/i,
    /\btoken[:#\s-]*(.+)/i,
    /\bid[:#\s-]+([A-Z0-9]{6,}[A-Za-z0-9 .\-/_]*)/i,
];

const REFERENCE_BOUNDARY_RE = /\b(?:from|to|for|via|balance|bal|avail(?:able)?|amount|fee|fees|commission|levy|surcharge|vat|new\s+bal|current\s+bal(?:ance)?)\b/i;

export function extractReference(rawText: string): string | null {
    const text = normalizeText(rawText);
    if (!text) return null;
    for (const pattern of REFERENCE_PATTERNS) {
        const match = pattern.exec(text);
        if (!match) continue;
        const cleaned = cleanReferenceValue(match[1]);
        if (cleaned) return cleaned;
    }
    return null;
}

function cleanReferenceValue(raw: string): string | null {
    let value = raw.trim();

    const sentenceMatch = /\.\s+[A-Z]/.exec(value);
    if (sentenceMatch && sentenceMatch.index > 0) {
        value = value.slice(0, sentenceMatch.index);
    }

    const boundaryMatch = REFERENCE_BOUNDARY_RE.exec(value);
    if (boundaryMatch && boundaryMatch.index > 0) {
        value = value.slice(0, boundaryMatch.index);
    }

    const trailingWordMatch = /\s+[a-z]+(?:\s|$)/.exec(value);
    if (trailingWordMatch && trailingWordMatch.index > 0) {
        value = value.slice(0, trailingWordMatch.index);
    }

    value = value.trim().replace(/[.,;:!?]+$/, "").trim();
    if (value.length > 60) value = value.slice(0, 60).trim();

    const alphanumericCount = (value.match(/[A-Za-z0-9]/g) ?? []).length;
    if (alphanumericCount < 4) return null;

    return value;
}

const MERCHANT_PATTERNS: RegExp[] = [
    /\bpaid\s+to\s+([A-Z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bpurchase\s+at\s+([A-Z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bat\s+([A-Z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bto\s+([A-Z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bfrom\s+([A-Z][A-Za-z0-9&'.\- ]{1,60})/,
    /@\s*([A-Z][A-Za-z0-9&'.\- ]{1,60})/,
];

const MERCHANT_STOP_WORDS = new Set([
    "on",
    "for",
    "via",
    "ref",
    "reference",
    "bal",
    "balance",
    "acct",
    "account",
    "txn",
    "transaction",
    "id",
    "trans",
    "receipt",
    "token",
    "fee",
    "charge",
    "you",
    "us",
    "your",
]);

const MERCHANT_TAIL_RE = /\s+(?:on|via|ref|reference|txn|trans|fee|charge|bal|balance|acct|account|receipt|token|to|from|at)\b.*$/i;

export function extractMerchant(rawText: string, hint?: string): string | null {
    const text = normalizeText(rawText);
    if (!text) return null;
    const order = orderPatternsByHint(MERCHANT_PATTERNS, hint);
    for (const pattern of order) {
        const match = pattern.exec(text);
        if (!match) continue;
        const cleaned = cleanCandidate(match[1]);
        if (cleaned) return cleaned;
    }
    return null;
}

function orderPatternsByHint(patterns: RegExp[], hint: string | undefined): RegExp[] {
    if (!hint) return patterns;
    const h = hint.toLowerCase();
    const preferred: RegExp[] = [];
    const rest: RegExp[] = [];
    for (const p of patterns) {
        const src = p.source.toLowerCase();
        if (src.includes(h)) preferred.push(p);
        else rest.push(p);
    }
    return [...preferred, ...rest];
}

function cleanCandidate(raw: string): string | null {
    const trimmed = raw.replace(MERCHANT_TAIL_RE, "").trim();
    const words = trimmed.split(/\s+/);
    const keep: string[] = [];
    for (const word of words) {
        const stripped = word.replace(/[.,;:!?]+$/, "");
        if (!stripped) break;
        if (MERCHANT_STOP_WORDS.has(stripped.toLowerCase())) break;
        if (/^\d/.test(stripped)) break;
        keep.push(stripped);
    }
    const result = keep.join(" ").trim();
    return result.length >= 2 ? result : null;
}

export function normalizeMerchantKey(merchant: string | null | undefined): string {
    return (merchant ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

export function normalizeCedisTokens(rawText: string): string {
    return normalizeText(rawText).replace(CEDIS_TOKEN_RE, (m) => {
        const lower = m.toLowerCase();
        if (lower === "ghc" || lower === "gh¢" || lower === "gh₵") return "GHS";
        if (lower.startsWith("cedi")) return "GHS";
        return m.toUpperCase();
    });
}
