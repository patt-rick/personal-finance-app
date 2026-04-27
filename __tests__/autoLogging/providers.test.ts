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

function ev(sender: string, body: string, source: RawEvent["source"] = "sms", packageName?: string): RawEvent {
    return {
        id: "id",
        source,
        sender: source === "sms" ? sender : undefined,
        packageName: source === "notification" ? packageName ?? sender : undefined,
        body,
        timestamp: Date.parse("2026-04-23T10:00:00Z"),
        rawHash: "h",
    };
}

describe("provider templates — mobile money", () => {
    it("MTN MoMo debit", () => {
        const d = parseEvent(ev("MTN", "Payment of GHS 30 paid to Bolt. TxnID: 9988"), CATEGORIES);
        expect(d?.providerId).toMatch(/mtn/);
        expect(d?.type).toBe("expense");
        expect(d?.amount).toBe(30);
        expect(d?.reference).toBe("9988");
    });

    it("MTN MoMo credit (lowercase sender)", () => {
        const d = parseEvent(ev("mtn", "You have received GHS 200 from Kojo"), CATEGORIES);
        expect(d?.providerId).toMatch(/mtn-momo-credit/);
        expect(d?.type).toBe("income");
    });

    it("Telecel Cash debit", () => {
        const d = parseEvent(ev("Telecel", "You sent GHS 12.00 to Shell on 2026-04-23"), CATEGORIES);
        expect(d?.providerId).toMatch(/telecel/);
        expect(d?.amount).toBe(12);
    });

    it("AirtelTigo credit", () => {
        const d = parseEvent(ev("AirtelTigo", "Credit of GHS 150 received from Awo"), CATEGORIES);
        expect(d?.providerId).toMatch(/airteltigo/);
        expect(d?.type).toBe("income");
    });

    it("MoMo promo SMS does not match the debit template (no amount-shaped action)", () => {
        const d = parseEvent(ev("MTN", "MTN promo: dial *123# to win!"), CATEGORIES);
        expect(d).toBeNull();
    });
});

describe("provider templates — banks", () => {
    it("Ecobank debit alert", () => {
        const d = parseEvent(
            ev("ECOBANK", "Debit Alert: Your account has been debited with GHS 80.00 at Melcom"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("ecobank-debit");
        expect(d?.merchant).toBe("Melcom");
    });

    it("GCB credit alert", () => {
        const d = parseEvent(
            ev("GCB", "Credit Alert: GHS 1,500.00 received from Salary"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("gcb-credit");
        expect(d?.amount).toBe(1500);
    });

    it("Fidelity debit", () => {
        const d = parseEvent(
            ev("FIDELITY", "Your account has been debited GHS 75.00 charged at Shoprite"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("fidelity-debit");
    });

    it("Generic bank debit fallback", () => {
        const d = parseEvent(
            ev("BANK-ALERT", "Debit Alert: GHS 20.00 withdrawn at Petrol"),
            CATEGORIES,
        );
        expect(d?.providerId).toMatch(/(generic-bank-debit|fidelity)/);
    });

    it("Bank marketing message does not match credit/debit templates", () => {
        const d = parseEvent(
            ev("ECOBANK", "Visit any Ecobank branch today for new accounts"),
            CATEGORIES,
        );
        expect(d).toBeNull();
    });
});

describe("provider templates — bills and subscriptions", () => {
    it("ECG bill", () => {
        const d = parseEvent(
            ev("ECG", "Your ECG bill amount is GHS 120 due 2026-05-01"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("ecg-bill");
        expect(d?.semanticType).toBe("bill");
        expect(d?.category).toBe("Utilities");
    });

    it("Ghana Water bill", () => {
        const d = parseEvent(
            ev("GHANAWATER", "GWC bill amount payable: GHS 65"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("gwc-bill");
        expect(d?.semanticType).toBe("bill");
    });

    it("DSTV renewal", () => {
        const d = parseEvent(
            ev("DSTV", "Your DSTV subscription was renewed for GHS 250 on 2026-04-23"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("dstv-gotv-subscription");
        expect(d?.semanticType).toBe("subscription");
    });

    it("Netflix charge via notification", () => {
        const d = parseEvent(
            ev("netflix", "Netflix subscription renewed - $9.99 charged", "notification", "com.netflix.mediaclient"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("netflix-subscription");
        expect(d?.semanticType).toBe("subscription");
        expect(d?.amount).toBe(9.99);
    });

    it("Mobile airtime debit", () => {
        const d = parseEvent(
            ev("MTN", "GHS 5 airtime topup successful"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("mobile-airtime-debit");
    });
});

describe("provider templates — generic fallbacks", () => {
    it("generic refund as income with semanticType=refund", () => {
        const d = parseEvent(
            ev("UnknownShop", "GHS 12 refunded for return"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("generic-refund");
        expect(d?.type).toBe("income");
        expect(d?.semanticType).toBe("refund");
    });

    it("generic 'paid to' as expense", () => {
        const d = parseEvent(
            ev("Shop", "You have paid to Amazon $20.00"),
            CATEGORIES,
        );
        expect(d?.providerId).toBe("generic-payment-sent");
        expect(d?.type).toBe("expense");
    });
});

describe("provider templates — conflict handling", () => {
    it("conflicting credit + paid-to falls through to keyword classifier", () => {
        const d = parseEvent(
            ev("MTN", "Credit of GHS 100 then paid to Acme debited later"),
            CATEGORIES,
        );
        expect(d).not.toBeNull();
        expect(d!.confidence).toBeLessThanOrEqual(0.6);
    });
});
