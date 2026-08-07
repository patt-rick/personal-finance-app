import { Business, Transaction } from "../types";

export const TRANSFER_CATEGORY = "Transfer";

export type TransferValidationError = "same_cashbook" | "currency_mismatch" | "invalid_amount";

export function cashbookCurrency(business: Business): string {
    return business.currency || "USD";
}

export function getTransferTargets(from: Business, all: Business[]): Business[] {
    return all.filter(
        (b) => b.id !== from.id && cashbookCurrency(b) === cashbookCurrency(from),
    );
}

export function validateTransfer(
    from: Business,
    to: Business,
    amount: number,
): TransferValidationError | null {
    if (from.id === to.id) return "same_cashbook";
    if (cashbookCurrency(from) !== cashbookCurrency(to)) return "currency_mismatch";
    if (!Number.isFinite(amount) || amount <= 0) return "invalid_amount";
    return null;
}

export interface CreateTransferArgs {
    from: Business;
    to: Business;
    amount: number;
    remark?: string;
    date: string;
    makeId: () => string;
}

export function createTransferPair(args: CreateTransferArgs): {
    outgoing: Transaction;
    incoming: Transaction;
} {
    const { from, to, amount, date, makeId } = args;
    const error = validateTransfer(from, to, amount);
    if (error) throw new Error(error);

    const transferId = makeId();
    const remark = args.remark?.trim() || undefined;
    const shared = {
        amount,
        date,
        category: TRANSFER_CATEGORY,
        remark,
        source: "transfer" as const,
        transferId,
    };

    return {
        outgoing: {
            id: makeId(),
            description: `Transfer to ${to.name}`,
            type: "expense",
            businessId: from.id,
            ...shared,
        },
        incoming: {
            id: makeId(),
            description: `Transfer from ${from.name}`,
            type: "income",
            businessId: to.id,
            ...shared,
        },
    };
}

export function removeTransactionWithPair(all: Transaction[], id: string): Transaction[] {
    const target = all.find((t) => t.id === id);
    if (!target) return all;
    if (target.transferId) {
        return all.filter((t) => t.transferId !== target.transferId);
    }
    return all.filter((t) => t.id !== id);
}
