import { Category } from "../../src/types";
import { RawEvent } from "../../src/features/autoLogging/types";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";
import {
    hasCompletionVerb,
    isSpam,
    isPromo,
    isPreAuthPrompt,
    isBillReminder,
} from "../../src/features/autoLogging/services/parser/guards";

const CATEGORIES: Category[] = [
    { id: "1", name: "Salary", type: "income", isDefault: true },
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "9", name: "Utilities", type: "expense", isDefault: true },
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

describe("hasCompletionVerb", () => {
    it("matches completion phrasings", () => {
        expect(hasCompletionVerb("Your account has been debited with GHS 150")).toBe(true);
        expect(hasCompletionVerb("GHS 200 has been credited to your account")).toBe(true);
        expect(hasCompletionVerb("You have paid GHS 50 to Shop")).toBe(true);
        expect(hasCompletionVerb("You have received GHS 200 from KOFI")).toBe(true);
        expect(hasCompletionVerb("You have been charged GHS 0.00 for this service")).toBe(true);
        expect(hasCompletionVerb("GHS 25 was debited from your wallet")).toBe(true);
        expect(hasCompletionVerb("Amount credited: GHS 40")).toBe(true);
        expect(hasCompletionVerb("GHS 30 withdrawn from ATM")).toBe(true);
        expect(hasCompletionVerb("GHS 10 deducted for airtime")).toBe(true);
        expect(hasCompletionVerb("GHS 100 deposited to your account")).toBe(true);
        expect(hasCompletionVerb("Payment received GHS 100 from John")).toBe(true);
        expect(hasCompletionVerb("Your payment confirmed")).toBe(true);
        expect(hasCompletionVerb("Your payment successful")).toBe(true);
        expect(hasCompletionVerb("Your subscription payment was successful")).toBe(true);
        expect(hasCompletionVerb("Transaction completed")).toBe(true);
        expect(hasCompletionVerb("Thank you for your payment of GHS 320")).toBe(true);
        expect(hasCompletionVerb("Cash Out made for GHS1600.00 to VANTHELMA")).toBe(true);
        expect(hasCompletionVerb("Debit Alert: GHS 45.00 at MELCOM")).toBe(true);
        expect(hasCompletionVerb("Credit Alert: GHS 45.00")).toBe(true);
        expect(hasCompletionVerb("Your receipt for GHS 45")).toBe(true);
    });

    it("does not match pre-authorization / future / bare-noun phrasings", () => {
        expect(hasCompletionVerb("Use OTP 483920 to authorize payment of GHS 750 to KOFI")).toBe(false);
        expect(hasCompletionVerb("Enter your PIN to confirm payment of GHS 100")).toBe(false);
        expect(hasCompletionVerb("GHS 200 will be debited from your account shortly")).toBe(false);
        expect(hasCompletionVerb("Reminder: your ECG bill of GHS 320 is due on 05/05")).toBe(false);
        expect(hasCompletionVerb("Transfer money with MoMo and enjoy GHS 5 bonus")).toBe(false);
        expect(hasCompletionVerb("Payment of GHS 750 to KOFI")).toBe(false);
    });
});

describe("isSpam / isPromo — soft promo must yield to completion verbs", () => {
    it("drops strong spam unconditionally", () => {
        expect(isSpam("Congratulations! You won a prize")).toBe(true);
        expect(isSpam("Click here to claim now")).toBe(true);
        expect(isSpam("Free $100 airdrop! Send your sol address")).toBe(true);
    });

    it("drops soft promo only when no completion verb", () => {
        expect(isSpam("Recharge GHS 10 and get 500MB free! T&Cs apply")).toBe(true);
        expect(isSpam("Transfer money with MoMo and enjoy GHS 5 bonus")).toBe(true);
        expect(isPromo("Recharge GHS 10 and get 500MB free! T&Cs apply")).toBe(true);
    });

    it("keeps soft-promo footers on genuine completed transactions", () => {
        expect(
            isSpam("You have received GHS 200.00 from KOFI. Ref 99887766. Enjoy free transfers all weekend on MoMo"),
        ).toBe(false);
        expect(isSpam("Congratulations! You have received GHS 5.00 cashback from MTN MoMo")).toBe(false);
        expect(
            isSpam("Your account has been debited with GHS 150.00 at SHOPRITE. For complaints call our toll free line 0800422422"),
        ).toBe(false);
        expect(
            isPromo("Congratulations! You have received GHS 5.00 cashback from MTN MoMo"),
        ).toBe(false);
    });

    it("no longer over-blocks on the bare word 'free'", () => {
        expect(isPromo("For complaints call our toll free line 0800422422")).toBe(false);
    });
});

describe("isPreAuthPrompt — completion-aware", () => {
    it("drops OTP / pin / future-debit prompts", () => {
        expect(isPreAuthPrompt("Use OTP 483920 to authorize payment of GHS 750 to KOFI. Do not share")).toBe(true);
        expect(isPreAuthPrompt("Enter your PIN to confirm payment of GHS 100.00 to KOFI ELECTRONICS")).toBe(true);
        expect(isPreAuthPrompt("GHS 200 will be debited from your account shortly")).toBe(true);
        expect(isPreAuthPrompt("Please authorise the transaction of GHS 50")).toBe(true);
    });

    it("keeps completed transactions even with an authorization footer", () => {
        expect(isPreAuthPrompt("GHS 200 has been debited from your account")).toBe(false);
        expect(isPreAuthPrompt("You have paid GHS 50 to Shop")).toBe(false);
        expect(
            isPreAuthPrompt("Debit Alert: GHS 45.00 at MELCOM ACCRA. If you did not authorize this transaction, call…"),
        ).toBe(false);
    });
});

describe("isBillReminder — completion-aware", () => {
    it("drops unpaid reminders", () => {
        expect(
            isBillReminder("Reminder: your ECG bill of GHS 320 is due on 05/05. Pay to avoid disconnection"),
        ).toBe(true);
    });

    it("keeps a paid bill with a due-date footer", () => {
        expect(isBillReminder("Your ECG bill payment of GHS 320 was successful")).toBe(false);
        expect(
            isBillReminder("Thank you for your payment of GHS 320.00 for account 12345. Your next bill is due on 05 Oct"),
        ).toBe(false);
    });
});

describe("end-to-end DROP cases (parseEvent → null)", () => {
    it("promo airtime blast", () => {
        expect(parseEvent(ev("MTN", "Recharge GHS 10 and get 500MB free! T&Cs apply"), CATEGORIES)).toBeNull();
    });

    it("transfer-and-enjoy-bonus promo", () => {
        expect(parseEvent(ev("MTN", "Transfer money with MoMo and enjoy GHS 5 bonus"), CATEGORIES)).toBeNull();
    });

    it("OTP authorize prompt", () => {
        expect(
            parseEvent(ev("MTN", "Use OTP 483920 to authorize payment of GHS 750 to KOFI. Do not share"), CATEGORIES),
        ).toBeNull();
    });

    it("enter-your-PIN confirm prompt", () => {
        expect(
            parseEvent(ev("MTN", "Enter your PIN to confirm payment of GHS 100.00 to KOFI ELECTRONICS"), CATEGORIES),
        ).toBeNull();
    });

    it("bill reminder", () => {
        expect(
            parseEvent(
                ev("ECG", "Reminder: your ECG bill of GHS 320 is due on 05/05. Pay to avoid disconnection"),
                CATEGORIES,
            ),
        ).toBeNull();
    });

    it("zero-amount charge (isImplausibleAmount via fallback)", () => {
        expect(parseEvent(ev("RANDOM", "You have been charged GHS 0.00 for this service"), CATEGORIES)).toBeNull();
    });
});

describe("end-to-end KEEP cases (parseEvent must parse)", () => {
    it("received income with a free-transfers footer (income 200)", () => {
        const d = parseEvent(
            ev("MTN", "You have received GHS 200.00 from KOFI. Ref 99887766. Enjoy free transfers all weekend on MoMo"),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
        expect(d!.amount).toBe(200);
    });

    it("debit with a toll-free-line footer (expense 150)", () => {
        const d = parseEvent(
            ev("GCB", "Your account has been debited with GHS 150.00 at SHOPRITE. For complaints call our toll free line 0800422422"),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(150);
    });

    it("congratulations cashback (income 5)", () => {
        const d = parseEvent(
            ev("MTN", "Congratulations! You have received GHS 5.00 cashback from MTN MoMo"),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
        expect(d!.amount).toBe(5);
    });

    it("successful subscription with will-be-debited footer (expense 300)", () => {
        const d = parseEvent(
            ev(
                "DSTV",
                "Your DSTV subscription payment of GHS 300.00 was successful. GHS 300.00 will be debited automatically next month",
            ),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(300);
    });

    it("thank-you payment with next-bill-due footer (expense 320)", () => {
        const d = parseEvent(
            ev("ECG", "Thank you for your payment of GHS 320.00 for account 12345. Your next bill is due on 05 Oct"),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(320);
    });

    it("debit alert with did-not-authorize footer (expense 45)", () => {
        const d = parseEvent(
            ev("GCB", "Debit Alert: GHS 45.00 at MELCOM ACCRA. If you did not authorize this transaction, call…"),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(45);
    });
});
