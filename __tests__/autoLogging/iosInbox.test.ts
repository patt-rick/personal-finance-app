import {
    inboxRawHash,
    parseInboxEntry,
} from "../../src/features/autoLogging/services/ingestion/iosInbox/parseInboxEntry";

const T = Date.UTC(2026, 9, 5, 10, 30, 15);

function entry(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        v: 1,
        id: "6F1C2A9E-1B2C-4D5E-8F90-A1B2C3D4E5F6",
        sender: "MobileMoney",
        body: "  Payment made for GHS 50.00 to KOFI SHOP. Transaction Id: 123.  ",
        timestamp: T,
        ...overrides,
    });
}

describe("parseInboxEntry", () => {
    it("maps a valid entry to a shortcut SMS event", () => {
        const event = parseInboxEntry(entry());
        expect(event).toEqual({
            id: "6F1C2A9E-1B2C-4D5E-8F90-A1B2C3D4E5F6",
            source: "sms",
            via: "shortcut",
            sender: "MobileMoney",
            body: "Payment made for GHS 50.00 to KOFI SHOP. Transaction Id: 123.",
            timestamp: T,
            rawHash: expect.any(String),
        });
    });

    it("treats a blank or missing sender as unknown", () => {
        expect(parseInboxEntry(entry({ sender: "   " }))?.sender).toBeUndefined();
        expect(parseInboxEntry(entry({ sender: null }))?.sender).toBeUndefined();
        expect(parseInboxEntry(entry({ sender: 42 }))?.sender).toBeUndefined();
    });

    it.each([
        ["not json", "{oops"],
        ["a non-object", JSON.stringify("hello")],
        ["a missing body", entry({ body: undefined })],
        ["a blank body", entry({ body: "   " })],
        ["a non-string body", entry({ body: 12 })],
        ["a non-finite timestamp", entry({ timestamp: "soon" })],
        ["an id with path characters", entry({ id: "../../etc/passwd" })],
        ["a too-short id", entry({ id: "abc" })],
    ])("rejects %s", (_label, text) => {
        expect(parseInboxEntry(text)).toBeNull();
    });

    it("caps body and sender length", () => {
        const event = parseInboxEntry(entry({ body: "x".repeat(5000), sender: "s".repeat(100) }));
        expect(event?.body).toHaveLength(4000);
        expect(event?.sender).toHaveLength(64);
    });
});

describe("inboxRawHash", () => {
    it("is identical for the same message delivered twice in the same minute", () => {
        expect(inboxRawHash("MTN", "GHS 5 paid", T)).toBe(inboxRawHash("MTN", "GHS 5 paid", T + 20_000));
    });

    it("differs for different bodies, senders or minutes", () => {
        const base = inboxRawHash("MTN", "GHS 5 paid", T);
        expect(inboxRawHash("MTN", "GHS 6 paid", T)).not.toBe(base);
        expect(inboxRawHash("GCB", "GHS 5 paid", T)).not.toBe(base);
        expect(inboxRawHash(undefined, "GHS 5 paid", T)).not.toBe(base);
        expect(inboxRawHash("MTN", "GHS 5 paid", T + 61_000)).not.toBe(base);
    });
});
