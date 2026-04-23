export interface TypeResult {
    type: "expense" | "income" | "transfer";
    strength: number;
}

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

export function inferType(text: string): TypeResult {
    const expenseHits = countMatches(text, EXPENSE_PATTERNS);
    const incomeHits = countMatches(text, INCOME_PATTERNS);
    const transferHits = countMatches(text, TRANSFER_PATTERNS);

    if (incomeHits > expenseHits && incomeHits > transferHits) {
        return { type: "income", strength: Math.min(1, incomeHits / 2) };
    }
    if (transferHits > 0 && transferHits >= expenseHits && transferHits >= incomeHits) {
        return { type: "transfer", strength: Math.min(1, transferHits / 2) };
    }
    return { type: "expense", strength: Math.min(1, Math.max(expenseHits, 1) / 2) };
}

function countMatches(text: string, patterns: RegExp[]): number {
    let count = 0;
    for (const pattern of patterns) {
        if (pattern.test(text)) count++;
    }
    return count;
}
