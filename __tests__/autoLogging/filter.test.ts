import { AutoLogSettings, RawEvent } from "../../src/features/autoLogging/types";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";
import { isAllowedEvent } from "../../src/features/autoLogging/services/filter/isAllowedEvent";

function makeSettings(overrides: Partial<AutoLogSettings> = {}): AutoLogSettings {
    return { ...DEFAULT_AUTO_LOG_SETTINGS, captureSms: true, captureNotifications: true, ...overrides };
}

function smsEvent(sender: string): RawEvent {
    return {
        id: "evt",
        source: "sms",
        sender,
        body: "debit GHS 45 at Melcom",
        timestamp: Date.now(),
        rawHash: "h",
    };
}

function notifEvent(packageName: string): RawEvent {
    return {
        id: "evt",
        source: "notification",
        packageName,
        title: "MoMo",
        body: "debit GHS 45 at Melcom",
        timestamp: Date.now(),
        rawHash: "h",
    };
}

describe("isAllowedEvent — capture flags", () => {
    it("rejects SMS events when captureSms is off", () => {
        expect(isAllowedEvent(smsEvent("MTN"), makeSettings({ captureSms: false }))).toBe(false);
    });

    it("rejects notification events when captureNotifications is off", () => {
        expect(isAllowedEvent(notifEvent("com.mtn.momo"), makeSettings({ captureNotifications: false }))).toBe(false);
    });
});

describe("isAllowedEvent — empty allowlist means allow-all", () => {
    it("admits any SMS sender when allowedSenders is empty", () => {
        const settings = makeSettings({ allowedSenders: [] });
        expect(isAllowedEvent(smsEvent("MTN"), settings)).toBe(true);
        expect(isAllowedEvent(smsEvent("RandomSender"), settings)).toBe(true);
        expect(isAllowedEvent(smsEvent("+233241234567"), settings)).toBe(true);
    });

    it("admits any notification when allowedPackages is empty", () => {
        const settings = makeSettings({ allowedPackages: [] });
        expect(isAllowedEvent(notifEvent("com.mtn.momo"), settings)).toBe(true);
        expect(isAllowedEvent(notifEvent("com.random.app"), settings)).toBe(true);
    });
});

describe("isAllowedEvent — non-empty allowlist enforces membership", () => {
    it("rejects SMS from senders not on the list", () => {
        const settings = makeSettings({ allowedSenders: ["MTN"] });
        expect(isAllowedEvent(smsEvent("MTN"), settings)).toBe(true);
        expect(isAllowedEvent(smsEvent("VodafoneGH"), settings)).toBe(false);
    });

    it("matches sender variants via the normalization + alias pipeline", () => {
        const settings = makeSettings({ allowedSenders: ["MTN"] });
        expect(isAllowedEvent(smsEvent("MTN-GH"), settings)).toBe(true);
        expect(isAllowedEvent(smsEvent("mtn"), settings)).toBe(true);
        expect(isAllowedEvent(smsEvent("MTNMomo"), settings)).toBe(true);
    });

    it("rejects notifications from packages not on the list", () => {
        const settings = makeSettings({ allowedPackages: ["com.mtn.momo"] });
        expect(isAllowedEvent(notifEvent("com.mtn.momo"), settings)).toBe(true);
        expect(isAllowedEvent(notifEvent("com.whatsapp"), settings)).toBe(false);
    });

    it("package allowlist normalizes case", () => {
        const settings = makeSettings({ allowedPackages: ["com.MTN.Momo"] });
        expect(isAllowedEvent(notifEvent("com.mtn.momo"), settings)).toBe(true);
    });
});

describe("isAllowedEvent — edge cases", () => {
    it("rejects SMS with a missing sender when the allowlist is non-empty", () => {
        const settings = makeSettings({ allowedSenders: ["MTN"] });
        expect(isAllowedEvent({ ...smsEvent(""), sender: "" }, settings)).toBe(false);
    });

    it("rejects notification with a missing package when the allowlist is non-empty", () => {
        const settings = makeSettings({ allowedPackages: ["com.mtn.momo"] });
        expect(isAllowedEvent({ ...notifEvent(""), packageName: "" }, settings)).toBe(false);
    });
});
