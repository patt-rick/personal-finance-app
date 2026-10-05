import { Transaction } from "../types";

// Auto-logging stores the first RAW_REMARK_LENGTH chars of the source message in `remark`.
export const RAW_REMARK_LENGTH = 280;

type TitleFields = Pick<Transaction, "description" | "remark" | "rawText">;

/** The remark the user wrote, or undefined when the remark is just the auto-logged raw message. */
export const userRemark = (t: TitleFields): string | undefined => {
    if (!t.remark) return undefined;
    if (t.rawText && t.remark === t.rawText.slice(0, RAW_REMARK_LENGTH)) return undefined;
    return t.remark;
};

export const transactionTitle = (t: TitleFields): string => userRemark(t) || t.description;
