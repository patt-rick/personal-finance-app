import { Category } from "../../src/types";
import { RawEvent } from "../../src/features/autoLogging/types";
import { isAllowedEvent } from "../../src/features/autoLogging/services/filter/isAllowedEvent";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";

const CATEGORIES: Category[] = [
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "15", name: "Other Expense", type: "expense", isDefault: true },
];

function notifEvent(packageName: string, body: string): RawEvent {
    return {
        id: "notif-1",
        source: "notification",
        packageName,
        body,
        timestamp: Date.parse("2026-04-23T10:00:00Z"),
        rawHash: "raw-notif",
    };
}

function smsEvent(body: string): RawEvent {
    return {
        id: "sms-1",
        source: "sms",
        sender: "SOMEBANK",
        body,
        timestamp: Date.parse("2026-04-23T10:00:00Z"),
        rawHash: "raw-sms",
    };
}

describe("isAllowedEvent — messenger blocking (F15)", () => {
    const settings = { ...DEFAULT_AUTO_LOG_SETTINGS, captureNotifications: true };

    it("blocks a WhatsApp notification even with an empty allowlist", () => {
        expect(isAllowedEvent(notifEvent("com.whatsapp", "GHS 300"), settings)).toBe(false);
    });

    it("blocks a messenger package regardless of the allowlist", () => {
        const withAllow = { ...settings, allowedPackages: ["com.whatsapp"] };
        expect(isAllowedEvent(notifEvent("com.whatsapp", "GHS 300"), withAllow)).toBe(false);
    });

    it("keeps a normal bank-app notification allowed", () => {
        expect(isAllowedEvent(notifEvent("com.mtn.momo", "Payment of GHS 30"), settings)).toBe(true);
    });
});

describe("generic templates — financial-signal requirement (F15)", () => {
    it("still parses a real generic currency+reference SMS", () => {
        const draft = parseEvent(
            smsEvent("You have received GHS 200.00 from KOFI. Ref 99887766"),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.type).toBe("income");
        expect(draft!.amount).toBe(200);
        expect(draft!.currencyCode).toBe("GHS");
        expect(draft!.reference).toBe("99887766");
    });

    it("returns null for a generic body with no currency-typed amount and no reference", () => {
        const draft = parseEvent(
            smsEvent("You have received cash from Kwesi for the goods"),
            CATEGORIES,
        );
        expect(draft).toBeNull();
    });
});
