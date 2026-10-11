import { Category, RecurringTransaction, Transaction } from "../types";
import { ReviewItem } from "../features/autoLogging/types";

export type CategoryNameError = "empty" | "duplicate" | "missing";

const norm = (s: string) => s.trim().toLowerCase();

export function checkCategoryName(
    categories: Category[],
    type: "income" | "expense",
    name: string,
    exceptId?: string,
): CategoryNameError | null {
    if (!name.trim()) return "empty";
    return categories.some((c) => c.id !== exceptId && c.type === type && norm(c.name) === norm(name)) ? "duplicate" : null;
}

interface RenameInput {
    categories: Category[];
    transactions: Transaction[];
    recurring: RecurringTransaction[];
    reviewItems: ReviewItem[];
}

export type RenameResult =
    | (RenameInput & { changed: { transactions: boolean; recurring: boolean; reviewItems: boolean } })
    | { error: CategoryNameError };

/** Records store the category by name, so a rename rewrites every same-type record that carries the old name. */
export function renameCategoryEverywhere(input: RenameInput, categoryId: string, nextName: string): RenameResult {
    const category = input.categories.find((c) => c.id === categoryId);
    if (!category) return { error: "missing" };
    const error = checkCategoryName(input.categories, category.type, nextName, categoryId);
    if (error) return { error };
    const name = nextName.trim();
    const old = norm(category.name);
    const hits = (type: string, value?: string) => type === category.type && value !== undefined && norm(value) === old;
    const changed = { transactions: false, recurring: false, reviewItems: false };
    const transactions = input.transactions.map((t) => {
        if (!hits(t.type, t.category)) return t;
        changed.transactions = true;
        return { ...t, category: name };
    });
    const recurring = input.recurring.map((r) => {
        if (!hits(r.type, r.category)) return r;
        changed.recurring = true;
        return { ...r, category: name };
    });
    const reviewItems = input.reviewItems.map((item) => {
        const type = item.draft.type === "income" ? "income" : "expense";
        if (!hits(type, item.draft.category)) return item;
        changed.reviewItems = true;
        return { ...item, draft: { ...item.draft, category: name } };
    });
    return {
        categories: input.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
        transactions,
        recurring,
        reviewItems,
        changed,
    };
}
