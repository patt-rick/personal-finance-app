import { extractAmount } from "../../src/features/autoLogging/services/parser/normalize";

describe("extractAmount — in-order, non-balance selection (P1.3)", () => {
    it("prefers the first primary amount over a later cashback suffix", () => {
        expect(extractAmount("Sent GHS 50.00 to Ama. Cashback 2.00GHS today"))
            .toEqual({ amount: 50, currencyCode: "GHS" });
    });

    it("prefers the recharged amount over an earned cashback", () => {
        expect(extractAmount("Recharge of GHS 5.00 successful. You earned GHS 0.05 cashback"))
            .toEqual({ amount: 5, currencyCode: "GHS" });
    });

    it("ignores a balance stated after the transaction (wide backward window)", () => {
        expect(extractAmount("Debited GHS 50.00. Your balance after this transaction is GHS 900.00"))
            .toEqual({ amount: 50, currencyCode: "GHS" });
    });

    it("ignores a balance whose hint follows the amount (forward window)", () => {
        expect(extractAmount("Transfer of GHS 50.00 successful. GHS 150.00 is your new wallet balance"))
            .toEqual({ amount: 50, currencyCode: "GHS" });
    });

    it("returns no amount when only a balance figure is present", () => {
        expect(extractAmount("Your deposit was successful. Avail Bal: GHS 1,250.00"))
            .toEqual({ amount: null, currencyCode: null });
    });

    it("keeps a real balance line from stealing the transaction amount", () => {
        expect(extractAmount("Debit Alert: GHS 45.00 at Melcom. New Bal: GHS 200.00"))
            .toEqual({ amount: 45, currencyCode: "GHS" });
    });

    it("treats a balance stated in its own sentence as balance-only (R3)", () => {
        expect(
            extractAmount(
                "Your deposit was successful. GHS 1,250.00 is your available balance. Dial *170# for more",
            ),
        ).toEqual({ amount: null, currencyCode: null });
    });

    it("flags a balance even when the hint precedes the amount in the same sentence (R3)", () => {
        expect(
            extractAmount("Your wallet balance after this cash out transaction is GHS 900.00"),
        ).toEqual({ amount: null, currencyCode: null });
    });

    it("keeps the real debit when a dated balance sentence follows (R3)", () => {
        const result = extractAmount(
            "Debit Alert: GHS 45.00 at Melcom on 2026-04-23. New Bal: GHS 200.00",
        );
        expect(result).toEqual({ amount: 45, currencyCode: "GHS" });
        expect(result.amount).not.toBe(900);
    });
});
