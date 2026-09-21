import { Category } from "../types";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Merge a category named `name` of `type` into `existing`. Trims the name and
 * dedupes case-insensitively (tolerating untrimmed legacy names): a match
 * returns the existing category with the list untouched; otherwise a new
 * category is appended. Pure — callers persist the returned list.
 */
export const addCategory = (
    name: string,
    type: "income" | "expense",
    existing: Category[],
): { list: Category[]; category: Category } => {
    const trimmed = name.trim();
    const match = existing.find((c) => c.type === type && norm(c.name) === norm(trimmed));
    if (match) {
        return { list: existing, category: match };
    }
    const category: Category = {
        id: Date.now().toString(),
        name: trimmed,
        type,
        isDefault: false,
    };
    return { list: [...existing, category], category };
};
