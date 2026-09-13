import { Business } from "../../../../types";
import { ParsedDraft, SenderMapping, AutoLogSettings } from "../../types";

export interface ResolveResult {
    businessId: string;
    newBusiness?: Business;
    newMapping?: SenderMapping;
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

    if (mapping?.businessId && businesses.some((b) => b.id === mapping.businessId)) {
        return { businessId: mapping.businessId };
    }

    const businessId = idGenerator();
    const createdAt = now.toISOString();

    const newBusiness: Business = {
        id: businessId,
        name: draft.senderDisplay,
        createdAt,
        currency: draft.currencyCode || settings.defaultCurrency,
    };

    // Only append a mapping when the sender has none yet. Never overwrite an
    // existing mapping — including a user-set businessId:null "ignore" mapping.
    const newMapping: SenderMapping | undefined = mapping
        ? undefined
        : {
              senderKey: draft.senderKey,
              displayName: draft.senderDisplay,
              businessId,
              autoCreated: true,
              sampleSenders: [draft.senderDisplay],
              createdAt,
          };

    return { businessId, newBusiness, newMapping };
}
