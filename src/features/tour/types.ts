export type TourId = "journey" | "budget-v2" | "settings";

export type TabName = "Dashboard" | "Cashbooks" | "Budget" | "Settings";

export type TargetId =
    | "tab-home"
    | "tab-books"
    | "tab-budget"
    | "tab-settings"
    | "tab-add"
    | "cashbooks-new"
    | "home-balance"
    | "home-autolog"
    | "home-cashbook-row"
    | "budget-gauge"
    | "budget-scope"
    | "budget-history"
    | "settings-profile"
    | "settings-general"
    | "settings-features"
    | "settings-data";

export interface TourContext {
    cashbookCount: number;
    transactionCount: number;
    activeTab: TabName;
}

export interface TourStep {
    id: string;
    /** Tab the target lives on; null for the tab bar itself or a step with no target. */
    tab: TabName | null;
    target: TargetId | null;
    shape?: "rect" | "pill";
    title: string;
    body: string;
    kind: "info" | "action";
    doneWhen?: (ctx: TourContext, atStepStart: TourContext) => boolean;
    /** An action step whose goal is already met when it starts is shown as info. */
    satisfiedWhen?: (atStepStart: TourContext) => boolean;
    infoBody?: string;
    /** Dropped when its target is not on screen. */
    optional?: boolean;
}

export interface TourView {
    key: string;
    target: TargetId | null;
    shape: "rect" | "pill";
    title: string;
    body: string;
    kind: "info" | "action";
    counter: { index: number; total: number } | null;
    isLast: boolean;
    /** Set when the view only asks the user to switch tabs before the real step. */
    redirectTo: TabName | null;
}

export interface ActiveTour {
    tourId: TourId;
    stepIndex: number;
    atStepStart: TourContext;
    counted: string[];
}
