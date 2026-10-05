import { Transaction } from "../src/types";
import { transactionTitle, userRemark } from "../src/utils/transactionTitle";

const tx = (over: Partial<Transaction>): Transaction => ({
    id: "t",
    description: "Melcom",
    amount: 10,
    date: "2026-10-01T10:00:00.000Z",
    type: "expense",
    businessId: "b1",
    ...over,
});

const SMS = "Payment made for GHS 10.00 to Melcom. Ref 12345. Balance GHS 90.00.";

describe("transactionTitle / userRemark", () => {
    it("uses the remark of a manual transaction", () => {
        const t = tx({ remark: "Groceries" });
        expect(transactionTitle(t)).toBe("Groceries");
        expect(userRemark(t)).toBe("Groceries");
    });

    it("falls back to the description when there is no remark", () => {
        const t = tx({});
        expect(transactionTitle(t)).toBe("Melcom");
        expect(userRemark(t)).toBeUndefined();
    });

    it("ignores a remark that is just the auto-logged raw message", () => {
        const t = tx({ autoLogged: true, rawText: SMS, remark: SMS });
        expect(transactionTitle(t)).toBe("Melcom");
        expect(userRemark(t)).toBeUndefined();
    });

    it("keeps a remark the user edited on an auto-logged row", () => {
        const t = tx({ autoLogged: true, rawText: SMS, remark: "Office snacks" });
        expect(transactionTitle(t)).toBe("Office snacks");
        expect(userRemark(t)).toBe("Office snacks");
    });

    it("treats a cleared remark on an auto-logged row as no remark", () => {
        const t = tx({ autoLogged: true, rawText: SMS, remark: "" });
        expect(transactionTitle(t)).toBe("Melcom");
        expect(userRemark(t)).toBeUndefined();
    });

    it("recognizes the 280-char truncated copy of a long raw message", () => {
        const long = "x".repeat(400);
        const t = tx({ autoLogged: true, rawText: long, remark: long.slice(0, 280) });
        expect(transactionTitle(t)).toBe("Melcom");
    });
});
