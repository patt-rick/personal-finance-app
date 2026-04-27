import { Category } from "../../src/types";
import { RawEvent } from "../../src/features/autoLogging/types";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";

const CATEGORIES: Category[] = [
    { id: "1", name: "Salary", type: "income", isDefault: true },
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "15", name: "Other Expense", type: "expense", isDefault: true },
];

function ev(sender: string, body: string): RawEvent {
    return {
        id: "id",
        source: "sms",
        sender,
        body,
        timestamp: Date.parse("2026-04-23T10:00:00Z"),
        rawHash: "h",
    };
}

describe("regression — 'payment received' must classify as income", () => {
    it("known provider (MTN): payment received → income", () => {
        const d = parseEvent(ev("MTN", "Payment received GHS 100 from John"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
    });

    it("known provider (Ecobank): payment received → income", () => {
        const d = parseEvent(ev("ECOBANK", "Payment received GHS 250 from Ama"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
    });

    it("unknown sender, generic 'payment received' → income via generic-payment-received", () => {
        const d = parseEvent(ev("RANDOM-NEW", "Payment received GHS 50 from Kojo"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.providerId).toBe("generic-payment-received");
        expect(d!.type).toBe("income");
    });

    it("unknown sender, 'you have received' → income", () => {
        const d = parseEvent(ev("RANDOM-NEW", "You have received GHS 75"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
    });

    it("'received payment' phrasing also classifies as income", () => {
        const d = parseEvent(ev("MTN", "You have received payment of GHS 200 from Awo"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
    });

    it("fallback keyword case ('Received GHS 100' alone, no template match) still resolves to income", () => {
        const d = parseEvent(ev("RANDOM-NEW", "Received GHS 100 from your friend"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
    });
});
