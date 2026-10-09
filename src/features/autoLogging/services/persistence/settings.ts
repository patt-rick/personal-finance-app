import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../../utils/storageKeys";
import { AutoLogSettings } from "../../types";

export const DEFAULT_AUTO_LOG_SETTINGS: AutoLogSettings = {
    enabled: false,
    captureSms: false,
    captureNotifications: false,
    defaultCurrency: "GHS",
    allowedPackages: [],
    allowedSenders: [],
    reviewLowConfidenceOnly: false,
    askBeforeSaving: false,
    minConfidenceForAutoSave: 0.75,
    defaultCurrencyMigrated: false,
};

// The floor sits above the keyword fallback's 0.5 cap, so guesses without a provider template always need review.
export const AUTO_SAVE_THRESHOLD_MIN = 0.55;
export const AUTO_SAVE_THRESHOLD_MAX = 0.95;
const AUTO_SAVE_THRESHOLD_STEP_PERCENT = 5;

export function stepAutoSaveThreshold(current: number, direction: 1 | -1): number {
    const step = AUTO_SAVE_THRESHOLD_STEP_PERCENT;
    const base = Number.isFinite(current) ? current : DEFAULT_AUTO_LOG_SETTINGS.minConfidenceForAutoSave;
    const percent = Math.round(base * 100);
    const next = direction === 1
        ? Math.floor(percent / step) * step + step
        : Math.ceil(percent / step) * step - step;
    const clamped = Math.min(AUTO_SAVE_THRESHOLD_MAX * 100, Math.max(AUTO_SAVE_THRESHOLD_MIN * 100, next));
    return clamped / 100;
}

export const loadAutoLogSettings = async (): Promise<AutoLogSettings> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_SETTINGS);
        if (!raw) return { ...DEFAULT_AUTO_LOG_SETTINGS };
        const parsed = JSON.parse(raw) as Partial<AutoLogSettings>;
        const merged = { ...DEFAULT_AUTO_LOG_SETTINGS, ...parsed };
        if (typeof merged.minConfidenceForAutoSave !== "number" || !Number.isFinite(merged.minConfidenceForAutoSave)) {
            merged.minConfidenceForAutoSave = DEFAULT_AUTO_LOG_SETTINGS.minConfidenceForAutoSave;
        }
        return merged;
    } catch (error) {
        console.error("Error loading auto-log settings:", error);
        return { ...DEFAULT_AUTO_LOG_SETTINGS };
    }
};

export const saveAutoLogSettings = async (settings: AutoLogSettings): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_SETTINGS, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error("Error saving auto-log settings:", error);
        return false;
    }
};
