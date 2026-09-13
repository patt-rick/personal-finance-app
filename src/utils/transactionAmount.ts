import { Transaction } from "../types";

export const FEES_CATEGORY_LABEL = "Fees & Taxes";

/** Total money moved by a transaction: principal plus any fee/tax. */
export const grossAmount = (t: Pick<Transaction, "amount" | "fee">): number =>
    t.amount + (t.fee ?? 0);
