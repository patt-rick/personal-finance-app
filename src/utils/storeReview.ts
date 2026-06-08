import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const REVIEW_STATE_KEY = "@store_review_state";
const TRANSACTION_THRESHOLD = 3;
const MIN_DAYS_BETWEEN_ATTEMPTS = 90;

interface ReviewState {
    requestedAt?: string;
    attempts: number;
}

type ReviewTrigger =
    | { kind: "transaction"; totalTransactions: number }
    | { kind: "tour_completed" };

async function getState(): Promise<ReviewState> {
    try {
        const raw = await AsyncStorage.getItem(REVIEW_STATE_KEY);
        if (!raw) return { attempts: 0 };
        const parsed = JSON.parse(raw);
        return { attempts: parsed.attempts ?? 0, requestedAt: parsed.requestedAt };
    } catch {
        return { attempts: 0 };
    }
}

async function saveState(state: ReviewState): Promise<void> {
    try {
        await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
    } catch {
        // swallow — failing to persist must not crash the flow
    }
}

function loadStoreReviewModule(): any | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require("expo-store-review");
    } catch {
        return null;
    }
}

function isEligibleByThrottle(state: ReviewState): boolean {
    if (!state.requestedAt) return true;
    const last = new Date(state.requestedAt).getTime();
    if (!Number.isFinite(last)) return true;
    const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
    return daysSince >= MIN_DAYS_BETWEEN_ATTEMPTS;
}

function isEligibleByTrigger(trigger: ReviewTrigger): boolean {
    if (trigger.kind === "tour_completed") return true;
    return trigger.totalTransactions >= TRANSACTION_THRESHOLD;
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
    if (Platform.OS === "web") return;

    if (!isEligibleByTrigger(trigger)) return;

    const state = await getState();
    if (!isEligibleByThrottle(state)) return;

    const StoreReview = loadStoreReviewModule();
    if (!StoreReview) return;

    try {
        const isAvailable = await StoreReview.isAvailableAsync?.();
        if (!isAvailable) return;

        const hasAction = await StoreReview.hasAction?.();
        if (hasAction === false) return;

        await StoreReview.requestReview();

        await saveState({
            requestedAt: new Date().toISOString(),
            attempts: state.attempts + 1,
        });
    } catch {
        // swallow — review prompt failures must never disrupt the user
    }
}

export async function resetReviewState(): Promise<void> {
    try {
        await AsyncStorage.removeItem(REVIEW_STATE_KEY);
    } catch {
        // swallow
    }
}
