import { TourId, TourStep } from "./types";

const journey: TourStep[] = [
    {
        id: "welcome",
        tab: null,
        target: null,
        kind: "info",
        title: "Welcome",
        body: "Take a one-minute tour of the basics.",
    },
    {
        id: "create-cashbook",
        tab: "Cashbooks",
        target: "cashbooks-new",
        shape: "pill",
        kind: "action",
        title: "Create your first cashbook",
        body: "Each cashbook tracks one business or account. Tap + and give yours a name.",
        infoTitle: "Add a cashbook",
        infoBody: "Each cashbook tracks one business or account. Tap + here to add another.",
        satisfiedWhen: (start) => start.cashbookCount > 0,
        doneWhen: (ctx, start) => ctx.cashbookCount > start.cashbookCount,
    },
    {
        id: "add-transaction",
        tab: null,
        target: "tab-add",
        shape: "pill",
        kind: "action",
        title: "Add a transaction",
        body: "Tap + to log money in or out from anywhere in the app.",
        infoBody: "Tap + any time to log money in or out.",
        // Without a cashbook the + sheet has nothing to add to, so the step must not wait on it.
        satisfiedWhen: (start) => start.transactionCount > 0 || start.cashbookCount === 0,
        doneWhen: (ctx, start) => ctx.transactionCount > start.transactionCount,
    },
    {
        id: "balance",
        tab: "Dashboard",
        target: "home-balance",
        kind: "info",
        title: "Your balance",
        body: "Income, expenses and what is left, for each currency you use.",
    },
    {
        id: "autolog",
        tab: "Dashboard",
        target: "home-autolog",
        kind: "info",
        optional: true,
        title: "Automatic logging",
        body: "The app can read bank and MoMo SMS on this phone and log them for you.",
    },
    {
        id: "cashbook-row",
        tab: "Dashboard",
        target: "home-cashbook-row",
        kind: "info",
        optional: true,
        title: "Your cashbooks",
        body: "Tap a cashbook to see and edit its transactions.",
    },
];

const budget: TourStep[] = [
    {
        id: "gauge",
        tab: "Budget",
        target: "budget-gauge",
        kind: "info",
        title: "Your budget at a glance",
        body: "The speedometer shows how much of your limit is gone. The small tick marks where even spending would put you today.",
    },
    {
        id: "scope",
        tab: "Budget",
        target: "budget-scope",
        kind: "info",
        optional: true,
        title: "One cashbook or all of them",
        body: "Budget a single cashbook, or all of them together.",
    },
    {
        id: "history",
        tab: "Budget",
        target: "budget-history",
        kind: "info",
        title: "Look back",
        body: "Use the arrows, or tap a bar in the history chart, to see how earlier periods went.",
    },
];

const settings: TourStep[] = [
    {
        id: "profile",
        tab: "Settings",
        target: "settings-profile",
        kind: "info",
        title: "Your profile",
        body: "Set your name and email here. Tap the pencil to edit them.",
    },
    {
        id: "general",
        tab: "Settings",
        target: "settings-general",
        kind: "info",
        title: "Categories and security",
        body: "Customise your income and expense categories, and protect your data with a PIN or biometrics.",
    },
    {
        id: "features",
        tab: "Settings",
        target: "settings-features",
        kind: "info",
        title: "More tools",
        body: "Reports, recurring transactions that log themselves, debts, and automatic logging.",
    },
    {
        id: "data",
        tab: "Settings",
        target: "settings-data",
        kind: "info",
        title: "Backup and restore",
        body: "Export everything to a backup file, or import one to restore your data.",
    },
];

export const TOURS: Record<TourId, TourStep[]> = {
    journey,
    "budget-v2": budget,
    settings,
};
