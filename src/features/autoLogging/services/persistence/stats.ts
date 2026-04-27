import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../../utils/storageKeys";
import { AutoLogStats } from "../../types";

export const EMPTY_STATS: AutoLogStats = {
    capturedSms: 0,
    capturedNotifications: 0,
    autoSaved: 0,
    queuedForReview: 0,
    dedupeHits: 0,
    parseFailures: 0,
    templatesMatched: 0,
    referencesCaptured: 0,
    lastUpdated: null,
};

export async function loadAutoLogStats(): Promise<AutoLogStats> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_STATS);
        if (!raw) return { ...EMPTY_STATS };
        const parsed = JSON.parse(raw) as Partial<AutoLogStats>;
        return { ...EMPTY_STATS, ...parsed };
    } catch {
        return { ...EMPTY_STATS };
    }
}

export async function saveAutoLogStats(stats: AutoLogStats): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_STATS, JSON.stringify(stats));
        return true;
    } catch {
        return false;
    }
}

export async function incrementAutoLogStats(deltas: Partial<AutoLogStats>): Promise<AutoLogStats> {
    const current = await loadAutoLogStats();
    const next: AutoLogStats = {
        capturedSms: current.capturedSms + (deltas.capturedSms ?? 0),
        capturedNotifications: current.capturedNotifications + (deltas.capturedNotifications ?? 0),
        autoSaved: current.autoSaved + (deltas.autoSaved ?? 0),
        queuedForReview: current.queuedForReview + (deltas.queuedForReview ?? 0),
        dedupeHits: current.dedupeHits + (deltas.dedupeHits ?? 0),
        parseFailures: current.parseFailures + (deltas.parseFailures ?? 0),
        templatesMatched: current.templatesMatched + (deltas.templatesMatched ?? 0),
        referencesCaptured: current.referencesCaptured + (deltas.referencesCaptured ?? 0),
        lastUpdated: new Date().toISOString(),
    };
    await saveAutoLogStats(next);
    return next;
}

export async function resetAutoLogStats(): Promise<void> {
    await saveAutoLogStats({ ...EMPTY_STATS, lastUpdated: new Date().toISOString() });
}
