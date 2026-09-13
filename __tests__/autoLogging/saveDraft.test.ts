import { Business, Transaction } from "../../src/types";
import { AutoLogSettings, ParsedDraft, SenderMapping } from "../../src/features/autoLogging/types";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";
import { planSaveDraft } from "../../src/features/autoLogging/services/ingestion/saveDraft";
import { fingerprint } from "../../src/features/autoLogging/services/dedupe/fingerprint";
import { indexRawHistory, RawHistoryEntry } from "../../src/features/autoLogging/services/persistence/rawEvents";

function makeDraft(overrides: Partial<ParsedDraft> = {}): ParsedDraft {
    return {
        amount: 45,
        currencyCode: "GHS",
        merchant: "Melcom",
        type: "expense",
        category: "Other Expense",
        description: "Melcom",
        occurredAt: new Date("2026-04-23T10:00:00Z").toISOString(),
        confidence: 0.85,
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

const fixedNow = new Date("2026-04-23T10:00:00Z");
let idCounter = 0;
const fixedIdGen = () => `fixed-id-${++idCounter}`;
beforeEach(() => {
    idCounter = 0;
});

describe("planSaveDraft — happy path", () => {
    it("auto-creates a cashbook and saves the transaction when nothing exists", () => {
        const plan = planSaveDraft({
            draft: makeDraft(),
            settings: makeSettings({ reviewLowConfidenceOnly: false }),
            businesses: [],
            transactions: [],
            mappings: [],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("save");
        expect(plan.newBusiness).toBeDefined();
        expect(plan.newMapping).toBeDefined();
        expect(plan.transaction).toBeDefined();
        expect(plan.transaction!.businessId).toBe(plan.newBusiness!.id);
        expect(plan.transaction!.autoLogged).toBe(true);
        expect(plan.transaction!.category).toBe("Other Expense");
    });

    it("reuses an existing mapping's cashbook and produces no side effects", () => {
        const biz: Business = {
            id: "biz-1",
            name: "MTN MoMo",
            createdAt: "2026-01-01T00:00:00Z",
            currency: "GHS",
        };
        const mapping: SenderMapping = {
            senderKey: "mtn",
            displayName: "MTN MoMo",
            businessId: "biz-1",
            autoCreated: false,
            sampleSenders: ["MTN"],
            createdAt: "2026-01-01T00:00:00Z",
        };
        const plan = planSaveDraft({
            draft: makeDraft(),
            settings: makeSettings({ reviewLowConfidenceOnly: false }),
            businesses: [biz],
            transactions: [],
            mappings: [mapping],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("save");
        expect(plan.newBusiness).toBeUndefined();
        expect(plan.newMapping).toBeUndefined();
        expect(plan.transaction!.businessId).toBe("biz-1");
    });
});

describe("planSaveDraft — review routing", () => {
    it("routes low-confidence drafts to review when reviewLowConfidenceOnly is on", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.4 }),
            settings: makeSettings({ reviewLowConfidenceOnly: true, minConfidenceForAutoSave: 0.75 }),
            businesses: [],
            transactions: [],
            mappings: [],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("review");
        expect(plan.reviewItem).toBeDefined();
        expect(plan.transaction).toBeUndefined();
    });

    it("routes everything through review when askBeforeSaving is on", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.99 }),
            settings: makeSettings({ askBeforeSaving: true, reviewLowConfidenceOnly: false }),
            businesses: [],
            transactions: [],
            mappings: [],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("review");
    });

    it("saves high-confidence drafts directly when review flags are off", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.95 }),
            settings: makeSettings({ askBeforeSaving: false, reviewLowConfidenceOnly: false }),
            businesses: [],
            transactions: [],
            mappings: [],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("save");
    });

    it("routes a below-threshold draft to review under DEFAULT settings (F13)", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.5 }),
            settings: makeSettings(),
            businesses: [],
            transactions: [],
            mappings: [],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("review");
        expect(plan.reviewItem).toBeDefined();
        expect(plan.transaction).toBeUndefined();
    });

    it("auto-saves an at/above-threshold draft under DEFAULT settings (F13)", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.9 }),
            settings: makeSettings(),
            businesses: [],
            transactions: [],
            mappings: [],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("save");
    });
});

describe("planSaveDraft — dedupe", () => {
    const biz: Business = {
        id: "biz-1",
        name: "MTN MoMo",
        createdAt: "2026-01-01T00:00:00Z",
        currency: "GHS",
    };
    const mapping: SenderMapping = {
        senderKey: "mtn",
        displayName: "MTN MoMo",
        businessId: "biz-1",
        autoCreated: false,
        sampleSenders: ["MTN"],
        createdAt: "2026-01-01T00:00:00Z",
    };

    function existingTx(overrides: Partial<Transaction> = {}): Transaction {
        return {
            id: "tx-1",
            description: "Melcom",
            amount: 45,
            date: new Date("2026-04-23T09:59:30Z").toISOString(),
            type: "expense",
            businessId: biz.id,
            autoLogged: true,
            confidence: 0.5,
            ...overrides,
        };
    }

    it("replaces an existing lower-confidence auto-logged duplicate", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.9 }),
            settings: makeSettings({ reviewLowConfidenceOnly: false }),
            businesses: [biz],
            transactions: [existingTx()],
            mappings: [mapping],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("replace");
        expect(plan.replaceTransactionId).toBe("tx-1");
    });

    it("drops the new draft when an existing duplicate has higher confidence", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.4 }),
            settings: makeSettings(),
            businesses: [biz],
            transactions: [existingTx({ confidence: 0.9 })],
            mappings: [mapping],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("drop");
        expect(plan.transaction).toBeUndefined();
        expect(plan.newBusiness).toBeUndefined();
        expect(plan.newMapping).toBeUndefined();
    });

    it("does not dedupe against manual (non-auto-logged) transactions", () => {
        const plan = planSaveDraft({
            draft: makeDraft({ confidence: 0.9 }),
            settings: makeSettings({ reviewLowConfidenceOnly: false }),
            businesses: [biz],
            transactions: [existingTx({ autoLogged: false, confidence: undefined })],
            mappings: [mapping],
            now: fixedNow,
            idGenerator: fixedIdGen,
        });
        expect(plan.outcome).toBe("save");
    });

    describe("confidence gate on replace paths (CF10)", () => {
        it("drops (keeps existing) a below-threshold draft that would replace a lower-confidence dedupe candidate", () => {
            const plan = planSaveDraft({
                draft: makeDraft({ confidence: 0.5 }),
                settings: makeSettings(),
                businesses: [biz],
                transactions: [existingTx({ confidence: 0.4 })],
                mappings: [mapping],
                now: fixedNow,
                idGenerator: fixedIdGen,
            });
            expect(plan.outcome).toBe("drop");
            expect(plan.transaction).toBeUndefined();
            expect(plan.replaceTransactionId).toBeUndefined();
            expect(plan.fingerprint).toBeUndefined();
        });

        it("still replaces a lower-confidence dedupe candidate with a high-confidence draft", () => {
            const plan = planSaveDraft({
                draft: makeDraft({ confidence: 0.9 }),
                settings: makeSettings(),
                businesses: [biz],
                transactions: [existingTx({ confidence: 0.4 })],
                mappings: [mapping],
                now: fixedNow,
                idGenerator: fixedIdGen,
            });
            expect(plan.outcome).toBe("replace");
            expect(plan.replaceTransactionId).toBe("tx-1");
        });

        it("drops (keeps existing) a below-threshold draft that would upgrade a lower-confidence rawHistory fingerprint", () => {
            const draft = makeDraft({ confidence: 0.5 });
            const draftFp = fingerprint(draft);
            const entry: RawHistoryEntry = {
                rawHash: "hash-a",
                fingerprint: draftFp,
                txId: "raw-tx-1",
                occurredAt: fixedNow.getTime(),
                confidence: 0.4,
            };
            const plan = planSaveDraft({
                draft,
                settings: makeSettings(),
                businesses: [biz],
                transactions: [],
                mappings: [mapping],
                rawHistory: indexRawHistory([entry]),
                now: fixedNow,
                idGenerator: fixedIdGen,
            });
            expect(plan.outcome).toBe("drop");
            expect(plan.transaction).toBeUndefined();
            expect(plan.replaceTransactionId).toBeUndefined();
            expect(plan.fingerprint).toBeUndefined();
        });

        it("still upgrades a lower-confidence rawHistory fingerprint with a high-confidence draft", () => {
            const draft = makeDraft({ confidence: 0.9 });
            const draftFp = fingerprint(draft);
            const entry: RawHistoryEntry = {
                rawHash: "hash-b",
                fingerprint: draftFp,
                txId: "raw-tx-1",
                occurredAt: fixedNow.getTime(),
                confidence: 0.4,
            };
            const plan = planSaveDraft({
                draft,
                settings: makeSettings(),
                businesses: [biz],
                transactions: [],
                mappings: [mapping],
                rawHistory: indexRawHistory([entry]),
                now: fixedNow,
                idGenerator: fixedIdGen,
            });
            expect(plan.outcome).toBe("replace");
            expect(plan.replaceTransactionId).toBe("raw-tx-1");
        });
    });
});
