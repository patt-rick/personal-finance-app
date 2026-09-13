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

const NUMBER_BODY = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,3}(?:\s\d{3})+(?:\.\d{1,2})?(?![A-Za-z])|\d+(?:\.\d{1,2})?`;
const SYMBOL_GROUP = String.raw`GH₵|GH¢|US\$|[$€£₵₦]`;
const CODE_GROUP = String.raw`GHS|GHC|USD|EUR|GBP|NGN|KES`;
const PREFIX_CURRENCY = String.raw`\b(?:${CODE_GROUP})|${SYMBOL_GROUP}`;
const SUFFIX_CURRENCY = String.raw`(?:${CODE_GROUP})\b|${SYMBOL_GROUP}`;
const MAGNITUDE = String.raw`(?:\s*([kKmM])\b)?`;

const PREFIX_RE = new RegExp(
    String.raw`(${PREFIX_CURRENCY})\s*(${NUMBER_BODY})${MAGNITUDE}`,
    "gi",
);
const SUFFIX_RE = new RegExp(
    String.raw`(${NUMBER_BODY})${MAGNITUDE}\s*(${SUFFIX_CURRENCY})`,
    "gi",
);

const BALANCE_HINT_RE = /\b(bal(?:ance)?|avail(?:able)?|new\s+bal|remaining)\b/gi;
const BALANCE_PROXIMITY = 40;
const ACCOUNT_NUMBER_HINT_RE = /\b(acc(?:t|ount)?(?:\s*(?:no|number))?|a\/c)\b\s*[:#]?\s*$/i;
const FEE_HINT_RE = /\b(fee|fees|commission|levy|surcharge|stamp\s*duty|vat|service\s*charge|transaction\s*charge|tax|withholding)\b/i;

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

    candidates.sort((a, b) => a.index - b.index);
    markBalanceCandidates(text, candidates);

    const filtered = candidates.filter((c) => !c.suspectedAccount);
    const pool = filtered.length > 0 ? filtered : candidates;

    const primary = pool.filter((c) => !c.suspectedBalance && !c.suspectedFee);
    if (primary.length > 0) {
        const first = primary[0];
        const feeCandidates = pool.filter(
            (c) => c.suspectedFee && !c.suspectedBalance && c.currencyCode === first.currencyCode,
        );
        const fee = feeCandidates.length > 0
            ? feeCandidates.reduce((sum, c) => sum + c.amount, 0)
            : undefined;
        return {
            amount: first.amount,
            currencyCode: first.currencyCode,
            fee,
        };
    }

    const nonBalance = pool.filter((c) => !c.suspectedBalance);
    if (nonBalance.length > 0) {
        const first = nonBalance[0];
        return { amount: first.amount, currencyCode: first.currencyCode };
    }

    return NO_AMOUNT;
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
            suspectedBalance: false,
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
            suspectedBalance: false,
            suspectedAccount: looksLikeAccountNumber(numberToken, magnitudeToken),
            suspectedFee: looksLikeFee(text, match.index),
        });
    }
}

function markBalanceCandidates(text: string, candidates: AmountCandidate[]): void {
    BALANCE_HINT_RE.lastIndex = 0;
    let hint: RegExpExecArray | null;
    while ((hint = BALANCE_HINT_RE.exec(text)) !== null) {
        const hintStart = hint.index;
        const hintEnd = hint.index + hint[0].length;
        const [sentenceStart, sentenceEnd] = sentenceBounds(text, hintStart, hintEnd);
        let nearest: AmountCandidate | null = null;
        let nearestGap = Infinity;
        for (const c of candidates) {
            if (c.index < sentenceStart || c.index >= sentenceEnd) continue;
            const gap = candidateHintGap(c, hintStart, hintEnd);
            if (gap < nearestGap) {
                nearestGap = gap;
                nearest = c;
            }
        }
        if (nearest && nearestGap <= BALANCE_PROXIMITY) nearest.suspectedBalance = true;
    }
}

const SENTENCE_END_RE = /[.!?](?=\s|$)/g;

function sentenceBounds(text: string, from: number, to: number): [number, number] {
    SENTENCE_END_RE.lastIndex = 0;
    let start = 0;
    let boundary: RegExpExecArray | null;
    while ((boundary = SENTENCE_END_RE.exec(text)) !== null) {
        if (boundary.index >= from) break;
        start = boundary.index + 1;
    }
    SENTENCE_END_RE.lastIndex = to;
    const next = SENTENCE_END_RE.exec(text);
    const end = next ? next.index : text.length;
    return [start, end];
}

function candidateHintGap(c: AmountCandidate, hintStart: number, hintEnd: number): number {
    const candStart = c.index;
    const candEnd = c.index + c.matchLength;
    if (candStart >= hintEnd) return candStart - hintEnd;
    if (hintStart >= candEnd) return hintStart - candEnd;
    return 0;
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

const TXN_ID_PATTERN = /\btxn\s*id[:#\s-]*(.+)/i;
const TRANSACTION_ID_PATTERN = /\btransaction\s*id[:#\s-]*(.+)/i;
const TRANS_ID_PATTERN = /\btrans\s*id[:#\s-]*(.+)/i;
const REF_PATTERN = /\b(?:reference|ref(?:erence)?\.?|ref\s*no\.?|ref#|sender\s*reference|beneficiary\s*reference)[:#\s-]*(.+)/i;
const NARRATION_PATTERN = /\b(?:narration|remark|memo|particulars|description)[:#\s-]*(.+)/i;
const RECEIPT_PATTERN = /\breceipt\s*(?:no\.?|number|#)?[:#\s-]*(.+)/i;
const TOKEN_PATTERN = /\btoken[:#\s-]*(.+)/i;
const ID_PATTERN = /\bid[:#\s-]+([A-Z0-9]{6,}[A-Za-z0-9 .\-/_]*)/i;

const STRONG_REFERENCE_PATTERNS: RegExp[] = [
    TXN_ID_PATTERN,
    TRANSACTION_ID_PATTERN,
    TRANS_ID_PATTERN,
    REF_PATTERN,
    RECEIPT_PATTERN,
    TOKEN_PATTERN,
    ID_PATTERN,
];

const REFERENCE_PATTERNS: RegExp[] = [
    TXN_ID_PATTERN,
    TRANSACTION_ID_PATTERN,
    TRANS_ID_PATTERN,
    REF_PATTERN,
    NARRATION_PATTERN,
    RECEIPT_PATTERN,
    TOKEN_PATTERN,
    ID_PATTERN,
];

const REFERENCE_BOUNDARY_RE = /\b(?:from|to|for|via|balance|bal|avail(?:able)?|amount|fee|fees|commission|levy|surcharge|vat|new\s+bal|current\s+bal(?:ance)?)\b/i;

function matchReference(rawText: string, patterns: RegExp[]): string | null {
    const text = normalizeText(rawText);
    if (!text) return null;
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (!match) continue;
        const cleaned = cleanReferenceValue(match[1]);
        if (cleaned) return cleaned;
    }
    return null;
}

export function extractReference(rawText: string): string | null {
    return matchReference(rawText, REFERENCE_PATTERNS);
}

export function extractStrongReference(rawText: string): string | null {
    const value = matchReference(rawText, STRONG_REFERENCE_PATTERNS);
    if (!value) return null;
    if (!/\d/.test(value)) return null;
    if (/\s/.test(value)) return null;
    return value;
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
    /\bpaid\s+to\s+([A-Za-z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bpurchase\s+at\s+([A-Za-z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bat\s+([A-Za-z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bto\s+([A-Za-z][A-Za-z0-9&'.\- ]{1,60})/,
    /\bfrom\s+([A-Za-z][A-Za-z0-9&'.\- ]{1,60})/,
    /@\s*([A-Za-z][A-Za-z0-9&'.\- ]{1,60})/,
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

const SENTENCE_BOUNDARY_RE = /[.!?](?:\s|[A-Z])/g;
const PRECEDING_TOKEN_RE = /([A-Za-z]+)$/;

function cleanCandidate(raw: string): string | null {
    let bounded = raw;
    SENTENCE_BOUNDARY_RE.lastIndex = 0;
    let boundary: RegExpExecArray | null;
    while ((boundary = SENTENCE_BOUNDARY_RE.exec(bounded)) !== null) {
        if (boundary.index <= 0) continue;
        const precedingToken = PRECEDING_TOKEN_RE.exec(bounded.slice(0, boundary.index));
        if (precedingToken && precedingToken[1].length >= 3) {
            bounded = bounded.slice(0, boundary.index);
            break;
        }
    }
    const trimmed = bounded.replace(MERCHANT_TAIL_RE, "").trim();
    const words = trimmed.split(/\s+/);
    const keep: string[] = [];
    for (const word of words) {
        const bare = word.replace(/[.,;:!?]+$/, "");
        if (!bare) break;
        if (MERCHANT_STOP_WORDS.has(bare.toLowerCase())) break;
        if (/^\d/.test(bare)) break;
        keep.push(preserveAbbreviationDots(word));
    }
    const result = keep.join(" ").trim();
    return result.length >= 2 ? result : null;
}

function preserveAbbreviationDots(word: string): string {
    return word.replace(/([A-Za-z]{3,})\.+$/, "$1").replace(/[,;:!?]+$/, "");
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
