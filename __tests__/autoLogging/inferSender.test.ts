import { inferSenderFromBody } from "../../src/features/autoLogging/services/routing/inferSender";
import { rawSenderIdOf } from "../../src/features/autoLogging/services/routing/normalizeSender";
import { RawEvent } from "../../src/features/autoLogging/types";

describe("inferSenderFromBody", () => {
    it.each([
        ["You have received GHS 500 from John Doe via MTN MoMo. TxnID: REF99", "MTN"],
        ["Your MoMo balance is GHS 20.00", "MTN"],
        ["Telecel Cash: You have sent GHS 10 to Ama", "Telecel"],
        ["Vodafone Cash payment of GHS 12 received", "Telecel"],
        ["AirtelTigo Money: GHS 5 sent", "AirtelTigo"],
        ["GCB: Your acct 123 has been debited GHS 40", "GCB"],
        ["Ecobank Alert: Debit of GHS 15.00", "Ecobank"],
        ["Your CalBank account was credited GHS 100", "CalBank"],
        ["Access Bank: GHS 9 withdrawn", "Access Bank"],
    ])("infers the provider of %p", (body, expected) => {
        expect(inferSenderFromBody(body)).toBe(expected);
    });

    it("picks the provider named first when several appear", () => {
        expect(inferSenderFromBody("GCB: GHS 50 transferred to MTN MoMo wallet 024")).toBe("GCB");
        expect(inferSenderFromBody("MoMo: You paid GHS 50 to Ecobank merchant")).toBe("MTN");
    });

    it("returns null when no provider is named", () => {
        expect(inferSenderFromBody("Debit Alert: GHS 45.00 at Melcom")).toBeNull();
        expect(inferSenderFromBody("Payment from a gcbx shop")).toBeNull();
    });
});

describe("rawSenderIdOf for sender-less iOS/paste events", () => {
    const base: RawEvent = { id: "1", source: "sms", body: "", timestamp: 0, rawHash: "" };

    it("prefers an explicit sender, then an inferred one, then the generic label", () => {
        expect(rawSenderIdOf({ ...base, via: "shortcut", sender: "GCB", body: "MoMo GHS 5" })).toBe("GCB");
        expect(rawSenderIdOf({ ...base, via: "shortcut", body: "MoMo: paid GHS 5" })).toBe("MTN");
        expect(rawSenderIdOf({ ...base, via: "paste", body: "Debit GHS 5 at Melcom" })).toBe("SMS");
    });

    it("never infers for Android events", () => {
        expect(rawSenderIdOf({ ...base, body: "MoMo: paid GHS 5" })).toBe("");
    });
});
