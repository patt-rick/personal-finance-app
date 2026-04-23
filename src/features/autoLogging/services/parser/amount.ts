export interface AmountResult {
    amount: number | null;
    currencyCode: string | null;
}

const SYMBOL_TO_CODE: Record<string, string> = {
    "$": "USD",
    "us$": "USD",
    "€": "EUR",
    "£": "GBP",
    "₵": "GHS",
    "gh₵": "GHS",
};

const CURRENCY_CODES = ["GHS", "USD", "EUR", "GBP"] as const;

const NUMBER = String.raw`\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;
const SYMBOL = String.raw`GH₵|US\$|[$€£₵]`;
const CODE = String.raw`GHS|USD|EUR|GBP`;

const PREFIX_RE = new RegExp(String.raw`(${CODE}|${SYMBOL})\s*(${NUMBER})`, "i");
const SUFFIX_RE = new RegExp(String.raw`(${NUMBER})\s*(${CODE}|${SYMBOL})`, "i");

export function extractAmount(text: string): AmountResult {
    const prefix = PREFIX_RE.exec(text);
    if (prefix) {
        return { amount: toNumber(prefix[2]), currencyCode: toCode(prefix[1]) };
    }
    const suffix = SUFFIX_RE.exec(text);
    if (suffix) {
        return { amount: toNumber(suffix[1]), currencyCode: toCode(suffix[2]) };
    }
    return { amount: null, currencyCode: null };
}

function toNumber(raw: string): number | null {
    const cleaned = raw.replace(/,/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

function toCode(raw: string): string | null {
    const upper = raw.toUpperCase();
    if ((CURRENCY_CODES as readonly string[]).includes(upper)) return upper;
    return SYMBOL_TO_CODE[raw.toLowerCase()] ?? null;
}
