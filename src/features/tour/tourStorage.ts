import AsyncStorage from "@react-native-async-storage/async-storage";

const TOUR_KEY = "@tour_completed";

export type Completed = Record<string, boolean>;

export async function loadCompleted(): Promise<Completed> {
    try {
        const raw = await AsyncStorage.getItem(TOUR_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Completed) : {};
    } catch {
        return {};
    }
}

export async function saveCompleted(completed: Completed): Promise<void> {
    await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(completed));
}

/**
 * Decides whether the first-run journey should start on its own. Anyone who dismissed the old dashboard tour, or who already has a
 * cashbook, is an existing user and is never interrupted.
 */
export function journeyDisposition(
    completed: Completed,
    cashbookCount: number,
): "completed" | "existing-user" | "start" {
    if (completed.journey || completed.dashboard) return "completed";
    return cashbookCount > 0 ? "existing-user" : "start";
}
