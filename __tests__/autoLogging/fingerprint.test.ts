import { ParsedDraft } from "../../src/features/autoLogging/types";
import { fingerprint } from "../../src/features/autoLogging/services/dedupe/fingerprint";
import {
    indexRawHistory,
    RawHistoryEntry,
} from "../../src/features/autoLogging/services/persistence/rawEvents";
import { planSaveDraft } from "../../src/features/autoLogging/services/ingestion/saveDraft";
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
        rawText: "debit GHS 45.00 at Melcom",
        ...overrides,
    };
}

describe("fingerprint", () => {
    it("matches when only the time bucket changes within the same 2-min window", () => {
        const a = fingerprint(makeDraft({ occurredAt: new Date("2026-04-23T10:00:00Z").toISOString() }));
        const b = fingerprint(makeDraft({ occurredAt: new Date("2026-04-23T10:01:30Z").toISOString() }));
        expect(a).toBe(b);
    });

    it("differs when amounts differ", () => {
        const a = fingerprint(makeDraft({ amount: 45 }));
        const b = fingerprint(makeDraft({ amount: 46 }));
        expect(a).not.toBe(b);
    });

    it("becomes time-independent when a reference is present", () => {
        const a = fingerprint(makeDraft({ reference: "ABC123", occurredAt: new Date("2026-04-23T10:00:00Z").toISOString() }));
        const b = fingerprint(makeDraft({ reference: "ABC123", occurredAt: new Date("2026-04-23T11:00:00Z").toISOString() }));
        expect(a).toBe(b);
    });

    it("differs across providers (sender keys) for the same amount", () => {
        const a = fingerprint(makeDraft({ senderKey: "mtn" }));
        const b = fingerprint(makeDraft({ senderKey: "telecel" }));
        expect(a).not.toBe(b);
    });

    it("collapses SMS + notification of the same MoMo TxnID via reference match", () => {
        const sms = makeDraft({
            source: "sms",
            reference: "TX9988",
            merchant: null,
            confidence: 0.5,
        });
        const notif = makeDraft({
            source: "notification",
            reference: "TX9988",
            merchant: "Bolt",
            confidence: 0.8,
        });
        expect(fingerprint(sms)).toBe(fingerprint(notif));
    });
});

describe("planSaveDraft — raw-history dedupe", () => {
    it("drops a draft whose rawHash is already in history", () => {
        const draft = makeDraft();
        const history: RawHistoryEntry[] = [
            {
                rawHash: "seen-hash",
                fingerprint: "different-fp",
                txId: "tx-1",
                occurredAt: 0,
                confidence: 0.9,
            },
        ];
        const plan = planSaveDraft({
            draft,
            settings: { ...DEFAULT_AUTO_LOG_SETTINGS },
            businesses: [],
            transactions: [],
            mappings: [],
            rawHistory: indexRawHistory(history),
            rawHash: "seen-hash",
        });
        expect(plan.outcome).toBe("drop");
    });

    it("drops a draft whose fingerprint matches a higher-confidence prior", () => {
        const draft = makeDraft({ confidence: 0.4 });
        const fp = fingerprint(draft);
        const history: RawHistoryEntry[] = [
            { rawHash: "x", fingerprint: fp, txId: "tx-1", occurredAt: 0, confidence: 0.9 },
        ];
        const plan = planSaveDraft({
            draft,
            settings: { ...DEFAULT_AUTO_LOG_SETTINGS },
            businesses: [],
            transactions: [],
            mappings: [],
            rawHistory: indexRawHistory(history),
        });
        expect(plan.outcome).toBe("drop");
    });

    it("replaces when a higher-confidence draft matches a stored fingerprint with a known txId", () => {
        const draft = makeDraft({ confidence: 0.95 });
        const fp = fingerprint(draft);
        const history: RawHistoryEntry[] = [
            { rawHash: "x", fingerprint: fp, txId: "tx-1", occurredAt: 0, confidence: 0.5 },
        ];
        const plan = planSaveDraft({
            draft,
            settings: { ...DEFAULT_AUTO_LOG_SETTINGS, reviewLowConfidenceOnly: false },
            businesses: [],
            transactions: [],
            mappings: [],
            rawHistory: indexRawHistory(history),
        });
        expect(plan.outcome).toBe("replace");
        expect(plan.replaceTransactionId).toBe("tx-1");
    });
});
