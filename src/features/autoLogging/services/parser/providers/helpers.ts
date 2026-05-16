import { ParseInput, ParseOutput } from "./types";
import {
    extractAmount,
    extractMerchant,
    extractReference,
} from "../normalize";

const OUTGOING_TOKENS_RE = /\b(paid\s+to|sent\s+to|transferred\s+to|debit(?:ed)?|withdrawn|spent|charged)\b/i;
const INCOMING_TOKENS_RE = /\b(received\s+from|credit(?:ed)?|deposit|payment\s+from|inward)\b/i;
const STRONG_CREDIT_RE = /\b(payment\s+received|received\s+payment|received\s+from|you\s+have\s+received)\b/i;
const STRONG_DEBIT_RE = /\b(paid\s+to|sent\s+to|transferred\s+to|debit\s+alert|you\s+have\s+sent|withdrawn\s+at)\b/i;

export interface BaseDebitOpts {
    bodyMatch: RegExp[];
    semanticType?: ParseOutput["semanticType"];
    type?: ParseOutput["type"];
    baseConfidence?: number;
    merchantHint?: string;
}

export function buildDebit(input: ParseInput, opts: BaseDebitOpts): ParseOutput | null {
    if (hasConflict(input.text)) return null;
    if (STRONG_CREDIT_RE.test(input.text) && !STRONG_DEBIT_RE.test(input.text)) return null;
    return buildBase(input, {
        ...opts,
        type: opts.type ?? "expense",
        semanticType: opts.semanticType ?? "expense",
        baseConfidence: opts.baseConfidence ?? 0.85,
    });
}

export function buildCredit(input: ParseInput, opts: BaseDebitOpts): ParseOutput | null {
    if (hasConflict(input.text)) return null;
    if (STRONG_DEBIT_RE.test(input.text) && !STRONG_CREDIT_RE.test(input.text)) return null;
    return buildBase(input, {
        ...opts,
        type: opts.type ?? "income",
        semanticType: opts.semanticType ?? "income",
        baseConfidence: opts.baseConfidence ?? 0.85,
    });
}

function hasConflict(text: string): boolean {
    return OUTGOING_TOKENS_RE.test(text) && INCOMING_TOKENS_RE.test(text);
}

export function buildTransfer(input: ParseInput, opts: BaseDebitOpts): ParseOutput | null {
    return buildBase(input, {
        ...opts,
        type: opts.type ?? "transfer",
        semanticType: opts.semanticType ?? "transfer",
        baseConfidence: opts.baseConfidence ?? 0.8,
    });
}

function buildBase(input: ParseInput, opts: Required<Pick<BaseDebitOpts, "type" | "semanticType" | "baseConfidence">> & { merchantHint?: string }): ParseOutput | null {
    const amount = extractAmount(input.text);
    if (amount.amount === null) return null;
    const merchant = extractMerchant(input.text, opts.merchantHint);
    const reference = extractReference(input.text) ?? undefined;
    const finalAmount = (opts.type === "expense" || opts.type === "transfer")
        ? amount.amount + (amount.fee ?? 0)
        : amount.amount;
    return {
        amount: finalAmount,
        currencyCode: amount.currencyCode,
        merchant,
        reference,
        type: opts.type,
        semanticType: opts.semanticType,
        occurredAt: input.event.timestamp,
        baseConfidence: opts.baseConfidence,
    };
}

export function allMatch(lower: string, patterns: RegExp[]): boolean {
    for (const p of patterns) if (!p.test(lower)) return false;
    return true;
}

export function anyMatch(lower: string, patterns: RegExp[]): boolean {
    for (const p of patterns) if (p.test(lower)) return true;
    return false;
}
