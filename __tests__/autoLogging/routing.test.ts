import { Business } from "../../src/types";
import { AutoLogSettings, ParsedDraft, SenderMapping } from "../../src/features/autoLogging/types";
import { normalizeSender } from "../../src/features/autoLogging/services/routing/normalizeSender";
import { applyAliases } from "../../src/features/autoLogging/services/routing/senderAliases";
import { deriveDisplayName } from "../../src/features/autoLogging/services/routing/displayName";
import { resolveBusiness } from "../../src/features/autoLogging/services/routing/resolveBusiness";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";

function makeDraft(overrides: Partial<ParsedDraft> = {}): ParsedDraft {
    return {
        amount: 45,
        currencyCode: "GHS",
        merchant: "Melcom",
        type: "expense",
        category: "Other Expense",
        description: "Melcom",
        occurredAt: new Date("2026-04-23T10:00:00Z").toISOString(),
        confidence: 0.8,
        source: "sms",
        senderKey: "mtn",
        senderDisplay: "MTN",
        rawText: "Debit Alert: GHS 45.00 at Melcom",
        ...overrides,
    };
}

function makeSettings(overrides: Partial<AutoLogSettings> = {}): AutoLogSettings {
    return { ...DEFAULT_AUTO_LOG_SETTINGS, ...overrides };
}

describe("normalizeSender", () => {
    it("strips non-alphanumerics and lowercases SMS alphanumeric sender IDs", () => {
        expect(normalizeSender("sms", "MTN-GH")).toBe("mtngh");
        expect(normalizeSender("sms", "MTN")).toBe("mtn");
        expect(normalizeSender("sms", "Vodafone Cash")).toBe("vodafonecash");
    });

    it("prefixes phone numbers with 'p' so they cannot collide with alphanumeric senders", () => {
        expect(normalizeSender("sms", "+233241234567")).toBe("p233241234567");
        expect(normalizeSender("sms", "0241234567")).toBe("p0241234567");
    });

    it("lowercases notification package names without other modification", () => {
        expect(normalizeSender("notification", "com.MTN.Momo")).toBe("com.mtn.momo");
    });

    it("returns empty string for empty input", () => {
        expect(normalizeSender("sms", "")).toBe("");
        expect(normalizeSender("sms", "   ")).toBe("");
    });
});

describe("applyAliases", () => {
    it("collapses MTN variants to a canonical key", () => {
        expect(applyAliases("mtngh")).toBe("mtn");
        expect(applyAliases("mtnmomo")).toBe("mtn");
        expect(applyAliases("com.mtn.momo")).toBe("mtn");
        expect(applyAliases("momo")).toBe("mtn");
    });

    it("leaves unknown keys untouched", () => {
        expect(applyAliases("randomsender")).toBe("randomsender");
    });
});

describe("deriveDisplayName", () => {
    it("extracts the last two segments of a package name and title-cases them", () => {
        expect(deriveDisplayName("notification", "com.mtn.momo")).toBe("Mtn Momo");
    });

    it("preserves phone numbers as-is", () => {
        expect(deriveDisplayName("sms", "+233241234567")).toBe("+233241234567");
    });

    it("replaces separators with spaces for alphanumeric SMS senders", () => {
        expect(deriveDisplayName("sms", "MTN-GH")).toBe("MTN GH");
        expect(deriveDisplayName("sms", "Vodafone_Cash")).toBe("Vodafone Cash");
    });

    it("returns 'Unknown' for empty input", () => {
        expect(deriveDisplayName("sms", "")).toBe("Unknown");
    });
});

describe("resolveBusiness", () => {
    const fixedNow = new Date("2026-04-23T10:00:00Z");

    const mtnBusiness: Business = {
        id: "biz-mtn",
        name: "MTN MoMo",
        createdAt: "2026-01-01T00:00:00Z",
        currency: "GHS",
    };

    it("returns the mapped businessId when the mapping points to a valid cashbook", () => {
        const mapping: SenderMapping = {
            senderKey: "mtn",
            displayName: "MTN MoMo",
            businessId: mtnBusiness.id,
            autoCreated: false,
            sampleSenders: ["MTN"],
            createdAt: "2026-01-01T00:00:00Z",
        };
        const result = resolveBusiness(makeDraft(), makeSettings(), [mtnBusiness], [mapping], fixedNow);
        expect(result.businessId).toBe(mtnBusiness.id);
        expect(result.newBusiness).toBeUndefined();
        expect(result.newMapping).toBeUndefined();
    });

    it("auto-creates a Business and SenderMapping when no mapping exists", () => {
        const result = resolveBusiness(makeDraft(), makeSettings(), [], [], fixedNow);
        expect(result.newBusiness).toBeDefined();
        expect(result.newMapping).toBeDefined();
        expect(result.businessId).toBe(result.newBusiness!.id);
        expect(result.newMapping!.senderKey).toBe("mtn");
        expect(result.newMapping!.autoCreated).toBe(true);
        expect(result.newBusiness!.name).toBe("MTN");
    });

    it("auto-creates when the mapping points to a cashbook that no longer exists", () => {
        const staleMapping: SenderMapping = {
            senderKey: "mtn",
            displayName: "MTN MoMo",
            businessId: "biz-deleted",
            autoCreated: true,
            sampleSenders: ["MTN"],
            createdAt: "2026-01-01T00:00:00Z",
        };
        const result = resolveBusiness(makeDraft(), makeSettings(), [], [staleMapping], fixedNow);
        expect(result.newBusiness).toBeDefined();
        expect(result.businessId).toBe(result.newBusiness!.id);
    });

    it("uses draft.currencyCode for the new cashbook when present", () => {
        const result = resolveBusiness(
            makeDraft({ currencyCode: "USD" }),
            makeSettings({ defaultCurrency: "GHS" }),
            [],
            [],
            fixedNow,
        );
        expect(result.newBusiness!.currency).toBe("USD");
    });

    it("falls back to settings.defaultCurrency when the draft has no currency", () => {
        const result = resolveBusiness(
            makeDraft({ currencyCode: null }),
            makeSettings({ defaultCurrency: "GHS" }),
            [],
            [],
            fixedNow,
        );
        expect(result.newBusiness!.currency).toBe("GHS");
    });
});
