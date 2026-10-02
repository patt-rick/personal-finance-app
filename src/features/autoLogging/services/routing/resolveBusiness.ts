import { Business } from "../../../../types";
import { ParsedDraft, SenderMapping, AutoLogSettings } from "../../types";
import { normalizeSender } from "./normalizeSender";

export interface ResolveResult {
    businessId: string;
    newBusiness?: Business;
    newMapping?: SenderMapping;
    ignore?: boolean;
}

export function resolveBusiness(
    draft: ParsedDraft,
    settings: AutoLogSettings,
    businesses: Business[],
    mappings: SenderMapping[],
    now: Date = new Date(),
    idGenerator: () => string = () => now.getTime().toString(),
): ResolveResult {
    const mapping =
        findPreAliasMapping(draft, businesses, mappings) ??
        mappings.find((m) => m.senderKey === draft.senderKey);

    if (mapping) {
        // Explicit "unassigned" mapping (businessId === null): the user chose to
        // ignore this sender — never create a cashbook or write a transaction.
        if (mapping.businessId === null) {
            return { businessId: "", ignore: true };
        }
        // Mapping points at a live cashbook: reuse it, no side effects.
        if (businesses.some((b) => b.id === mapping.businessId)) {
            return { businessId: mapping.businessId };
        }
        // Mapping points at a deleted cashbook: recreate the cashbook once and
        // repair the mapping so it is not recreated on every future event.
        const businessId = idGenerator();
        const createdAt = now.toISOString();
        return {
            businessId,
            newBusiness: buildBusiness(businessId, draft, settings, createdAt),
            newMapping: buildMapping(businessId, draft, createdAt),
        };
    }

    // No mapping yet: create both a cashbook and a mapping.
    const businessId = idGenerator();
    const createdAt = now.toISOString();
    return {
        businessId,
        newBusiness: buildBusiness(businessId, draft, settings, createdAt),
        newMapping: buildMapping(businessId, draft, createdAt),
    };
}

// A mapping saved under an SMS sender's raw key before that sender gained an alias
// (e.g. "mobilemoney" before it became "mtn") keeps routing it the way the user set
// it up. One pointing at a deleted cashbook is skipped so the alias mapping takes
// over instead of a new cashbook being recreated on every message.
function findPreAliasMapping(
    draft: ParsedDraft,
    businesses: Business[],
    mappings: SenderMapping[],
): SenderMapping | undefined {
    if (draft.source !== "sms") return undefined;
    const rawKey = normalizeSender("sms", draft.senderDisplay);
    if (!rawKey || rawKey === draft.senderKey) return undefined;
    return mappings.find(
        (m) =>
            m.senderKey === rawKey &&
            (m.businessId === null || businesses.some((b) => b.id === m.businessId)),
    );
}

function buildBusiness(
    businessId: string,
    draft: ParsedDraft,
    settings: AutoLogSettings,
    createdAt: string,
): Business {
    return {
        id: businessId,
        name: draft.senderDisplay,
        createdAt,
        currency: draft.currencyCode || settings.defaultCurrency,
    };
}

function buildMapping(businessId: string, draft: ParsedDraft, createdAt: string): SenderMapping {
    return {
        senderKey: draft.senderKey,
        displayName: draft.senderDisplay,
        businessId,
        autoCreated: true,
        sampleSenders: [draft.senderDisplay],
        createdAt,
    };
}
