import { Business } from "../../src/types";
import { resolveBudgetSelection } from "../../src/utils/budgetSelection";

const biz = (id: string, name = id): Business => ({ id, name, createdAt: "2026-01-01T00:00:00.000Z" });

const personal = biz("b1", "Personal");
const savings = biz("b2", "Savings");
const all = [personal, savings];

describe("resolveBudgetSelection", () => {
    it("follows the cashbook that is open elsewhere in the app", () => {
        expect(resolveBudgetSelection(personal, savings, all)).toBe(savings);
    });

    it("keeps the chip the user picked when data refreshes", () => {
        const refreshed = [biz("b1", "Personal"), biz("b2", "Savings (renamed)")];
        expect(resolveBudgetSelection(savings, null, refreshed)).toBe(refreshed[1]);
    });

    it("falls back to the first cashbook when the picked one was deleted", () => {
        expect(resolveBudgetSelection(biz("gone"), null, all)).toBe(personal);
    });

    it("selects the first cashbook initially and nothing when there are none", () => {
        expect(resolveBudgetSelection(null, null, all)).toBe(personal);
        expect(resolveBudgetSelection(null, null, [])).toBeNull();
    });
});
