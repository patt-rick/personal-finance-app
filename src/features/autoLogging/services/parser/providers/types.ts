import { RawEvent, SemanticType, ParsedDraft } from "../../../types";

export interface ParseInput {
    event: RawEvent;
    text: string;
    lower: string;
    senderKey: string;
}

export interface ParseOutput {
    amount: number;
    currencyCode: string | null;
    merchant: string | null;
    reference?: string;
    type: ParsedDraft["type"];
    semanticType: SemanticType;
    occurredAt: number;
    baseConfidence: number;
}

export interface ProviderTemplate {
    id: string;
    priority: number;
    senderMatch: RegExp;
    bodyMatch: RegExp[];
    parse(input: ParseInput): ParseOutput | null;
}
