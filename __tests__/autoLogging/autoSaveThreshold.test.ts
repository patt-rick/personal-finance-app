jest.mock("@react-native-async-storage/async-storage", () => {
    const store: Record<string, string> = {};
    return {
        __esModule: true,
        default: {
            getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
            setItem: jest.fn(async (k: string, v: string) => {
                store[k] = v;
            }),
        },
    };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../src/utils/storageKeys";
import {
    AUTO_SAVE_THRESHOLD_MAX,
    AUTO_SAVE_THRESHOLD_MIN,
    loadAutoLogSettings,
    stepAutoSaveThreshold,
} from "../../src/features/autoLogging/services/persistence/settings";

describe("loadAutoLogSettings threshold validation", () => {
    it("falls back to the default when a restored backup stored a non-number threshold", async () => {
        await AsyncStorage.setItem(
            STORAGE_KEYS.AUTO_LOG_SETTINGS,
            JSON.stringify({ minConfidenceForAutoSave: null, askBeforeSaving: true }),
        );
        const settings = await loadAutoLogSettings();
        expect(settings.minConfidenceForAutoSave).toBe(0.75);
        expect(settings.askBeforeSaving).toBe(true);
    });
});

describe("stepAutoSaveThreshold", () => {
    it("moves in 5% steps without floating-point drift", () => {
        expect(stepAutoSaveThreshold(0.75, 1)).toBe(0.8);
        expect(stepAutoSaveThreshold(0.8, -1)).toBe(0.75);
        expect(stepAutoSaveThreshold(0.7, 1)).toBe(0.75);
    });

    it("stops at the floor so keyword-only guesses (max 50%) always need review", () => {
        expect(AUTO_SAVE_THRESHOLD_MIN).toBeGreaterThan(0.5);
        expect(stepAutoSaveThreshold(AUTO_SAVE_THRESHOLD_MIN, -1)).toBe(AUTO_SAVE_THRESHOLD_MIN);
    });

    it("stops at the ceiling", () => {
        expect(stepAutoSaveThreshold(AUTO_SAVE_THRESHOLD_MAX, 1)).toBe(AUTO_SAVE_THRESHOLD_MAX);
    });

    it("snaps an off-grid or out-of-range stored value back onto the grid", () => {
        expect(stepAutoSaveThreshold(0.73, 1)).toBe(0.75);
        expect(stepAutoSaveThreshold(0.2, 1)).toBe(AUTO_SAVE_THRESHOLD_MIN);
        expect(stepAutoSaveThreshold(Number.NaN, 1)).toBe(0.8);
    });
});
