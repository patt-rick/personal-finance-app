import { Category } from "../../../../types";
import { ParsedDraft, RawEvent } from "../../types";
import { applyAliases } from "../routing/senderAliases";
import { normalizeSender } from "../routing/normalizeSender";
import { deriveDisplayName } from "../routing/displayName";
import { lowerKey, normalizeText } from "./normalize";
import { categorize } from "./categorize";
import { scoreConfidence } from "./confidence";
import { getProviderTemplates, ProviderTemplate } from "./providers";
import { ParseInput, ParseOutput } from "./providers/types";
import { classifyEvent } from "./keywordClassifier";

let cachedTemplates: ProviderTemplate[] | null = null;

function templates(): ProviderTemplate[] {
    if (!cachedTemplates) cachedTemplates = getProviderTemplates();
    return cachedTemplates;
}

export function _resetTemplateCacheForTests(): void {
    cachedTemplates = null;
}

export function parseEvent(event: RawEvent, categories: Category[]): ParsedDraft | null {
    const text = normalizeText(event.body ?? "");
    if (!text) return null;
    const lower = lowerKey(text);

    const rawSenderId = event.source === "sms" ? event.sender ?? "" : event.packageName ?? "";
    const normalized = normalizeSender(event.source, rawSenderId);
    const senderKey = applyAliases(normalized);
    const senderHaystack = `${rawSenderId} ${normalized} ${senderKey} ${event.packageName ?? ""}`.toLowerCase();

    const input: ParseInput = { event, text, lower, senderKey };

    for (const template of templates()) {
        if (!template.senderMatch.test(senderHaystack)) continue;
        if (!matchesAllBody(lower, template.bodyMatch)) continue;
        const output = safeParse(template, input);
        if (!output) continue;
        return buildDraft(event, output, template.id, senderKey, rawSenderId, categories);
    }

    return classifyEvent(event, categories);
}

function matchesAllBody(lower: string, patterns: RegExp[]): boolean {
    for (const p of patterns) if (!p.test(lower)) return false;
    return true;
}

function safeParse(template: ProviderTemplate, input: ParseInput): ParseOutput | null {
    try {
        return template.parse(input);
    } catch {
        return null;
    }
}

function buildDraft(
    event: RawEvent,
    output: ParseOutput,
    providerId: string,
    senderKey: string,
    rawSenderId: string,
    categories: Category[],
): ParsedDraft {
    const senderDisplay = deriveDisplayName(event.source, rawSenderId);
    const persistedType = output.type;
    const category = categorize(output.merchant, event.body ?? "", persistedType, categories, output.semanticType, output.reference);

    const confidence = scoreConfidence({
        hasAmount: true,
        hasCurrency: output.currencyCode !== null,
        hasMerchant: output.merchant !== null,
        typeStrength: clampStrength(output.baseConfidence),
        categoryConfident: category.confident,
        hasFinancialKeyword: true,
    });
    const finalConfidence = output.reference ? Math.min(1, confidence + 0.05) : confidence;

    return {
        amount: output.amount,
        currencyCode: output.currencyCode,
        merchant: output.merchant,
        type: persistedType,
        category: category.category,
        description: deriveDescription(output, senderDisplay),
        occurredAt: new Date(output.occurredAt).toISOString(),
        confidence: finalConfidence,
        source: event.source,
        sourceApp: event.packageName,
        senderKey,
        senderDisplay,
        rawText: event.body,
        reference: output.reference,
        semanticType: output.semanticType,
        providerId,
    };
}

function deriveDescription(output: ParseOutput, senderDisplay: string): string {
    if (output.merchant) return output.merchant;
    if (output.semanticType === "bill") return `${senderDisplay} bill`;
    if (output.semanticType === "subscription") return `${senderDisplay} subscription`;
    if (output.type === "income") return "Auto income";
    return "Auto expense";
}

function clampStrength(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}
