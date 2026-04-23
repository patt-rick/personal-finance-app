import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../../utils/storageKeys";
import { ReviewItem } from "../../types";

export const loadReviewQueue = async (): Promise<ReviewItem[]> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_REVIEW_QUEUE);
        return raw ? (JSON.parse(raw) as ReviewItem[]) : [];
    } catch (error) {
        console.error("Error loading review queue:", error);
        return [];
    }
};

export const saveReviewQueue = async (items: ReviewItem[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_REVIEW_QUEUE, JSON.stringify(items));
        return true;
    } catch (error) {
        console.error("Error saving review queue:", error);
        return false;
    }
};

export const appendReviewItem = async (item: ReviewItem): Promise<boolean> => {
    const existing = await loadReviewQueue();
    if (existing.some((i) => i.id === item.id)) return true;
    return saveReviewQueue([...existing, item]);
};

export const removeReviewItem = async (id: string): Promise<boolean> => {
    const existing = await loadReviewQueue();
    const next = existing.filter((i) => i.id !== id);
    if (next.length === existing.length) return true;
    return saveReviewQueue(next);
};
