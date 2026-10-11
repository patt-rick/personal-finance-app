import AsyncStorage from "@react-native-async-storage/async-storage";
import { Budget } from "../../../types";
import { STORAGE_KEYS } from "../../../utils/storageKeys";
import { migrateBudgets } from "../migrate";
import { sameScope } from "../scope";
import { removeLedgerEntriesForBudgets } from "../alerts/ledger";

const KEY = STORAGE_KEYS.BUDGETS;

/** Throws on unreadable storage so writers never overwrite data they couldn't read. */
async function readBudgets(): Promise<Budget[]> {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? migrateBudgets(JSON.parse(raw)).budgets : [];
}

export async function loadBudgets(): Promise<Budget[]> {
    try {
        return await readBudgets();
    } catch (error) {
        console.error("Error loading budgets:", error);
        return [];
    }
}

export async function saveBudgets(budgets: unknown[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(budgets));
        return true;
    } catch (error) {
        console.error("Error saving budgets:", error);
        return false;
    }
}

/** Writes the migrated shape back once, unless something else changed the stored value in between. */
export async function persistBudgetMigration(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return;
        const { budgets, changed } = migrateBudgets(JSON.parse(raw));
        if (!changed) return;
        if ((await AsyncStorage.getItem(KEY)) !== raw) return;
        await AsyncStorage.setItem(KEY, JSON.stringify(budgets));
    } catch (error) {
        console.error("Error migrating budgets:", error);
    }
}

export async function upsertBudget(budget: Budget): Promise<"ok" | "duplicate" | "error"> {
    try {
        const budgets = await readBudgets();
        if (budgets.some((b) => b.id !== budget.id && sameScope(b.scope, budget.scope))) return "duplicate";
        const next = budgets.some((b) => b.id === budget.id)
            ? budgets.map((b) => (b.id === budget.id ? budget : b))
            : [...budgets, budget];
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        return "ok";
    } catch (error) {
        console.error("Error saving budget:", error);
        return "error";
    }
}

async function removeWhere(drop: (b: Budget) => boolean): Promise<boolean> {
    try {
        const budgets = await readBudgets();
        const removed = budgets.filter(drop).map((b) => b.id);
        if (removed.length === 0) return true;
        await AsyncStorage.setItem(KEY, JSON.stringify(budgets.filter((b) => !drop(b))));
        await removeLedgerEntriesForBudgets(removed);
        return true;
    } catch (error) {
        console.error("Error deleting budgets:", error);
        return false;
    }
}

export const deleteBudget = (id: string): Promise<boolean> => removeWhere((b) => b.id === id);

export const deleteBudgetsForBusinesses = (businessIds: string[]): Promise<boolean> =>
    removeWhere((b) => b.scope.kind === "cashbook" && businessIds.includes(b.scope.businessId));

export async function removeCategoryFromBudgets(categoryId: string): Promise<void> {
    try {
        const budgets = await readBudgets();
        if (!budgets.some((b) => b.limits.some((l) => categoryId in l.categoryLimits))) return;
        const next = budgets.map((b) => ({
            ...b,
            limits: b.limits.map((l) => {
                const rest = { ...l.categoryLimits };
                delete rest[categoryId];
                return { ...l, categoryLimits: rest };
            }),
        }));
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch (error) {
        console.error("Error updating budgets:", error);
    }
}
