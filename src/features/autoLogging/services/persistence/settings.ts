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

export const loadAutoLogSettings = async (): Promise<AutoLogSettings> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_SETTINGS);
        if (!raw) return { ...DEFAULT_AUTO_LOG_SETTINGS };
        const parsed = JSON.parse(raw) as Partial<AutoLogSettings>;
        return { ...DEFAULT_AUTO_LOG_SETTINGS, ...parsed };
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
