import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../../utils/storageKeys";
import { SenderMapping } from "../../types";

export const loadSenderMappings = async (): Promise<SenderMapping[]> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_SENDER_MAPPINGS);
        return raw ? (JSON.parse(raw) as SenderMapping[]) : [];
    } catch (error) {
        console.error("Error loading sender mappings:", error);
        return [];
    }
};

export const saveSenderMappings = async (mappings: SenderMapping[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_SENDER_MAPPINGS, JSON.stringify(mappings));
        return true;
    } catch (error) {
        console.error("Error saving sender mappings:", error);
        return false;
    }
};

export const appendSenderMapping = async (mapping: SenderMapping): Promise<boolean> => {
    const existing = await loadSenderMappings();
    const index = existing.findIndex((m) => m.senderKey === mapping.senderKey);
    const next = index >= 0
        ? existing.map((m, i) => (i === index ? mapping : m))
        : [...existing, mapping];
    return saveSenderMappings(next);
};
