import { Business, Transaction } from "../src/types";
import {
    TRANSFER_CATEGORY,
    createTransferPair,
    getTransferTargets,
    removeTransactionWithPair,
    validateTransfer,
} from "../src/utils/transfers";

const biz = (id: string, name: string, currency?: string): Business => ({
    id,
    name,
    createdAt: "2026-01-01T00:00:00.000Z",
    currency,
});

const personal = biz("b1", "Personal", "GHS");
const savings = biz("b2", "Savings", "GHS");
const dollar = biz("b3", "Freelance", "USD");
const noCurrency = biz("b4", "Legacy");

function sequentialIds(): () => string {
    let n = 0;
    return () => `id-${++n}`;
}

describe("getTransferTargets", () => {
    it("returns only other cashbooks with the same currency", () => {
        expect(getTransferTargets(personal, [personal, savings, dollar])).toEqual([savings]);
    });

    it("treats missing currency as USD", () => {
        expect(getTransferTargets(noCurrency, [personal, dollar, noCurrency])).toEqual([dollar]);
    });

    it("returns empty when no match exists", () => {
        expect(getTransferTargets(dollar, [personal, savings, dollar])).toEqual([]);
    });
});

describe("validateTransfer", () => {
    it("accepts a valid transfer", () => {
        expect(validateTransfer(personal, savings, 50)).toBeNull();
    });

    it("rejects transfer to the same cashbook", () => {
        expect(validateTransfer(personal, personal, 50)).toBe("same_cashbook");
    });

    it("rejects mismatched currencies", () => {
        expect(validateTransfer(personal, dollar, 50)).toBe("currency_mismatch");
    });

    it("rejects zero, negative, and non-finite amounts", () => {
        expect(validateTransfer(personal, savings, 0)).toBe("invalid_amount");
        expect(validateTransfer(personal, savings, -5)).toBe("invalid_amount");
        expect(validateTransfer(personal, savings, NaN)).toBe("invalid_amount");
        expect(validateTransfer(personal, savings, Infinity)).toBe("invalid_amount");
    });
});

describe("createTransferPair", () => {
    const date = "2026-08-07T12:00:00.000Z";

    it("creates a linked expense/income double entry", () => {
        const { outgoing, incoming } = createTransferPair({
            from: personal,
            to: savings,
            amount: 120.5,
            remark: "monthly stash",
            date,
            makeId: sequentialIds(),
        });

        expect(outgoing.type).toBe("expense");
        expect(outgoing.businessId).toBe(personal.id);
        expect(outgoing.description).toBe("Transfer to Savings");

        expect(incoming.type).toBe("income");
        expect(incoming.businessId).toBe(savings.id);
        expect(incoming.description).toBe("Transfer from Personal");

        for (const leg of [outgoing, incoming]) {
            expect(leg.amount).toBe(120.5);
            expect(leg.date).toBe(date);
            expect(leg.category).toBe(TRANSFER_CATEGORY);
            expect(leg.remark).toBe("monthly stash");
            expect(leg.source).toBe("transfer");
        }

        expect(outgoing.id).not.toBe(incoming.id);
        expect(outgoing.transferId).toBeTruthy();
        expect(outgoing.transferId).toBe(incoming.transferId);
        expect([outgoing.transferId, incoming.transferId]).not.toContain(outgoing.id);
        expect([outgoing.transferId, incoming.transferId]).not.toContain(incoming.id);
    });

    it("omits remark when blank", () => {
        const { outgoing } = createTransferPair({
            from: personal,
            to: savings,
            amount: 10,
            remark: "  ",
            date,
            makeId: sequentialIds(),
        });
        expect(outgoing.remark).toBeUndefined();
    });

    it("throws on an invalid transfer", () => {
        expect(() =>
            createTransferPair({
                from: personal,
                to: dollar,
                amount: 10,
                date,
                makeId: sequentialIds(),
            }),
        ).toThrow("currency_mismatch");
    });
});

describe("removeTransactionWithPair", () => {
    const date = "2026-08-07T12:00:00.000Z";
    const pair = createTransferPair({
        from: personal,
        to: savings,
        amount: 30,
        date,
        makeId: sequentialIds(),
    });
    const plain: Transaction = {
        id: "plain-1",
        description: "Groceries",
        amount: 12,
        date,
        type: "expense",
        businessId: personal.id,
    };
    const all = [pair.outgoing, pair.incoming, plain];

    it("removes both legs when deleting either leg", () => {
        expect(removeTransactionWithPair(all, pair.outgoing.id)).toEqual([plain]);
        expect(removeTransactionWithPair(all, pair.incoming.id)).toEqual([plain]);
    });

    it("removes only the given transaction when it is not a transfer", () => {
        expect(removeTransactionWithPair(all, plain.id)).toEqual([pair.outgoing, pair.incoming]);
    });

    it("returns the list unchanged for an unknown id", () => {
        expect(removeTransactionWithPair(all, "nope")).toEqual(all);
    });
});
