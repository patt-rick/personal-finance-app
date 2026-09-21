import { addCategory } from "../../src/utils/categories";
import { Category } from "../../src/types";

const cat = (over: Partial<Category>): Category => ({
    id: "x",
    name: "Food",
    type: "expense",
    isDefault: false,
    ...over,
});

describe("addCategory", () => {
    it("appends a new category with the expected shape", () => {
        const existing = [cat({ id: "1", name: "Food" })];
        const { list, category } = addCategory("Transport", "expense", existing);

        expect(category).toMatchObject({
            name: "Transport",
            type: "expense",
            isDefault: false,
        });
        expect(typeof category.id).toBe("string");
        expect(category.id.length).toBeGreaterThan(0);
        expect(list).toHaveLength(2);
        expect(list[1]).toBe(category);
        expect(list[0]).toBe(existing[0]);
    });

    it("trims the stored name", () => {
        const { category } = addCategory("  Transport  ", "expense", []);
        expect(category.name).toBe("Transport");
    });

    it("returns the existing category on a case-insensitive duplicate, list unchanged", () => {
        const existing = [cat({ id: "1", name: "Food" })];
        const { list, category } = addCategory("food", "expense", existing);

        expect(category).toBe(existing[0]);
        expect(list).toBe(existing);
    });

    it("matches duplicates even when legacy stored names are untrimmed", () => {
        const existing = [cat({ id: "1", name: "  Food  " })];
        const { list, category } = addCategory("food", "expense", existing);

        expect(category).toBe(existing[0]);
        expect(list).toBe(existing);
    });

    it("treats the same name under a different type as a new category", () => {
        const existing = [cat({ id: "1", name: "Business", type: "income" })];
        const { list, category } = addCategory("Business", "expense", existing);

        expect(list).toHaveLength(2);
        expect(category.type).toBe("expense");
        expect(category).not.toBe(existing[0]);
    });
});
