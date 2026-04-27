import { Category, Transaction } from "../../src/types";
import { ParsedDraft, RawEvent } from "../../src/features/autoLogging/types";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";
import { fingerprint } from "../../src/features/autoLogging/services/dedupe/fingerprint";
import { indexRawHistory, RawHistoryEntry } from "../../src/features/autoLogging/services/persistence/rawEvents";
import { planSaveDraft } from "../../src/features/autoLogging/services/ingestion/saveDraft";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";

const CATEGORIES: Category[] = [
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "15", name: "Other Expense", type: "expense", isDefault: true },
];

function smsEvent(body: string): RawEvent {
    return {
        id: "sms-1",
        source: "sms",
        sender: "MTN",
        body,
        timestamp: Date.parse("2026-04-23T10:00:00Z"),
        rawHash: "raw-sms",
    };
}

function notifEvent(body: string, postOffsetMs: number = 30_000): RawEvent {
    return {
        id: "notif-1",
        source: "notification",
        packageName: "com.mtn.momo",
        body,
        timestamp: Date.parse("2026-04-23T10:00:00Z") + postOffsetMs,
        rawHash: "raw-notif",
    };
}

function expectDraft(d: ParsedDraft | null): ParsedDraft {
    if (!d) throw new Error("expected non-null draft");
    return d;
}

describe("SMS + notification dedupe regression", () => {
    it("collapses both arrivals into one transaction when a reference is present", () => {
        const smsBody = "Payment of GHS 30 paid to Bolt. TxnID: 9988";
        const notifBody = "Payment of GHS 30 paid to Bolt. Ref: 9988";

        const smsDraft = expectDraft(parseEvent(smsEvent(smsBody), CATEGORIES));
        const notifDraft = expectDraft(parseEvent(notifEvent(notifBody), CATEGORIES));

        expect(smsDraft.senderKey).toBe(notifDraft.senderKey);
        expect(smsDraft.reference).toBe("9988");
        expect(notifDraft.reference).toBe("9988");
        expect(fingerprint(smsDraft)).toBe(fingerprint(notifDraft));

        const firstPlan = planSaveDraft({
            draft: smsDraft,
            settings: DEFAULT_AUTO_LOG_SETTINGS,
            businesses: [],
            transactions: [],
            mappings: [],
            rawHistory: indexRawHistory([]),
            rawHash: "raw-sms",
        });
        expect(firstPlan.outcome).toBe("save");

        const persisted: RawHistoryEntry[] = [
            {
                rawHash: "raw-sms",
                fingerprint: firstPlan.fingerprint!,
                txId: firstPlan.transaction!.id,
                occurredAt: new Date(smsDraft.occurredAt).getTime(),
                confidence: smsDraft.confidence,
            },
        ];

        const secondPlan = planSaveDraft({
            draft: notifDraft,
            settings: DEFAULT_AUTO_LOG_SETTINGS,
            businesses: [],
            transactions: [firstPlan.transaction!],
            mappings: [],
            rawHistory: indexRawHistory(persisted),
            rawHash: "raw-notif",
        });

        expect(secondPlan.outcome).toBe("drop");
    });

    it("collapses both arrivals when no reference is present (matches via amount + merchant + 2-min bucket)", () => {
        const body = "Payment of GHS 30 paid to Bolt";
        const smsDraft = expectDraft(parseEvent(smsEvent(body), CATEGORIES));
        const notifDraft = expectDraft(parseEvent(notifEvent(body, 60_000), CATEGORIES));

        expect(smsDraft.reference).toBeUndefined();
        expect(notifDraft.reference).toBeUndefined();
        expect(fingerprint(smsDraft)).toBe(fingerprint(notifDraft));

        const firstPlan = planSaveDraft({
            draft: smsDraft,
            settings: DEFAULT_AUTO_LOG_SETTINGS,
            businesses: [],
            transactions: [],
            mappings: [],
            rawHistory: indexRawHistory([]),
            rawHash: "raw-sms",
        });
        expect(firstPlan.outcome).toBe("save");

        const persisted: RawHistoryEntry[] = [
            {
                rawHash: "raw-sms",
                fingerprint: firstPlan.fingerprint!,
                txId: firstPlan.transaction!.id,
                occurredAt: new Date(smsDraft.occurredAt).getTime(),
                confidence: smsDraft.confidence,
            },
        ];

        const secondPlan = planSaveDraft({
            draft: notifDraft,
            settings: DEFAULT_AUTO_LOG_SETTINGS,
            businesses: [],
            transactions: [firstPlan.transaction!],
            mappings: [],
            rawHistory: indexRawHistory(persisted),
            rawHash: "raw-notif",
        });

        expect(secondPlan.outcome).toBe("drop");
    });

    it("falls back to transaction-list dedupe when raw history is wiped (e.g. user reset stats)", () => {
        const body = "Payment of GHS 30 paid to Bolt";
        const smsDraft = expectDraft(parseEvent(smsEvent(body), CATEGORIES));
        const notifDraft = expectDraft(parseEvent(notifEvent(body, 60_000), CATEGORIES));

        const firstPlan = planSaveDraft({
            draft: smsDraft,
            settings: DEFAULT_AUTO_LOG_SETTINGS,
            businesses: [],
            transactions: [],
            mappings: [],
        });
        expect(firstPlan.outcome).toBe("save");

        const existingTx: Transaction = firstPlan.transaction!;

        const secondPlan = planSaveDraft({
            draft: notifDraft,
            settings: DEFAULT_AUTO_LOG_SETTINGS,
            businesses: [],
            transactions: [existingTx],
            mappings: [],
        });

        expect(["drop", "replace"]).toContain(secondPlan.outcome);
    });

    it("notifies and SMS with different references are NOT collapsed (different transactions)", () => {
        const sms = parseEvent(smsEvent("Payment of GHS 30 paid to Bolt. TxnID: 1111"), CATEGORIES);
        const notif = parseEvent(notifEvent("Payment of GHS 30 paid to Uber. TxnID: 2222"), CATEGORIES);
        expect(fingerprint(sms!)).not.toBe(fingerprint(notif!));
    });
});
