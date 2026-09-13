import { Category } from "../../src/types";
import { RawEvent } from "../../src/features/autoLogging/types";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";

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

describe("template path gating — must DROP non-transactions", () => {
    it("drops spam/promo airtime blast (isSpam)", () => {
        expect(parseEvent(ev("MTN", "Recharge GHS 10 and get 500MB free! T&Cs apply"), CATEGORIES)).toBeNull();
    });

    it("drops implausibly huge amounts (isImplausibleAmount)", () => {
        expect(parseEvent(ev("MTN", "You have paid GHS 6,576,000,000.00 to X Ltd"), CATEGORIES)).toBeNull();
    });

    it("drops OTP / pre-authorization prompts (isPreAuthPrompt)", () => {
        expect(
            parseEvent(ev("MTN", "Use OTP 483920 to authorize payment of GHS 750 to KOFI. Do not share"), CATEGORIES),
        ).toBeNull();
    });

    it("drops bill reminders that have not been paid (isBillReminder)", () => {
        expect(
            parseEvent(
                ev("ECG", "Reminder: your ECG bill of GHS 320 is due on 05/05. Pay to avoid disconnection"),
                CATEGORIES,
            ),
        ).toBeNull();
    });

    it("does not log a reversed payment as a fresh expense (isReversalDebit)", () => {
        const d = parseEvent(ev("MTN", "Payment of GHS 50.00 to VENDOR has been reversed. Ref 123456"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).not.toBe("expense");
        expect(d!.type).toBe("income");
        expect(d!.semanticType).toBe("refund");
        expect(d!.providerId).toBe("generic-refund");
    });

    it("drops a marketing 'transfer and enjoy bonus' promo via the fallback (isPromo)", () => {
        expect(parseEvent(ev("MTN", "Transfer money with MoMo and enjoy GHS 5 bonus"), CATEGORIES)).toBeNull();
    });
});

describe("template path gating — must KEEP real transactions", () => {
    it("keeps a normal payment with a fee (expense 100 / fee 2.5)", () => {
        const d = parseEvent(ev("GCB", "Payment of GHS 100.00 to SHOPRITE. Fee GHS 2.50"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(100);
        expect(d!.fee).toBe(2.5);
    });

    it("keeps a received payment as income (200)", () => {
        const d = parseEvent(ev("MTN", "You have received GHS 200.00 from KOFI"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
        expect(d!.amount).toBe(200);
    });

    it("keeps a successful bill payment (expense 320, bill)", () => {
        const d = parseEvent(ev("ECG", "Your ECG bill payment of GHS 320.00 was successful"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(320);
        expect(d!.semanticType).toBe("bill");
    });

    it("keeps the MTN MoMo cash-out with fee split (expense 1600 / fee 16)", () => {
        const d = parseEvent(
            ev(
                "MTN",
                "Cash Out made for GHS1600.00 to VANTHELMA VENTURES. Current Balance: GHS256.82 " +
                    "Financial Transaction ld: 80855322501. Cash-out fee is charged automatically from your MTN MoMo wallet. " +
                    "Please do not pay any fees to the Agent. Thank you for using MTN MobileMoney. Fee charged: GHS16.00.",
            ),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(1600);
        expect(d!.fee).toBe(16);
    });

    it("keeps a genuine salary bonus credit (isPromo must not over-block)", () => {
        const d = parseEvent(ev("GCB", "Your salary bonus of GHS 500.00 has been credited to your account"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
        expect(d!.amount).toBe(500);
    });
});

describe("reversal sign + transfer guard (CF5)", () => {
    it("does not log a reversed transfer as a fresh expense/transfer outflow", () => {
        const d = parseEvent(
            ev("MTN", "Your transfer of GHS 50.00 to KOFI MENSAH has been reversed. Ref 123456"),
            CATEGORIES,
        );
        expect(d === null || d.type === "income").toBe(true);
        if (d) expect(d.type).not.toBe("transfer");
    });

    it("logs a clawback (deducted from your wallet and returned) as an expense outflow", () => {
        const d = parseEvent(
            ev("MTN", "Reversal successful. GHS 50.00 has been deducted from your wallet and returned to KOFI. Ref 12345"),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.type).toBe("expense");
        expect(d!.amount).toBe(50);
    });

    it("keeps a genuine refund credit as income (50)", () => {
        const d = parseEvent(ev("MTN", "Refund of GHS 50.00 has been credited to your account"), CATEGORIES);
        expect(d).not.toBeNull();
        expect(d!.type).toBe("income");
        expect(d!.amount).toBe(50);
    });
});
