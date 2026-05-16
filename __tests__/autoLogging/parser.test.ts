import { Category } from "../../src/types";
import { RawEvent } from "../../src/features/autoLogging/types";
import { extractAmount } from "../../src/features/autoLogging/services/parser/amount";
import { extractMerchant } from "../../src/features/autoLogging/services/parser/merchant";
import { extractReference } from "../../src/features/autoLogging/services/parser/normalize";
import { inferType } from "../../src/features/autoLogging/services/parser/type";
import { categorize } from "../../src/features/autoLogging/services/parser/categorize";
import { parse } from "../../src/features/autoLogging/services/parser/parse";

const DEFAULT_CATEGORIES: Category[] = [
    { id: "1", name: "Salary", type: "income", isDefault: true },
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "6", name: "Food", type: "expense", isDefault: true },
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

describe("extractAmount", () => {
    it("parses code-prefix form", () => {
        expect(extractAmount("Debit Alert: GHS 45.00 at Melcom")).toEqual({ amount: 45, currencyCode: "GHS" });
    });

    it("parses symbol-prefix form", () => {
        expect(extractAmount("Paid $45 to Uber")).toEqual({ amount: 45, currencyCode: "USD" });
        expect(extractAmount("Spent €1,234.56")).toEqual({ amount: 1234.56, currencyCode: "EUR" });
        expect(extractAmount("Charged £10.50")).toEqual({ amount: 10.5, currencyCode: "GBP" });
    });

    it("parses GH₵ compound symbol", () => {
        expect(extractAmount("debit GH₵45.00 at Shell")).toEqual({ amount: 45, currencyCode: "GHS" });
    });

    it("parses code-suffix form", () => {
        expect(extractAmount("You have received 500.00 GHS from John")).toEqual({ amount: 500, currencyCode: "GHS" });
    });

    it("returns nulls when no amount present", () => {
        expect(extractAmount("Hello there, friend")).toEqual({ amount: null, currencyCode: null });
    });

    it("handles thousand separators", () => {
        expect(extractAmount("Charged USD 12,345.00 at Acme")).toEqual({ amount: 12345, currencyCode: "USD" });
    });

    it("ignores 'Fee charged' tail amount and exposes fee separately", () => {
        const text =
            "Cash Out made for GHS1600.00 to VANTHELMA VENTURES. Current Balance: GHS256.82 " +
            "Financial Transaction ld: 80855322501. Cash-out fee is charged automatically from your MTN MoMo wallet. " +
            "Please do not pay any fees to the Agent. Thank you for using MTN MobileMoney. Fee charged: GHS16.00.";
        expect(extractAmount(text)).toEqual({ amount: 1600, currencyCode: "GHS", fee: 16 });
    });

    it("ignores explicit fee markers (commission, vat, levy)", () => {
        expect(extractAmount("Paid GHS 200 to Shop. Commission: GHS 5"))
            .toEqual({ amount: 200, currencyCode: "GHS", fee: 5 });
        expect(extractAmount("Sent GHS 500 to Kwame. VAT GHS 10"))
            .toEqual({ amount: 500, currencyCode: "GHS", fee: 10 });
    });
});

describe("parse with fee-bearing SMS", () => {
    it("adds the fee to the principal for an MTN MoMo Cash Out", () => {
        const event = makeEvent({
            body:
                "Cash Out made for GHS1600.00 to VANTHELMA VENTURES. Current Balance: GHS256.82 " +
                "Financial Transaction ld: 80855322501. Cash-out fee is charged automatically from your MTN MoMo wallet. " +
                "Please do not pay any fees to the Agent. Thank you for using MTN MobileMoney. Fee charged: GHS16.00.",
        });
        const draft = parse(event, DEFAULT_CATEGORIES);
        expect(draft).not.toBeNull();
        expect(draft!.amount).toBe(1616);
        expect(draft!.currencyCode).toBe("GHS");
        expect(draft!.type).toBe("expense");
    });

    it("does not add fee for income credits", () => {
        const event = makeEvent({
            body: "Payment received GHS 1000 from John. Fee: GHS 5",
        });
        const draft = parse(event, DEFAULT_CATEGORIES);
        expect(draft).not.toBeNull();
        expect(draft!.amount).toBe(1000);
        expect(draft!.type).toBe("income");
    });
});

describe("extractMerchant", () => {
    it("extracts 'at <Merchant>'", () => {
        expect(extractMerchant("Debit Alert: GHS 45.00 at Melcom on 2026-04-23")).toBe("Melcom");
    });

    it("extracts 'to <Merchant>'", () => {
        expect(extractMerchant("Paid GHS 30 to Uber")).toBe("Uber");
    });

    it("extracts 'from <Counterparty>'", () => {
        expect(extractMerchant("Received GHS 500 from John Doe")).toBe("John Doe");
    });

    it("returns null when no pattern matches", () => {
        expect(extractMerchant("Random text with no merchant hint")).toBeNull();
    });

    it("stops at stop-words like 'on'", () => {
        expect(extractMerchant("Paid GHS 30 to Uber on 2026-04-23")).toBe("Uber");
    });
});

describe("inferType", () => {
    it("classifies 'paid' as expense", () => {
        expect(inferType("Paid GHS 30 to Uber").type).toBe("expense");
    });

    it("classifies 'received' as income", () => {
        expect(inferType("Received GHS 500 from John").type).toBe("income");
    });

    it("classifies 'sent to' as transfer", () => {
        expect(inferType("You sent GHS 100 to Kwame").type).toBe("transfer");
    });

    it("defaults to expense when no strong signal", () => {
        expect(inferType("GHS 50 at Shop").type).toBe("expense");
    });
});

describe("categorize", () => {
    it("maps Uber to Transportation", () => {
        expect(categorize("Uber", "Paid GHS 30 to Uber", "expense", DEFAULT_CATEGORIES)).toEqual({
            category: "Transportation",
            confident: true,
        });
    });

    it("maps Shell to Transportation via keyword", () => {
        expect(categorize("Shell", "debit at Shell", "expense", DEFAULT_CATEGORIES).category).toBe("Transportation");
    });

    it("falls back to Other Expense for unknown merchants", () => {
        expect(categorize("Unknown Shop", "debit at Unknown Shop", "expense", DEFAULT_CATEGORIES)).toEqual({
            category: "Other Expense",
            confident: false,
        });
    });

    it("falls back to Other Income for unknown income", () => {
        expect(categorize(null, "received some money", "income", DEFAULT_CATEGORIES).category).toBe("Other Income");
    });

    it("uses the reference to map an income credit to Salary", () => {
        expect(categorize(null, "credited GHS 5000", "income", DEFAULT_CATEGORIES, undefined, "SALARY-MAR2026")).toEqual({
            category: "Salary",
            confident: true,
        });
    });

    it("uses the reference to map an expense to Utilities", () => {
        expect(categorize(null, "debit GHS 200", "expense", DEFAULT_CATEGORIES, undefined, "ECG-BILL-MAR2026")).toEqual({
            category: "Utilities",
            confident: true,
        });
    });

    it("uses the reference to map an expense to Transportation", () => {
        expect(categorize(null, "debit GHS 30", "expense", DEFAULT_CATEGORIES, undefined, "UBER RIDE 12345")).toEqual({
            category: "Transportation",
            confident: true,
        });
    });

    it("ignores a reference whose category type doesn't match transaction type", () => {
        const result = categorize(null, "debit GHS 200", "expense", DEFAULT_CATEGORIES, undefined, "SALARY-MAR2026");
        expect(result.category).not.toBe("Salary");
    });

    it("falls through to body keywords when reference has no category hint", () => {
        expect(categorize("Uber", "Paid GHS 30 to Uber", "expense", DEFAULT_CATEGORIES, undefined, "TXN8472651")).toEqual({
            category: "Transportation",
            confident: true,
        });
    });
});

describe("extractReference", () => {
    it("captures a plain alphanumeric reference", () => {
        expect(extractReference("Ref: ABC123XYZ")).toBe("ABC123XYZ");
    });

    it("captures a multi-word reference and stops at boundary keyword", () => {
        expect(extractReference("Reference: SALARY MAR 2026 from XYZ Bank")).toBe("SALARY MAR 2026");
    });

    it("preserves internal periods in transaction IDs", () => {
        expect(extractReference("Txn ID: MP240515.1234.A12345 from Bank")).toBe("MP240515.1234.A12345");
    });

    it("captures hyphen-separated references", () => {
        expect(extractReference("Ref: ECG-Bill-Payment-2026")).toBe("ECG-Bill-Payment-2026");
    });

    it("truncates at sentence break", () => {
        expect(extractReference("Ref: ABC123. Balance: GHS 50")).toBe("ABC123");
    });

    it("captures narration as reference", () => {
        expect(extractReference("Narration: UBER RIDE 12345")).toBe("UBER RIDE 12345");
    });

    it("returns null when no reference label present", () => {
        expect(extractReference("Debit Alert: GHS 45.00 at Melcom")).toBeNull();
    });
});

describe("parse (reference-driven categorization)", () => {
    it("uses the SMS reference to categorize a salary credit as Salary", () => {
        const event = makeEvent({
            sender: "GCB",
            body: "Your account has been credited GHS 5,000.00. Reference: SALARY MAR 2026. Available balance: GHS 12,000",
        });
        const draft = parse(event, DEFAULT_CATEGORIES);
        expect(draft).not.toBeNull();
        expect(draft!.type).toBe("income");
        expect(draft!.category).toBe("Salary");
    });

    it("uses the SMS reference to categorize a utility payment as Utilities", () => {
        const event = makeEvent({
            sender: "MTN",
            body: "Payment of GHS 200.00 successful. Reference: ECG-BILL-MAR2026",
        });
        const draft = parse(event, DEFAULT_CATEGORIES);
        expect(draft).not.toBeNull();
        expect(draft!.type).toBe("expense");
        expect(draft!.category).toBe("Utilities");
    });
});

describe("parse (orchestrator)", () => {
    it("produces a ParsedDraft for a clean SMS", () => {
        const event = makeEvent({ body: "Debit Alert: GHS 45.00 at Melcom on 2026-04-23" });
        const draft = parse(event, DEFAULT_CATEGORIES);
        expect(draft).not.toBeNull();
        expect(draft!.amount).toBe(45);
        expect(draft!.currencyCode).toBe("GHS");
        expect(draft!.merchant).toBe("Melcom");
        expect(draft!.type).toBe("expense");
        expect(draft!.senderKey).toBe("mtn");
        expect(draft!.confidence).toBeGreaterThan(0.75);
    });

    it("rejects spam promos that outweigh financial signals", () => {
        const event = makeEvent({
            body: "Congratulations! You won a promo reward of GHS 1000. Click here to claim now!",
        });
        expect(parse(event, DEFAULT_CATEGORIES)).toBeNull();
    });

    it("rejects messages with no financial keyword", () => {
        const event = makeEvent({ body: "Hey let's meet at GHS 50 cafe later" });
        expect(parse(event, DEFAULT_CATEGORIES)).toBeNull();
    });

    it("rejects messages with no parsable amount", () => {
        const event = makeEvent({ body: "You were charged but we don't know how much" });
        expect(parse(event, DEFAULT_CATEGORIES)).toBeNull();
    });

    it("produces lower confidence when no merchant is extracted", () => {
        const richEvent = makeEvent({ body: "debit GHS 45.00 at Melcom" });
        const leanEvent = makeEvent({ body: "debit GHS 45.00" });
        const rich = parse(richEvent, DEFAULT_CATEGORIES);
        const lean = parse(leanEvent, DEFAULT_CATEGORIES);
        expect(rich).not.toBeNull();
        expect(lean).not.toBeNull();
        expect(rich!.confidence).toBeGreaterThan(lean!.confidence);
    });

    it("routes notification events through the sender display/key pipeline", () => {
        const event = makeEvent({
            source: "notification",
            sender: undefined,
            packageName: "com.mtn.momo",
            body: "debit GHS 30.00 at Shell",
        });
        const draft = parse(event, DEFAULT_CATEGORIES);
        expect(draft).not.toBeNull();
        expect(draft!.senderKey).toBe("mtn");
        expect(draft!.senderDisplay).toBe("Mtn Momo");
        expect(draft!.source).toBe("notification");
    });
});
