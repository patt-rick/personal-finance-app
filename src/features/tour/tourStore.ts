import { isRegistered, subscribeTargets } from "./targetRegistry";
import { currentView, nextIndex, shouldAdvance } from "./tourMachine";
import { Completed, journeyDisposition, loadCompleted, saveCompleted } from "./tourStorage";
import { TOURS } from "./tours";
import { ActiveTour, TabName, TourContext, TourId, TourView } from "./types";

type TourOutcome = "finished" | "skipped";
type EndListener = (id: TourId, outcome: TourOutcome) => void;

const START_ORDER: TourId[] = ["journey", "budget-v2", "settings"];
const INITIAL_CONTEXT: TourContext = { cashbookCount: 0, transactionCount: 0, activeTab: "Dashboard" };

let active: ActiveTour | null = null;
let ctx: TourContext = INITIAL_CONTEXT;
let countsKnown = false;
let completed: Completed | null = null;
let loading: Promise<void> | null = null;
let loadGeneration = 0;
let writes: Promise<void> = Promise.resolve();
let view: TourView | null = null;
let navigateToTab: ((tab: TabName) => void) | null = null;
let unsubscribeTargets: (() => void) | null = null;

const sheets = new Set<string>();
const pending = new Set<TourId>();
const listeners = new Set<() => void>();
const endListeners = new Set<EndListener>();

const sameView = (a: TourView | null, b: TourView | null) =>
    a === b ||
    (!!a &&
        !!b &&
        a.key === b.key &&
        a.kind === b.kind &&
        a.body === b.body &&
        a.isLast === b.isLast &&
        a.counter?.index === b.counter?.index &&
        a.counter?.total === b.counter?.total);

// The view reference only changes when its content does, so it is safe as a useSyncExternalStore snapshot.
function emit(): void {
    const next = active && sheets.size === 0 ? currentView(TOURS[active.tourId], active, ctx, isRegistered) : null;
    if (!sameView(view, next)) view = next;
    listeners.forEach((listener) => listener());
}

function persist(): void {
    const snapshot = completed;
    if (!snapshot) return;
    writes = writes.then(() => saveCompleted(snapshot)).catch(() => {});
}

function markCompleted(id: TourId): void {
    completed = { ...(completed ?? {}), [id]: true };
    persist();
}

function start(id: TourId): void {
    const steps = TOURS[id];
    const stepIndex = nextIndex(steps, -1, isRegistered);
    if (stepIndex === -1) return;
    active = { tourId: id, stepIndex, atStepStart: ctx, shown: 0 };
}

function startPending(): void {
    if (active || sheets.size > 0 || !completed || !countsKnown) return;
    for (const id of START_ORDER) {
        if (!pending.has(id)) continue;
        pending.delete(id);
        if (id === "journey") {
            const disposition = journeyDisposition(completed, ctx.cashbookCount);
            if (disposition === "existing-user") markCompleted(id);
            if (disposition !== "start") continue;
        } else if (completed[id]) {
            continue;
        }
        start(id);
        if (active) return;
    }
}

function end(outcome: TourOutcome): void {
    if (!active) return;
    const id = active.tourId;
    active = null;
    markCompleted(id);
    endListeners.forEach((listener) => listener(id, outcome));
    startPending();
}

function goToNext(): void {
    if (!active) return;
    const stepIndex = nextIndex(TOURS[active.tourId], active.stepIndex, isRegistered);
    if (stepIndex === -1) end("finished");
    else active = { ...active, stepIndex, atStepStart: ctx, shown: active.shown + 1 };
}

function ensureLoaded(): void {
    if (completed || loading) return;
    const generation = ++loadGeneration;
    loading = loadCompleted().then((loaded) => {
        if (generation !== loadGeneration) return;
        loading = null;
        completed = loaded;
        startPending();
        emit();
    });
}

export function subscribeTour(listener: () => void): () => void {
    listeners.add(listener);
    // Targets mounting or unmounting can change which step is last, so the view is rebuilt when they do.
    if (!unsubscribeTargets) {
        unsubscribeTargets = subscribeTargets(() => {
            if (active) emit();
        });
    }
    return () => {
        listeners.delete(listener);
    };
}

export function getTourView(): TourView | null {
    return view;
}

export function setTourContext(patch: Partial<TourContext>): void {
    ctx = { ...ctx, ...patch };
    if (patch.cashbookCount !== undefined) countsKnown = true;
    // Not gated on an open sheet: a save lands while its sheet is still closing.
    if (active && shouldAdvance(TOURS[active.tourId][active.stepIndex], ctx, active.atStepStart)) goToNext();
    startPending();
    emit();
}

export function setSheetOpen(key: string, open: boolean): void {
    if (open === sheets.has(key)) return;
    if (open) sheets.add(key);
    else sheets.delete(key);
    startPending();
    emit();
}

export function requestTour(id: TourId): void {
    pending.add(id);
    ensureLoaded();
    startPending();
    emit();
}

export function withdrawTour(id: TourId): void {
    pending.delete(id);
}

export function nextStep(): void {
    if (!active || !view) return;
    if (view.redirectTo) {
        navigateToTab?.(view.redirectTo);
        return;
    }
    goToNext();
    emit();
}

export function skipTour(): void {
    if (!active) return;
    end("skipped");
    emit();
}

/** Forgets every completed tour and starts the journey, in one step so no pending tip tour can start in between. */
export function replayTours(): void {
    if (active) return;
    loadGeneration++;
    loading = null;
    completed = {};
    pending.clear();
    persist();
    start("journey");
    emit();
}

export function setTourNavigator(navigate: ((tab: TabName) => void) | null): void {
    navigateToTab = navigate;
}

export function onTourEnd(listener: EndListener): () => void {
    endListeners.add(listener);
    return () => {
        endListeners.delete(listener);
    };
}

export async function whenTourStoreSettled(): Promise<void> {
    await loading;
    await writes;
}

export function resetTourStoreForTest(): void {
    active = null;
    ctx = INITIAL_CONTEXT;
    countsKnown = false;
    completed = null;
    loading = null;
    loadGeneration++;
    writes = Promise.resolve();
    view = null;
    navigateToTab = null;
    unsubscribeTargets = null;
    sheets.clear();
    pending.clear();
    listeners.clear();
    endListeners.clear();
}
