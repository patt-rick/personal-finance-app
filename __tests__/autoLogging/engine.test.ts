import { Category } from "../../src/types";
import { RawEvent } from "../../src/features/autoLogging/types";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";

const CATEGORIES: Category[] = [
    { id: "1", name: "Salary", type: "income", isDefault: true },
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "7", name: "Transportation", type: "expense", isDefault: true },
    { id: "9", name: "Utilities", type: "expense", isDefault: true },
    { id: "15", name: "Other Expense", type: "expense", isDefault: true },
];

function makeEvent(overrides: Partial<RawEvent> = {}): RawEvent {
    return {
        id: "evt-1",
        source: "sms",
        sender: "MTN",
        body: "",
        timestamp: Date.parse("2026-04-23T10:00:00Z"),
        rawHash: "h1",
        ...overrides,
    };
}

describe("engine — provider routing", () => {
    it("uses an MTN MoMo template for MTN-shaped messages", () => {
        const draft = parseEvent(
            makeEvent({
                sender: "MTN",
                body: "You have paid GHS 45.00 to Uber. TxnID: ABC123. Available balance GHS 200.00",
            }),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.providerId).toMatch(/mtn/);
        expect(draft!.amount).toBe(45);
        expect(draft!.reference).toBe("ABC123");
        expect(draft!.type).toBe("expense");
        expect(draft!.semanticType).toBe("expense");
    });

    it("captures incoming MTN MoMo as income", () => {
        const draft = parseEvent(
            makeEvent({
                sender: "MTN",
                body: "You have received GHS 500 from John Doe via MTN MoMo. TxnID: REF99",
            }),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.type).toBe("income");
        expect(draft!.merchant).toBe("John Doe");
    });

    it("flags ECG bills with semanticType=bill and Utilities category", () => {
        const draft = parseEvent(
            makeEvent({
                sender: "ECG",
                body: "Your ECG bill amount is GHS 120.50 due 2026-05-01",
            }),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.semanticType).toBe("bill");
        expect(draft!.type).toBe("expense");
        expect(draft!.category).toBe("Utilities");
    });

    it("flags DSTV renewals as subscriptions", () => {
        const draft = parseEvent(
            makeEvent({
                sender: "DSTV",
                body: "Your DSTV subscription has been renewed for GHS 250.00. Ref 11223344",
            }),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.semanticType).toBe("subscription");
        expect(draft!.reference).toBe("11223344");
    });

    it("falls back to keyword classifier with capped confidence on unknown senders", () => {
        const draft = parseEvent(
            makeEvent({
                sender: "RANDOM-NEW",
                body: "Your account has been debited GHS 25",
            }),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.providerId).toBeUndefined();
        expect(draft!.confidence).toBeLessThanOrEqual(0.5);
    });

    it("returns null for non-financial messages", () => {
        const draft = parseEvent(
            makeEvent({ body: "Hey friend, see you tomorrow" }),
            CATEGORIES,
        );
        expect(draft).toBeNull();
    });

    it("is robust to template throws (does not crash)", () => {
        const draft = parseEvent(
            makeEvent({ sender: "MTN", body: "" }),
            CATEGORIES,
        );
        expect(draft).toBeNull();
    });
});

describe("engine — notification source", () => {
    it("routes MoMo notifications by package name", () => {
        const draft = parseEvent(
            makeEvent({
                source: "notification",
                sender: undefined,
                packageName: "com.mtn.momo",
                body: "You have received GHS 100 from Ama",
            }),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.providerId).toMatch(/mtn/);
        expect(draft!.source).toBe("notification");
    });
});
