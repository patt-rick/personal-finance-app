import { ParsedDraft } from "../../src/features/autoLogging/types";
import { dedupeKey, normalizeMerchant } from "../../src/features/autoLogging/services/dedupe/hash";
import { findDuplicate } from "../../src/features/autoLogging/services/dedupe/match";

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

describe("dedupeKey", () => {
    it("produces the same key for events within the same time bucket", () => {
        const t = Date.parse("2026-04-23T10:00:00Z");
        const withinBucket = t + 30_000;
        expect(dedupeKey(45, "Melcom", t)).toBe(dedupeKey(45, "Melcom", withinBucket));
    });

    it("normalizes merchant casing and whitespace", () => {
        const t = Date.parse("2026-04-23T10:00:00Z");
        expect(dedupeKey(45, "Mel com", t)).toBe(dedupeKey(45, "melcom", t));
    });

    it("differentiates different amounts", () => {
        const t = Date.parse("2026-04-23T10:00:00Z");
        expect(dedupeKey(45, "Melcom", t)).not.toBe(dedupeKey(46, "Melcom", t));
    });
});

describe("normalizeMerchant", () => {
    it("lowercases and strips whitespace", () => {
        expect(normalizeMerchant("Uber ")).toBe("uber");
        expect(normalizeMerchant("John Doe")).toBe("johndoe");
    });

    it("handles null/undefined", () => {
        expect(normalizeMerchant(null)).toBe("");
        expect(normalizeMerchant(undefined)).toBe("");
    });
});

describe("findDuplicate", () => {
    const baseTime = Date.parse("2026-04-23T10:00:00Z");

    it("finds a duplicate when amount, merchant and time all match within the window", () => {
        const draft = makeDraft({ occurredAt: new Date(baseTime).toISOString(), confidence: 0.9 });
        const hit = findDuplicate(draft, [
            { amount: 45, merchant: "Melcom", timestampMs: baseTime + 30_000, confidence: 0.5 },
        ]);
        expect(hit).not.toBeNull();
        expect(hit!.index).toBe(0);
        expect(hit!.shouldReplace).toBe(true);
    });

    it("returns null when amounts differ", () => {
        const draft = makeDraft();
        const hit = findDuplicate(draft, [
            { amount: 46, merchant: "Melcom", timestampMs: baseTime, confidence: 0.9 },
        ]);
        expect(hit).toBeNull();
    });

    it("returns null when the time window is exceeded", () => {
        const draft = makeDraft({ occurredAt: new Date(baseTime).toISOString() });
        const hit = findDuplicate(
            draft,
            [{ amount: 45, merchant: "Melcom", timestampMs: baseTime + 10 * 60_000, confidence: 0.9 }],
            2 * 60_000,
        );
        expect(hit).toBeNull();
    });

    it("shouldReplace is false when the existing candidate has higher confidence", () => {
        const draft = makeDraft({ confidence: 0.4 });
        const hit = findDuplicate(draft, [
            { amount: 45, merchant: "Melcom", timestampMs: baseTime, confidence: 0.9 },
        ]);
        expect(hit).not.toBeNull();
        expect(hit!.shouldReplace).toBe(false);
    });

    it("matches when one side has no merchant (SMS + notification about the same event)", () => {
        const draft = makeDraft({ merchant: null });
        const hit = findDuplicate(draft, [
            { amount: 45, merchant: "Melcom", timestampMs: baseTime, confidence: 0.5 },
        ]);
        expect(hit).not.toBeNull();
    });
});
