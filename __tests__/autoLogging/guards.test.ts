import {
    MAX_PLAUSIBLE_AMOUNT,
    isImplausibleAmount,
    isSpam,
    isPreAuthPrompt,
    isReversalDebit,
    isBillReminder,
} from "../../src/features/autoLogging/services/parser/guards";

describe("isSpam", () => {
    it("drops promotional / prize spam", () => {
        expect(isSpam("Recharge GHS 10 and get 500MB free! T&Cs apply")).toBe(true);
        expect(isSpam("Congratulations! You won a prize")).toBe(true);
    });

    it("keeps genuine transaction text", () => {
        expect(isSpam("Payment of GHS 100 to Shop")).toBe(false);
        expect(isSpam("You have received GHS 50 from Ama")).toBe(false);
    });
});

describe("isImplausibleAmount", () => {
    it("is true for out-of-range / non-finite values", () => {
        expect(isImplausibleAmount(0)).toBe(true);
        expect(isImplausibleAmount(-5)).toBe(true);
        expect(isImplausibleAmount(1_000_000_001)).toBe(true);
        expect(isImplausibleAmount(NaN)).toBe(true);
        expect(isImplausibleAmount(Infinity)).toBe(true);
    });

    it("is false for plausible amounts", () => {
        expect(isImplausibleAmount(0.5)).toBe(false);
        expect(isImplausibleAmount(1600)).toBe(false);
        expect(isImplausibleAmount(MAX_PLAUSIBLE_AMOUNT)).toBe(false);
        expect(isImplausibleAmount(1_000_000_000)).toBe(false);
    });
});

describe("isPreAuthPrompt", () => {
    it("drops OTP / pre-authorization prompts", () => {
        expect(
            isPreAuthPrompt("Use OTP 483920 to authorize payment of GHS 750 to KOFI. Do not share this code"),
        ).toBe(true);
        expect(isPreAuthPrompt("GHS 200 will be debited from your account shortly")).toBe(true);
    });

    it("keeps completed transactions", () => {
        expect(isPreAuthPrompt("GHS 200 has been debited from your account")).toBe(false);
        expect(isPreAuthPrompt("You have paid GHS 50 to Shop")).toBe(false);
    });
});

describe("isReversalDebit", () => {
    it("is true for a reversed payment", () => {
        expect(isReversalDebit("Payment of GHS 50 to VENDOR has been reversed")).toBe(true);
    });

    it("is false for a normal payment or a genuine refund", () => {
        expect(isReversalDebit("Payment of GHS 50 to VENDOR")).toBe(false);
        expect(isReversalDebit("Refund of GHS 50 received")).toBe(false);
    });

    it("requires completed-reversal phrasing, not a bare mention (C-4)", () => {
        expect(isReversalDebit("If you did not initiate this, call 100 to request a reversal")).toBe(false);
        expect(isReversalDebit("Reversal successful. GHS 50.00 has been deducted")).toBe(true);
        expect(isReversalDebit("GHS 50 was reversed successfully")).toBe(true);
    });
});

describe("isBillReminder", () => {
    it("drops bill reminders", () => {
        expect(
            isBillReminder("Reminder: your ECG bill of GHS 320 is due on 05/05. Pay to avoid disconnection"),
        ).toBe(true);
    });

    it("keeps a successful bill payment", () => {
        expect(isBillReminder("Your ECG bill payment of GHS 320 was successful")).toBe(false);
    });
});
