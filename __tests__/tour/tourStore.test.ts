jest.mock("@react-native-async-storage/async-storage", () => {
    let store: Record<string, string> = {};
    return {
        __esModule: true,
        default: {
            getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
            setItem: jest.fn(async (k: string, v: string) => {
                store[k] = v;
            }),
            __reset: () => {
                store = {};
            },
        },
    };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTarget, registerTarget, resetTargetsForTest } from "../../src/features/tour/targetRegistry";
import { journeyDisposition, loadCompleted } from "../../src/features/tour/tourStorage";
import {
    getTourView,
    nextStep,
    onTourEnd,
    replayTours,
    requestTour,
    resetTourStoreForTest,
    setSheetOpen,
    setTourContext,
    setTourNavigator,
    skipTour,
    whenTourStoreSettled,
    withdrawTour,
} from "../../src/features/tour/tourStore";
import { TargetId } from "../../src/features/tour/types";

const KEY = "@tour_completed";
const mount = (...ids: TargetId[]) => ids.forEach((id) => registerTarget(id, { ref: { current: {} } }));
const newInstall = () => setTourContext({ cashbookCount: 0, transactionCount: 0, activeTab: "Dashboard" });
const stored = async () => JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}");

beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    resetTourStoreForTest();
    resetTargetsForTest();
    mount("tab-home", "tab-books", "tab-add", "cashbooks-new", "home-balance", "home-cashbook-row");
});

describe("storage", () => {
    it("treats the legacy dashboard flag and existing cashbooks as an existing user", () => {
        expect(journeyDisposition({ journey: true }, 0)).toBe("completed");
        expect(journeyDisposition({ dashboard: true }, 0)).toBe("completed");
        expect(journeyDisposition({}, 2)).toBe("existing-user");
        expect(journeyDisposition({ cashbooks: true, budget: true }, 0)).toBe("start");
    });

    it("reads corrupt or non-object data as nothing completed", async () => {
        await AsyncStorage.setItem(KEY, "{not json");
        expect(await loadCompleted()).toEqual({});
        await AsyncStorage.setItem(KEY, "[1]");
        expect(await loadCompleted()).toEqual({});
    });
});

describe("auto-start", () => {
    it("starts the journey for a new install when the request arrives after the context", async () => {
        newInstall();
        requestTour("journey");
        expect(getTourView()).toBeNull();
        await whenTourStoreSettled();
        expect(getTourView()).toMatchObject({ title: "Welcome", counter: { index: 1, total: 5 } });
    });

    it("waits for real counts before deciding", async () => {
        requestTour("journey");
        await whenTourStoreSettled();
        expect(getTourView()).toBeNull();
        newInstall();
        expect(getTourView()?.title).toBe("Welcome");
    });

    it("holds a request while a sheet is open and starts when it closes", async () => {
        newInstall();
        setSheetOpen("quickAdd", true);
        requestTour("journey");
        await whenTourStoreSettled();
        expect(getTourView()).toBeNull();
        setSheetOpen("quickAdd", false);
        expect(getTourView()?.title).toBe("Welcome");
    });

    it("does not start a withdrawn request", async () => {
        requestTour("journey");
        await whenTourStoreSettled();
        withdrawTour("journey");
        newInstall();
        expect(getTourView()).toBeNull();
    });

    it("marks an existing user's journey done without showing it", async () => {
        setTourContext({ cashbookCount: 3, transactionCount: 40 });
        requestTour("journey");
        await whenTourStoreSettled();
        expect(getTourView()).toBeNull();
        expect(await stored()).toEqual({ journey: true });
    });

    it("does not repeat a tip tour that was already seen", async () => {
        await AsyncStorage.setItem(KEY, JSON.stringify({ settings: true, dashboard: true }));
        mount("settings-profile");
        setTourContext({ cashbookCount: 1, activeTab: "Settings" });
        requestTour("settings");
        await whenTourStoreSettled();
        expect(getTourView()).toBeNull();
    });
});

describe("running the journey", () => {
    const begin = async () => {
        newInstall();
        requestTour("journey");
        await whenTourStoreSettled();
    };

    it("walks a new user through creating a cashbook and a transaction to the end", async () => {
        const ended = jest.fn();
        onTourEnd(ended);
        await begin();

        nextStep();
        expect(getTourView()).toMatchObject({ redirectTo: "Cashbooks", target: "tab-books" });

        setTourContext({ activeTab: "Cashbooks" });
        expect(getTourView()).toMatchObject({ target: "cashbooks-new", kind: "action" });

        setSheetOpen("createCashbook", true);
        expect(getTourView()).toBeNull();
        setTourContext({ cashbookCount: 1 });
        setSheetOpen("createCashbook", false);
        expect(getTourView()).toMatchObject({ target: "tab-add", kind: "action" });

        setTourContext({ transactionCount: 1 });
        expect(getTourView()).toMatchObject({ redirectTo: "Dashboard", target: "tab-home" });

        setTourContext({ activeTab: "Dashboard" });
        expect(getTourView()).toMatchObject({ target: "home-balance", isLast: false });
        nextStep();
        expect(getTourView()).toMatchObject({ target: "home-cashbook-row", isLast: true });
        nextStep();

        expect(getTourView()).toBeNull();
        expect(ended).toHaveBeenCalledWith("journey", "finished");
        await whenTourStoreSettled();
        expect(await stored()).toEqual({ journey: true });
    });

    it("returns to the same step when a sheet closes without saving", async () => {
        await begin();
        nextStep();
        setTourContext({ activeTab: "Cashbooks" });
        setSheetOpen("createCashbook", true);
        setSheetOpen("createCashbook", false);
        expect(getTourView()).toMatchObject({ target: "cashbooks-new", kind: "action" });
    });

    it("navigates on Next from a tab redirect without skipping the step behind it", async () => {
        const navigate = jest.fn();
        setTourNavigator(navigate);
        await begin();
        nextStep();
        nextStep();
        expect(navigate).toHaveBeenCalledWith("Cashbooks");
        expect(getTourView()).toMatchObject({ redirectTo: "Cashbooks" });
    });

    it("records a skip as completed", async () => {
        const ended = jest.fn();
        onTourEnd(ended);
        await begin();
        skipTour();
        expect(getTourView()).toBeNull();
        expect(ended).toHaveBeenCalledWith("journey", "skipped");
        await whenTourStoreSettled();
        expect(await stored()).toEqual({ journey: true });
    });
});

describe("replay", () => {
    it("clears old flags and starts the journey for an existing user, ahead of a pending tip tour", async () => {
        await AsyncStorage.setItem(KEY, JSON.stringify({ dashboard: true, settings: true, "budget-v2": true }));
        mount("settings-profile");
        setTourContext({ cashbookCount: 2, transactionCount: 9, activeTab: "Settings" });
        requestTour("settings");
        await whenTourStoreSettled();

        replayTours();
        expect(getTourView()?.title).toBe("Welcome");
        await whenTourStoreSettled();
        expect(await stored()).toEqual({});

        nextStep();
        setTourContext({ activeTab: "Cashbooks" });
        expect(getTourView()).toMatchObject({ target: "cashbooks-new", kind: "info" });
    });

    it("does nothing while a tour is already running", async () => {
        newInstall();
        requestTour("journey");
        await whenTourStoreSettled();
        nextStep();
        replayTours();
        expect(getTourView()).toMatchObject({ redirectTo: "Cashbooks" });
    });
});

describe("target registry", () => {
    it("ignores a target whose element is not mounted", () => {
        registerTarget("home-autolog", { ref: { current: null } });
        expect(getTarget("home-autolog")).toBeNull();
    });

    it("keeps a newer registration when an older one unregisters", () => {
        const first = registerTarget("budget-gauge", { ref: { current: {} } });
        const entry = { ref: { current: {} } };
        registerTarget("budget-gauge", entry);
        first();
        expect(getTarget("budget-gauge")).toBe(entry);
    });
});
