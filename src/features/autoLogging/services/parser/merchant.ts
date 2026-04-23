const PATTERNS: RegExp[] = [
    /\bat\s+([A-Z][A-Za-z0-9&'.\- ]{1,40})/,
    /\bto\s+([A-Z][A-Za-z0-9&'.\- ]{1,40})/,
    /\bfrom\s+([A-Z][A-Za-z0-9&'.\- ]{1,40})/,
    /@\s*([A-Z][A-Za-z0-9&'.\- ]{1,40})/,
];

const STOP_WORDS = new Set([
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
]);

export function extractMerchant(text: string): string | null {
    for (const pattern of PATTERNS) {
        const match = pattern.exec(text);
        if (!match) continue;
        const cleaned = cleanCandidate(match[1]);
        if (cleaned) return cleaned;
    }
    return null;
}

function cleanCandidate(raw: string): string | null {
    const words = raw.trim().split(/\s+/);
    const keep: string[] = [];
    for (const word of words) {
        const stripped = word.replace(/[.,;:!?]+$/, "");
        if (!stripped) break;
        if (STOP_WORDS.has(stripped.toLowerCase())) break;
        if (/^\d/.test(stripped)) break;
        keep.push(stripped);
    }
    const result = keep.join(" ").trim();
    return result.length >= 2 ? result : null;
}
