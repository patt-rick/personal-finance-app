import { ActiveTour, TabName, TargetId, TourContext, TourStep, TourView } from "./types";

type IsRegistered = (id: TargetId) => boolean;

export const TAB_TARGETS: Record<TabName, TargetId> = {
    Dashboard: "tab-home",
    Cashbooks: "tab-books",
    Budget: "tab-budget",
    Settings: "tab-settings",
};

const TAB_LABELS: Record<TabName, string> = {
    Dashboard: "Home",
    Cashbooks: "Books",
    Budget: "Budget",
    Settings: "Settings",
};

const isDropped = (step: TourStep, isRegistered: IsRegistered) =>
    !!step.optional && !!step.target && !isRegistered(step.target);

const isSatisfied = (step: TourStep, atStepStart: TourContext) =>
    step.kind === "action" && !!step.satisfiedWhen?.(atStepStart);

/** Index of the next step to show after `from`, or -1 when the tour is over. */
export function nextIndex(steps: TourStep[], from: number, isRegistered: IsRegistered): number {
    for (let i = from + 1; i < steps.length; i++) {
        if (!isDropped(steps[i], isRegistered)) return i;
    }
    return -1;
}

export function shouldAdvance(step: TourStep, ctx: TourContext, atStepStart: TourContext): boolean {
    return step.kind === "action" && !isSatisfied(step, atStepStart) && !!step.doneWhen?.(ctx, atStepStart);
}

export function currentView(
    steps: TourStep[],
    active: ActiveTour,
    ctx: TourContext,
    isRegistered: IsRegistered,
): TourView {
    const step = steps[active.stepIndex];

    if (step.tab && ctx.activeTab !== step.tab) {
        const label = TAB_LABELS[step.tab];
        return {
            key: `${active.tourId}:${step.id}>tab`,
            target: TAB_TARGETS[step.tab],
            shape: "pill",
            title: `Open ${label}`,
            body: `Tap ${label} in the bar below to continue.`,
            kind: "action",
            counter: null,
            isLast: false,
            redirectTo: step.tab,
        };
    }

    const satisfied = isSatisfied(step, active.atStepStart);
    // Optional steps can appear mid-tour (the first cashbook row exists only once a cashbook does), so the total is worked out
    // from what is on screen now rather than fixed when the tour starts.
    const remaining = steps.slice(active.stepIndex + 1).filter((s) => !isDropped(s, isRegistered)).length;
    return {
        key: `${active.tourId}:${step.id}`,
        target: step.target,
        shape: step.shape ?? "rect",
        title: satisfied ? step.infoTitle ?? step.title : step.title,
        body: satisfied ? step.infoBody ?? step.body : step.body,
        kind: satisfied ? "info" : step.kind,
        counter: { index: active.shown + 1, total: active.shown + 1 + remaining },
        isLast: remaining === 0,
        redirectTo: null,
    };
}
