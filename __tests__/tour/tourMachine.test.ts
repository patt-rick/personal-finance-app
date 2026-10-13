import { currentView, nextIndex, shouldAdvance } from "../../src/features/tour/tourMachine";
import { TOURS } from "../../src/features/tour/tours";
import { ActiveTour, TargetId, TourContext, TourStep } from "../../src/features/tour/types";

const ctx = (over: Partial<TourContext> = {}): TourContext => ({
    cashbookCount: 0,
    transactionCount: 0,
    activeTab: "Dashboard",
    ...over,
});

const all = () => true;
const without = (...missing: TargetId[]) => (id: TargetId) => !missing.includes(id);

const steps: TourStep[] = [
    { id: "a", tab: null, target: null, kind: "info", title: "A", body: "a" },
    {
        id: "b",
        tab: "Cashbooks",
        target: "cashbooks-new",
        kind: "action",
        title: "B",
        body: "do it",
        infoBody: "already done",
        satisfiedWhen: (start) => start.cashbookCount > 0,
        doneWhen: (now, start) => now.cashbookCount > start.cashbookCount,
    },
    { id: "c", tab: "Dashboard", target: "home-autolog", kind: "info", title: "C", body: "c", optional: true },
    { id: "d", tab: "Dashboard", target: "home-balance", kind: "info", title: "D", body: "d" },
    { id: "e", tab: "Dashboard", target: "home-cashbook-row", kind: "info", title: "E", body: "e", optional: true },
];

const at = (stepIndex: number, start = ctx(), shown = stepIndex): ActiveTour => ({
    tourId: "journey",
    stepIndex,
    atStepStart: start,
    shown,
});

describe("currentView", () => {
    it("asks for a tab switch when the step lives on another tab", () => {
        const view = currentView(steps, at(1), ctx({ activeTab: "Dashboard" }), all);
        expect(view).toMatchObject({
            target: "tab-books",
            kind: "action",
            counter: null,
            isLast: false,
            redirectTo: "Cashbooks",
        });
    });

    it("shows the step itself once on its tab, with a different key from the redirect", () => {
        const redirect = currentView(steps, at(1), ctx(), all);
        const view = currentView(steps, at(1), ctx({ activeTab: "Cashbooks" }), all);
        expect(view).toMatchObject({ target: "cashbooks-new", kind: "action", body: "do it", redirectTo: null });
        expect(view.counter).toEqual({ index: 2, total: 5 });
        expect(view.key).not.toBe(redirect.key);
    });

    it("never redirects a step that has no tab", () => {
        expect(currentView(steps, at(0), ctx({ activeTab: "Settings" }), all).redirectTo).toBeNull();
    });

    it("shows an action step as info when its goal was already met at step start", () => {
        const start = ctx({ activeTab: "Cashbooks", cashbookCount: 2 });
        expect(currentView(steps, at(1, start), start, all)).toMatchObject({ kind: "info", body: "already done" });
    });

    it("marks the step before a missing trailing optional step as last", () => {
        const onHome = ctx();
        expect(currentView(steps, at(3), onHome, all).isLast).toBe(false);
        expect(currentView(steps, at(3), onHome, without("home-cashbook-row")).isLast).toBe(true);
    });

    it("counts only the steps that will be shown, and grows the total when an optional target appears", () => {
        const noRow = without("home-autolog", "home-cashbook-row");
        expect(currentView(steps, at(0), ctx(), noRow).counter).toEqual({ index: 1, total: 3 });
        expect(currentView(steps, at(3, ctx(), 2), ctx(), noRow)).toMatchObject({
            counter: { index: 3, total: 3 },
            isLast: true,
        });
        expect(currentView(steps, at(3, ctx(), 2), ctx(), without("home-autolog"))).toMatchObject({
            counter: { index: 3, total: 4 },
            isLast: false,
        });
    });
});

describe("nextIndex", () => {
    it("skips optional steps whose target is not on screen", () => {
        expect(nextIndex(steps, 1, all)).toBe(2);
        expect(nextIndex(steps, 1, without("home-autolog"))).toBe(3);
        expect(nextIndex(steps, 3, without("home-cashbook-row"))).toBe(-1);
    });

    it("never skips a required step, even with its target missing", () => {
        expect(nextIndex(steps, 2, without("home-balance"))).toBe(3);
    });
});

describe("shouldAdvance", () => {
    it("advances an action step when its condition is met against the step-start snapshot", () => {
        expect(shouldAdvance(steps[1], ctx({ cashbookCount: 1 }), ctx())).toBe(true);
        expect(shouldAdvance(steps[1], ctx(), ctx())).toBe(false);
    });

    it("never advances info steps or satisfied action steps on their own", () => {
        expect(shouldAdvance(steps[0], ctx({ cashbookCount: 5 }), ctx())).toBe(false);
        expect(shouldAdvance(steps[1], ctx({ cashbookCount: 3 }), ctx({ cashbookCount: 2 }))).toBe(false);
    });
});

describe("journey definition", () => {
    const journey = TOURS.journey;
    const step = (id: string) => journey.find((s) => s.id === id)!;

    it("runs in the documented order", () => {
        expect(journey.map((s) => s.id)).toEqual([
            "welcome",
            "create-cashbook",
            "add-transaction",
            "balance",
            "autolog",
            "cashbook-row",
        ]);
    });

    it("waits for a first transaction only when there is a cashbook to add it to", () => {
        const add = step("add-transaction");
        expect(shouldAdvance(add, ctx({ cashbookCount: 1, transactionCount: 1 }), ctx({ cashbookCount: 1 }))).toBe(true);
        expect(add.satisfiedWhen?.(ctx({ cashbookCount: 1, transactionCount: 4 }))).toBe(true);
        expect(add.satisfiedWhen?.(ctx({ cashbookCount: 0 }))).toBe(true);
        expect(add.satisfiedWhen?.(ctx({ cashbookCount: 1 }))).toBe(false);
    });
});
