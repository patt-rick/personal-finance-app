export const MAX_PLAUSIBLE_AMOUNT = 1_000_000_000;

const STRONG_SPAM: RegExp[] = [
    /\b(?:you\s+won|winner)\b/i,
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
    /\b(?:bullish|bearish)\b/i,
    /\bmoney\s+printer\b/i,
    /\bt-?bill(?:s|\s+purchases?)?\b/i,
    /\b(?:fed|federal\s+reserve)\s+(?:will|is|injects?|injecting|continues?|continuing|prints?|printing|raises?|cuts?)\b/i,
    /\bmarkets?\s+(?:open|close|crash|rall(?:y|ies)|tomorrow|today)\b/i,
    /\b(?:stock|crypto)\s+market\b/i,
    /\bwall\s+street\b/i,
    /(?:^|[^A-Za-z0-9])(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i,
];

const SOFT_PROMO: RegExp[] = [
    /\b(?:congratulations|congrats)\b/i,
    /\b(?:promo|promotion|promotional)\b/i,
    /\boffer\b/i,
    /\breward\b/i,
    /\bdiscount\b/i,
    /\bt&cs?\b/i,
    /\bterms\s+(?:and|&)\s+conditions\b/i,
    /\bunlimited\b/i,
    /\bfree\s+(?:gift|data|airtime|bundle|transfers?)\b/i,
    /\b\d+\s?(?:mb|gb)\s+(?:free|bonus|data|bundle)\b/i,
    /\benjoy\b[^.!?]{0,40}\bbonus\b/i,
];

export const SPAM_PATTERNS: RegExp[] = STRONG_SPAM;

const COMPLETION_RE = new RegExp(
    [
        "(?:has|have|had|was|were|been)\\s+(?:been\\s+)?(?:debited|credited|paid|sent|charged|received|deducted|reversed|withdrawn|deposited|transferred)",
        "(?<!\\bbe\\s)\\b(?:debited|credited|withdrawn|deducted|deposited)\\b",
        "\\bpayment\\s+(?:received|confirmed|successful)\\b",
        "\\bpayment\\s+made\\b",
        "\\b(?:sent|paid|transferred)\\b(?:[^.!?]|\\.\\d){0,30}\\bto\\b",
        "\\b(?:successful(?:ly)?|completed)\\b",
        "\\bthank\\s+you\\s+for\\s+your\\s+payment\\b",
        "\\bcash[\\s-]?(?:out|in)\\s+made\\b",
        "\\bcash[\\s-]?(?:out|in)\\b[^.!?]{0,20}\\bsuccessful\\b",
        "\\b(?:debit|credit)\\s+alert\\b",
        "\\breceipt\\b",
    ].join("|"),
    "i",
);

const FUTURE_DEBIT_RE = /\bwill\s+be\s+(?:debited|charged|deducted)\b/i;
const PREAUTH_RE =
    /\b(?:otp|one[\s-]?time\s?(?:pass(?:word|code)|code|pin)|do not share|about\s+to\s+(?:pay|send)|authoriz(?:e|ed|ing|ation)?|authoris(?:e|ed|ing|ation)?|enter\s+your\s+(?:pin|otp|passcode|password)|to\s+(?:confirm|approve|authoriz))\b/i;
const REVERSAL_RE = /\b(reversed|reversal)\b/i;
const REMINDER_RE =
    /\b(reminder|is\s+due|due\s+on|avoid\s+disconnection|kindly\s+pay|please\s+pay|pay\s+before|outstanding\s+balance|overdue)\b/i;

export function hasCompletionVerb(text: string): boolean {
    return COMPLETION_RE.test(text);
}

export function isImplausibleAmount(n: number): boolean {
    return !Number.isFinite(n) || n <= 0 || n > MAX_PLAUSIBLE_AMOUNT;
}

export function isPromo(text: string): boolean {
    return SOFT_PROMO.some((pattern) => pattern.test(text)) && !hasCompletionVerb(text);
}

export function isSpam(text: string): boolean {
    if (STRONG_SPAM.some((pattern) => pattern.test(text))) return true;
    return SOFT_PROMO.some((pattern) => pattern.test(text)) && !hasCompletionVerb(text);
}

export function isPreAuthPrompt(text: string): boolean {
    return (FUTURE_DEBIT_RE.test(text) || PREAUTH_RE.test(text)) && !hasCompletionVerb(text);
}

export function isReversalDebit(text: string): boolean {
    return REVERSAL_RE.test(text);
}

export function isBillReminder(text: string): boolean {
    return REMINDER_RE.test(text) && !hasCompletionVerb(text);
}
