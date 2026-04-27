import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../../utils/storageKeys";

export interface RawHistoryEntry {
    rawHash: string;
    fingerprint: string;
    txId: string | null;
    occurredAt: number;
    confidence: number;
}

const MAX_ENTRIES = 2000;

export async function loadRawHistory(): Promise<RawHistoryEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_RAW_HISTORY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as RawHistoryEntry[]) : [];
    } catch {
        return [];
    }
}

export async function saveRawHistory(entries: RawHistoryEntry[]): Promise<boolean> {
    try {
        const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
        await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_RAW_HISTORY, JSON.stringify(trimmed));
        return true;
    } catch {
        return false;
    }
}

export async function appendRawHistory(entry: RawHistoryEntry): Promise<void> {
    const existing = await loadRawHistory();
    const filtered = existing.filter(
        (e) => e.rawHash !== entry.rawHash && e.fingerprint !== entry.fingerprint,
    );
    filtered.push(entry);
    await saveRawHistory(filtered);
}

export interface RawHistoryLookup {
    byRawHash: Map<string, RawHistoryEntry>;
    byFingerprint: Map<string, RawHistoryEntry>;
}

export function indexRawHistory(entries: RawHistoryEntry[]): RawHistoryLookup {
    const byRawHash = new Map<string, RawHistoryEntry>();
    const byFingerprint = new Map<string, RawHistoryEntry>();
    for (const entry of entries) {
        if (entry.rawHash) byRawHash.set(entry.rawHash, entry);
        if (entry.fingerprint) byFingerprint.set(entry.fingerprint, entry);
    }
    return { byRawHash, byFingerprint };
}
