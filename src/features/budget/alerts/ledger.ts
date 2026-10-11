import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../utils/storageKeys";

const KEY = STORAGE_KEYS.BUDGET_ALERTS_FIRED;

export async function loadLedger(): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
    } catch {
        return [];
    }
}

export async function saveLedger(keys: string[]): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(keys));
}

export async function removeLedgerEntriesForBudgets(budgetIds: string[]): Promise<void> {
    const keys = await loadLedger();
    const next = keys.filter((k) => !budgetIds.includes(k.split("|")[0]));
    if (next.length !== keys.length) await saveLedger(next);
}
