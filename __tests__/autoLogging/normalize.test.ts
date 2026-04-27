import {
    extractAmount,
    extractMerchant,
    extractReference,
    lowerKey,
    normalizeMerchantKey,
    normalizeText,
} from "../../src/features/autoLogging/services/parser/normalize";

describe("normalizeText", () => {
    it("collapses whitespace and trims", () => {
        expect(normalizeText("  hello   world  ")).toBe("hello world");
    });

    it("strips zero-width characters", () => {
        expect(normalizeText("a​b‌c‍d﻿e")).toBe("abcde");
    });

    it("normalizes curly quotes", () => {
        expect(normalizeText("he‘llo’")).toBe("he'llo'");
        expect(normalizeText("“hi”")).toBe('"hi"');
    });

    it("returns empty string for empty input", () => {
        expect(normalizeText("")).toBe("");
    });
});

describe("lowerKey", () => {
    it("lowercases and normalizes", () => {
        expect(lowerKey("  Hello   World  ")).toBe("hello world");
    });
});

describe("extractAmount", () => {
    it("parses GHS code prefix", () => {
        expect(extractAmount("Debit Alert: GHS 45.00 at Melcom"))
            .toEqual({ amount: 45, currencyCode: "GHS" });
    });

    it("parses USD/EUR/GBP symbol prefixes", () => {
        expect(extractAmount("Paid $45 to Uber")).toEqual({ amount: 45, currencyCode: "USD" });
        expect(extractAmount("Spent €1,234.56")).toEqual({ amount: 1234.56, currencyCode: "EUR" });
        expect(extractAmount("Charged £10.50")).toEqual({ amount: 10.5, currencyCode: "GBP" });
    });

    it("parses GH₵ compound symbol", () => {
        expect(extractAmount("debit GH₵45.00 at Shell"))
            .toEqual({ amount: 45, currencyCode: "GHS" });
    });

    it("parses code suffix form", () => {
        expect(extractAmount("You have received 500.00 GHS from John"))
            .toEqual({ amount: 500, currencyCode: "GHS" });
    });

    it("treats GHC as GHS", () => {
        expect(extractAmount("Paid GHC 12.00 at Shop"))
            .toEqual({ amount: 12, currencyCode: "GHS" });
    });

    it("handles thousand separators", () => {
        expect(extractAmount("Charged USD 12,345.00 at Acme"))
            .toEqual({ amount: 12345, currencyCode: "USD" });
    });

    it("scales k/m magnitudes", () => {
        expect(extractAmount("Paid GHS 1.2k for rent"))
            .toEqual({ amount: 1200, currencyCode: "GHS" });
        expect(extractAmount("Salary credited GHS 2m"))
            .toEqual({ amount: 2_000_000, currencyCode: "GHS" });
    });

    it("returns nulls when no amount is present", () => {
        expect(extractAmount("Hello there, friend"))
            .toEqual({ amount: null, currencyCode: null });
    });

    it("prefers a transaction amount over a balance line", () => {
        const text = "Debit Alert: GHS 45.00 at Melcom. New Bal: GHS 200.00";
        expect(extractAmount(text)).toEqual({ amount: 45, currencyCode: "GHS" });
    });

    it("rejects long unseparated digit runs that look like account numbers", () => {
        const text = "Acct 0123456789012 has been credited GHS 50";
        expect(extractAmount(text)).toEqual({ amount: 50, currencyCode: "GHS" });
    });
});

describe("extractReference", () => {
    it("captures TxnID forms", () => {
        expect(extractReference("Payment received. TxnID: ABC1234"))
            .toBe("ABC1234");
        expect(extractReference("Trans ID: 0099XYZ done")).toBe("0099XYZ");
    });

    it("captures Reference / Ref forms", () => {
        expect(extractReference("Reference 1234567890")).toBe("1234567890");
        expect(extractReference("Ref. 5566778")).toBe("5566778");
    });

    it("captures Receipt no. forms", () => {
        expect(extractReference("Receipt No 9988XYZ")).toBe("9988XYZ");
    });

    it("returns null when nothing matches", () => {
        expect(extractReference("Hello there")).toBeNull();
    });
});

describe("extractMerchant", () => {
    it("extracts 'at <Merchant>'", () => {
        expect(extractMerchant("Debit Alert: GHS 45.00 at Melcom on 2026-04-23"))
            .toBe("Melcom");
    });

    it("extracts 'paid to <Merchant>' before plain 'to'", () => {
        expect(extractMerchant("You have paid to Uber Ghana for ride"))
            .toBe("Uber Ghana");
    });

    it("extracts 'from <Merchant>' for incoming", () => {
        expect(extractMerchant("You have received GHS 500 from John Doe via MTN"))
            .toBe("John Doe");
    });

    it("trims tail tokens like 'on', 'via', 'ref'", () => {
        expect(extractMerchant("Charged GHS 10 at Shell on 2026-04-23 ref 0099"))
            .toBe("Shell");
        expect(extractMerchant("Paid to Bolt via MoMo")).toBe("Bolt");
    });

    it("returns null when no merchant phrase exists", () => {
        expect(extractMerchant("GHS 45.00 paid")).toBeNull();
    });
});

describe("normalizeMerchantKey", () => {
    it("strips non-alphanumerics and lowercases", () => {
        expect(normalizeMerchantKey("Uber Ghana")).toBe("uberghana");
        expect(normalizeMerchantKey("McDonald's")).toBe("mcdonalds");
    });

    it("handles null/undefined", () => {
        expect(normalizeMerchantKey(null)).toBe("");
        expect(normalizeMerchantKey(undefined)).toBe("");
    });
});
