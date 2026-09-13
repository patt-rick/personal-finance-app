import { Business } from "../../../../types";
import { ParsedDraft, SenderMapping, AutoLogSettings } from "../../types";

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
    const mapping = mappings.find((m) => m.senderKey === draft.senderKey);

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
