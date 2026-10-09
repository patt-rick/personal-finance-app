import { Business, Transaction } from "../src/types";
import {
    TRANSFER_CATEGORY,
    createTransferPair,
    excludeInternalTransfers,
    getTransferTargets,
    removeTransactionWithPair,
    validateTransfer,
} from "../src/utils/transfers";
import { computeCashbookBalance } from "../src/utils/cashbookBalance";
import { grossAmount } from "../src/utils/transactionAmount";

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

    it("rejects a negative or non-finite fee", () => {
        expect(validateTransfer(personal, savings, 50, -1)).toBe("invalid_fee");
        expect(validateTransfer(personal, savings, 50, NaN)).toBe("invalid_fee");
        expect(validateTransfer(personal, savings, 50, 0)).toBeNull();
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

    it("charges the fee to the outgoing leg only", () => {
        const { outgoing, incoming } = createTransferPair({
            from: personal,
            to: savings,
            amount: 100,
            fee: 1.5,
            date,
            makeId: sequentialIds(),
        });
        expect(outgoing.amount).toBe(100);
        expect(outgoing.fee).toBe(1.5);
        expect(incoming.amount).toBe(100);
        expect(incoming.fee).toBeUndefined();
    });

    it("debits amount plus fee from the sender and credits only the amount", () => {
        const { outgoing, incoming } = createTransferPair({
            from: personal,
            to: savings,
            amount: 100,
            fee: 1.5,
            date,
            makeId: sequentialIds(),
        });
        const all = [outgoing, incoming];
        expect(computeCashbookBalance(all, personal.id)).toBe(-101.5);
        expect(computeCashbookBalance(all, savings.id)).toBe(100);
    });

    it("omits a zero fee", () => {
        const { outgoing } = createTransferPair({
            from: personal,
            to: savings,
            amount: 100,
            fee: 0,
            date,
            makeId: sequentialIds(),
        });
        expect(outgoing.fee).toBeUndefined();
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

describe("excludeInternalTransfers", () => {
    const groceries: Transaction = {
        id: "g",
        description: "Groceries",
        amount: 80,
        date: "2026-09-10T00:00:00.000Z",
        type: "expense",
        businessId: "b1",
        category: "Food",
    };

    function pair(fee?: number) {
        return createTransferPair({
            from: personal,
            to: savings,
            amount: 5000,
            fee,
            date: "2026-09-10T00:00:00.000Z",
            makeId: sequentialIds(),
        });
    }

    it("drops both halves of a transfer between cashbooks and keeps everything else", () => {
        const { outgoing, incoming } = pair();
        expect(excludeInternalTransfers([groceries, outgoing, incoming])).toEqual([groceries]);
    });

    it("keeps only the fee of a fee-bearing transfer, so all-cashbook balance is unchanged", () => {
        const { outgoing, incoming } = pair(5);
        const all = [groceries, outgoing, incoming];
        const result = excludeInternalTransfers(all);

        expect(result).toHaveLength(2);
        const feeOnly = result.find((t) => t.id === outgoing.id)!;
        expect(feeOnly.amount).toBe(0);
        expect(feeOnly.fee).toBe(5);

        const net = (list: Transaction[]) =>
            list.reduce((s, t) => (t.type === "income" ? s + t.amount : s - grossAmount(t)), 0);
        expect(net(result)).toBe(net(all));
    });

    it("keeps a half whose partner is gone (its cashbook was deleted)", () => {
        const { incoming } = pair();
        expect(excludeInternalTransfers([groceries, incoming])).toEqual([groceries, incoming]);
    });

    it("keeps both halves when they no longer share a group (cashbook currency changed later)", () => {
        const { outgoing, incoming } = pair();
        const currency: Record<string, string> = { b1: "USD", b2: "GHS" };
        const result = excludeInternalTransfers([outgoing, incoming], (t) => currency[t.businessId]);
        expect(result).toEqual([outgoing, incoming]);
    });

    it("leaves SMS-detected transfers to other people alone", () => {
        const momoTransfer: Transaction = { ...groceries, id: "m", category: "Transfer", source: "sms" };
        expect(excludeInternalTransfers([momoTransfer])).toEqual([momoTransfer]);
    });
});
