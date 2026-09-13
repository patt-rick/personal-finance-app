import { extractMerchant } from "../../src/features/autoLogging/services/parser/normalize";

describe("extractMerchant — sentence-boundary stop (P1.6)", () => {
    it("stops the counterparty at the first sentence boundary before a balance clause", () => {
        expect(
            extractMerchant("Cash Out made for GHS1600.00 to VANTHELMA VENTURES. Current Balance: GHS256.82"),
        ).toBe("VANTHELMA VENTURES");
    });

    it("stops before a trailing thank-you sentence", () => {
        expect(
            extractMerchant("Payment made for GHS 10.00 to Kofi Mensah. Thank you for using MTN MobileMoney"),
        ).toBe("Kofi Mensah");
    });

    it("keeps a leading abbreviation dot in the merchant name (R4)", () => {
        expect(
            extractMerchant("Payment made for GHS 20.00 to ST. JOHN PHARMACY. Thank you", "to"),
        ).toBe("ST. JOHN PHARMACY");
    });

    it("keeps multi-letter initialisms with dots (R4)", () => {
        expect(
            extractMerchant("Sent GHS 30 to K.O. VENTURES on 2026-01-01", "to"),
        ).toBe("K.O. VENTURES");
    });
});
