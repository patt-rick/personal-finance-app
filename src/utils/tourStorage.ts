import AsyncStorage from "@react-native-async-storage/async-storage";

const TOUR_KEY = "@tour_completed";

export type TourPage = "dashboard" | "cashbooks" | "budget" | "settings";

export async function isTourCompleted(page: TourPage): Promise<boolean> {
    try {
        const raw = await AsyncStorage.getItem(TOUR_KEY);
        if (!raw) return false;
        const completed: Record<string, boolean> = JSON.parse(raw);
        return !!completed[page];
    } catch {
        return false;
    }
}

export async function markTourCompleted(page: TourPage): Promise<void> {
    const raw = await AsyncStorage.getItem(TOUR_KEY);
    const completed: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    completed[page] = true;
    await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(completed));
}

export async function resetAllTours(): Promise<void> {
    await AsyncStorage.removeItem(TOUR_KEY);
}
