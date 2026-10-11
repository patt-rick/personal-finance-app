import { Category, RecurringTransaction, Transaction } from "../../src/types";
import { ReviewItem } from "../../src/features/autoLogging/types";
import { checkCategoryName, renameCategoryEverywhere } from "../../src/utils/categoryRename";

const categories: Category[] = [
    { id: "f", name: "Food", type: "expense" },
    { id: "fi", name: "Food", type: "income" },
    { id: "t", name: "Transport", type: "expense" },
];
const tx = (id: string, type: "income" | "expense", category: string) =>
    ({ id, type, category, amount: 1, date: "", description: "", businessId: "a" }) as Transaction;

describe("checkCategoryName", () => {
    it("rejects empty and same-type duplicates, allows its own name and other types", () => {
        expect(checkCategoryName(categories, "expense", "  ")).toBe("empty");
        expect(checkCategoryName(categories, "expense", " transport ", "f")).toBe("duplicate");
        expect(checkCategoryName(categories, "expense", "FOOD", "f")).toBeNull();
        expect(checkCategoryName(categories, "income", "Transport")).toBeNull();
    });
});

describe("renameCategoryEverywhere", () => {
    it("renames the category and matching same-type records only", () => {
        const result = renameCategoryEverywhere(
            {
                categories,
                transactions: [tx("1", "expense", "food "), tx("2", "income", "Food"), tx("3", "expense", "Transport")],
                recurring: [{ id: "r", type: "expense", category: "Food" } as RecurringTransaction],
                reviewItems: [
                    { id: "q", draft: { type: "transfer", category: "FOOD" } } as unknown as ReviewItem,
                    { id: "q2", draft: { type: "income", category: "Food" } } as unknown as ReviewItem,
                ],
            },
            "f",
            " Groceries ",
        );
        if ("error" in result) throw new Error(result.error);
        expect(result.categories.find((c) => c.id === "f")?.name).toBe("Groceries");
        expect(result.transactions.map((t) => t.category)).toEqual(["Groceries", "Food", "Transport"]);
        expect(result.recurring[0].category).toBe("Groceries");
        expect(result.reviewItems.map((i) => i.draft.category)).toEqual(["Groceries", "Food"]);
        expect(result.changed).toEqual({ transactions: true, recurring: true, reviewItems: true });
    });

    it("refuses collisions and unknown categories", () => {
        const empty = { categories, transactions: [], recurring: [], reviewItems: [] };
        expect(renameCategoryEverywhere(empty, "f", "Transport")).toEqual({ error: "duplicate" });
        expect(renameCategoryEverywhere(empty, "nope", "X")).toEqual({ error: "missing" });
    });
});
