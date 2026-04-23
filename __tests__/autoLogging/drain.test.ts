jest.mock("../../src/utils/storage", () => ({
    loadCategories: jest.fn(async () => []),
    loadBusinesses: jest.fn(async () => []),
    loadTransactions: jest.fn(async () => []),
    saveBusinesses: jest.fn(async () => true),
    saveTransactions: jest.fn(async () => true),
}));

jest.mock("../../src/features/autoLogging/services/ingestion/nativeBridge", () => ({
    autoLogNative: {
        drainQueue: jest.fn(async () => []),
        clearQueue: jest.fn(async () => {}),
        subscribe: jest.fn(() => ({ remove: () => {} })),
        isAvailable: jest.fn(() => false),
    },
}));

import { Category } from "../../src/types";
import { AutoLogSettings, ParsedDraft, RawEvent } from "../../src/features/autoLogging/types";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";
import { drainNativeQueue, DrainDeps } from "../../src/features/autoLogging/services/ingestion/drainNativeQueue";
import { Plan } from "../../src/features/autoLogging/services/ingestion/saveDraft";
import { _resetLocksForTests, withLock } from "../../src/features/autoLogging/services/ingestion/mutex";

function makeEvent(overrides: Partial<RawEvent> = {}): RawEvent {
    return {
        id: "evt-1",
        source: "sms",
        sender: "MTN",
        body: "Debit Alert: GHS 10.00 at Melcom",
        timestamp: Date.now(),
        rawHash: "hash-1",
        ...overrides,
    };
}

function makeDraft(overrides: Partial<ParsedDraft> = {}): ParsedDraft {
    return {
        amount: 10,
        currencyCode: "GHS",
        merchant: "Melcom",
        type: "expense",
        category: "Other Expense",
        description: "Melcom",
        occurredAt: new Date().toISOString(),
        confidence: 0.85,
        source: "sms",
        senderKey: "mtn",
        senderDisplay: "MTN",
        rawText: "Debit Alert: GHS 10.00 at Melcom",
        ...overrides,
    };
}

function makePlan(outcome: Plan["outcome"] = "save"): Plan {
    return { outcome } as Plan;
}

const categories: Category[] = [];
const enabledSettings: AutoLogSettings = { ...DEFAULT_AUTO_LOG_SETTINGS, enabled: true };

function makeDeps(overrides: Partial<DrainDeps> = {}): {
    deps: DrainDeps;
    calls: string[];
    drainMock: jest.Mock;
    clearMock: jest.Mock;
    filterMock: jest.Mock;
    parseMock: jest.Mock;
    saveMock: jest.Mock;
} {
    const calls: string[] = [];
    const drainMock = jest.fn(async () => {
        calls.push("drain");
        return [makeEvent()];
    });
    const clearMock = jest.fn(async (ids: string[]) => {
        calls.push(`clear:${ids.join(",")}`);
    });
    const filterMock = jest.fn((event: RawEvent) => {
        calls.push(`filter:${event.id}`);
        return true;
    });
    const parseMock = jest.fn((event: RawEvent) => {
        calls.push(`parse:${event.id}`);
        return makeDraft();
    });
    const saveMock = jest.fn(async () => {
        calls.push("save");
        return makePlan("save");
    });
    const deps: DrainDeps = {
        drainQueue: drainMock,
        clearQueue: clearMock,
        applyFilter: filterMock,
        runParse: parseMock,
        runSave: saveMock,
        loadCategories: async () => categories,
        loadSettings: async () => enabledSettings,
        ...overrides,
    };
    return { deps, calls, drainMock, clearMock, filterMock, parseMock, saveMock };
}

describe("drainNativeQueue — happy path", () => {
    it("drains → filters → parses → saves → clears in order", async () => {
        const { deps, calls, clearMock, saveMock } = makeDeps();
        const result = await drainNativeQueue(deps);
        expect(result).toEqual({ drained: 1, saved: 1, queued: 0, filtered: 0, dropped: 0 });
        expect(calls).toEqual(["drain", "filter:evt-1", "parse:evt-1", "save", "clear:evt-1"]);
        expect(saveMock).toHaveBeenCalledTimes(1);
        expect(clearMock).toHaveBeenCalledWith(["evt-1"]);
    });

    it("counts a low-confidence save-to-review correctly", async () => {
        const { deps } = makeDeps({
            runSave: async () => makePlan("review"),
        });
        const result = await drainNativeQueue(deps);
        expect(result.saved).toBe(0);
        expect(result.queued).toBe(1);
    });

    it("returns early when the native queue is empty", async () => {
        const { deps, clearMock, saveMock } = makeDeps({
            drainQueue: async () => [],
        });
        const result = await drainNativeQueue(deps);
        expect(result).toEqual({ drained: 0, saved: 0, queued: 0, filtered: 0, dropped: 0 });
        expect(saveMock).not.toHaveBeenCalled();
        expect(clearMock).not.toHaveBeenCalled();
    });
});

describe("drainNativeQueue — filtering", () => {
    it("clears but does not save filtered events", async () => {
        const events = [
            makeEvent({ id: "a" }),
            makeEvent({ id: "b" }),
        ];
        const { deps, saveMock, clearMock } = makeDeps({
            drainQueue: async () => events,
            applyFilter: (ev) => ev.id === "a",
        });
        const result = await drainNativeQueue(deps);
        expect(result.filtered).toBe(1);
        expect(result.saved).toBe(1);
        expect(saveMock).toHaveBeenCalledTimes(1);
        expect(clearMock).toHaveBeenCalledWith(["a", "b"]);
    });

    it("counts events that parse to null as dropped", async () => {
        const { deps, clearMock, saveMock } = makeDeps({
            drainQueue: async () => [makeEvent({ id: "drop-me" })],
            runParse: () => null,
        });
        const result = await drainNativeQueue(deps);
        expect(result.dropped).toBe(1);
        expect(saveMock).not.toHaveBeenCalled();
        expect(clearMock).toHaveBeenCalledWith(["drop-me"]);
    });

    it("counts save rejections as dropped but still clears", async () => {
        const { deps, clearMock } = makeDeps({
            runSave: async () => {
                throw new Error("boom");
            },
        });
        const result = await drainNativeQueue(deps);
        expect(result.dropped).toBe(1);
        expect(clearMock).toHaveBeenCalledWith(["evt-1"]);
    });
});

describe("drainNativeQueue — gating", () => {
    it("clears everything and skips parsing when settings.enabled is false", async () => {
        const events = [makeEvent({ id: "x" }), makeEvent({ id: "y" })];
        const { deps, saveMock, parseMock, clearMock } = makeDeps({
            drainQueue: async () => events,
            loadSettings: async () => ({ ...DEFAULT_AUTO_LOG_SETTINGS, enabled: false }),
        });
        const result = await drainNativeQueue(deps);
        expect(result).toEqual({ drained: 2, saved: 0, queued: 0, filtered: 0, dropped: 2 });
        expect(parseMock).not.toHaveBeenCalled();
        expect(saveMock).not.toHaveBeenCalled();
        expect(clearMock).toHaveBeenCalledWith(["x", "y"]);
    });
});

describe("withLock (mutex)", () => {
    beforeEach(() => _resetLocksForTests());

    it("serializes work under the same key", async () => {
        const log: string[] = [];
        const slow = withLock("autolog", async () => {
            log.push("slow-start");
            await new Promise((r) => setTimeout(r, 30));
            log.push("slow-end");
            return "slow";
        });
        const fast = withLock("autolog", async () => {
            log.push("fast-start");
            log.push("fast-end");
            return "fast";
        });
        const results = await Promise.all([slow, fast]);
        expect(results).toEqual(["slow", "fast"]);
        expect(log).toEqual(["slow-start", "slow-end", "fast-start", "fast-end"]);
    });

    it("runs different keys concurrently", async () => {
        const log: string[] = [];
        const a = withLock("a", async () => {
            log.push("a-start");
            await new Promise((r) => setTimeout(r, 20));
            log.push("a-end");
        });
        const b = withLock("b", async () => {
            log.push("b-start");
            log.push("b-end");
        });
        await Promise.all([a, b]);
        expect(log[0]).toBe("a-start");
        expect(log.indexOf("b-end")).toBeLessThan(log.indexOf("a-end"));
    });

    it("does not let one failure block later work on the same key", async () => {
        const err = withLock("autolog", async () => {
            throw new Error("first-failed");
        }).catch((e) => e.message);
        const ok = withLock("autolog", async () => "second-ok");
        expect(await err).toBe("first-failed");
        expect(await ok).toBe("second-ok");
    });
});
