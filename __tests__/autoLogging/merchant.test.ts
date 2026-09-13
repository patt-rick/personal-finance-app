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
});
