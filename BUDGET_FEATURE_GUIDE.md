# Budgets

## What a budget is

A budget has a **scope**, a **period** and **limits**.

- **Scope:** either one cashbook, or every cashbook in a currency (a *global* budget, which also covers books created later; books with no currency count as USD). There is at most one budget per cashbook and one per currency.
- **Period:** weekly (Monday to Sunday), monthly (from the 1st) or yearly (from 1 January), in device local time.
- **Limits:** a required total plus optional per-category limits that may not add up to more than the total.

The total counts **every expense** in scope, gross (amount plus fee). Category limits count the net amount. Fees appear as their own "Fees & Taxes" row, and spend in categories without a limit appears as "Everything else", so the rows always add up to the total. Transfers between books in the same scope are not spending; their fees are. This matches Reports.

## History

Each saved change is stored against the period it was made in, so past periods are judged against the limit that applied then. Editing twice in one period keeps the last edit. Changing the period type starts a fresh history. Periods from before the budget existed show spending only.

## Pace and forecast

These assume even spending:

- **Pace:** % of the limit used compared with % of the period gone (today counts as gone). More than 2 points ahead reads "Ahead of pace"; past the limit reads "Over by …".
- **Forecast:** spent ÷ days gone × days in the period. It is hidden for the first 3 days of a week or month and the first month of a year.
- **Per day:** what's left ÷ days left (today included).

## Colours

The colour scale is green up to 20 points before the warn threshold, gold at the threshold, and red at 100% and beyond. The same scale (`features/budget/colour.ts`) drives the speedometer, the category bars, the history bars and the Android widget.

## Alerts

- **What fires:** each budget has an on/off switch and a warn threshold (70, 80 or 90%). The 100% alert always fires. An alert fires only when a save carries spend **across** a threshold, for the total or a category, and only once per period. Deleting, reducing or restoring data never fires one.
- **How it's shown:** in the app as a dialog, held back until the app has loaded and is unlocked; as a local notification (channel `budget-alerts`, private on the lock screen) when the app is in the background but still running.
- **Background limit:** auto-logged messages are only processed while the app's JS is running. There is no background task, so a background push needs the app to still be alive. Otherwise the alert shows the next time the app opens.
- **Which saves trigger alerts:** callers opt in by passing `prev` to `saveTransactions`. Bulk rewrites such as restore, category rename and moving a cashbook's transactions don't pass it.

## Code map

| Concern | Where |
|---|---|
| Periods, scope, spend, limits, pace, colour, history | `src/features/budget/*.ts` |
| Storage and migration from the old per-cashbook shape | `src/features/budget/storage/budgetStore.ts`, `migrate.ts` |
| Alerts | `src/features/budget/alerts/` |
| Dashboard state | `src/features/budget/hooks/useBudgetDashboard.ts` |
| UI pieces | `src/features/budget/components/` |
| Screens | `src/screens/BudgetDashboardScreen.tsx`, `src/screens/BudgetSetupScreen.tsx` |
| Widget | `src/features/widgets/services/widgetData.ts` (`buildBudgetView`) |
| Tests | `__tests__/budget/`, `__tests__/widgets/widgetData.test.ts`, `__tests__/utils/categoryRename.test.ts` |

Renaming a category also renames it on existing transactions, recurring templates and pending review items (`utils/categoryRename.ts`). Deleting a category removes its limits; deleting a cashbook removes its cashbook budget.
