# Design: Budget revamp (speedometer, history, alerts, cashbook + global budgets)

**Date:** 2026-10-11
**Status:** Approved in brainstorming; Opus spec review folded in (2026-10-11)
**Mockups:** `.superpowers/brainstorm/79-1791748544/content/` (`gauge-style-v2.html`, `chip-style.html`, `full-screen-v3.html`, `setup.html`)

## Problem

The Budget tab is a static ring plus a category list for one budget per cashbook. It only
shows the current period, never animates beyond a row fade, and has real accuracy bugs:

- "Total spent" sums only categories that have a limit, so the remaining amount on the ring
  and the widget is overstated.
- The post-save warning (`checkBudgetWarning` in `BusinessDetailView`) runs against all
  cashbooks' transactions, and only for manual entries (not auto-log, recurring, transfer,
  quick-add or widget entries).
- Spend is matched by category **name**; renaming a category orphans its history.
- Setup shows the currency code ("GHS") as the symbol; money uses raw `toFixed`.
- No way to delete a budget; deleting a cashbook leaves its budget behind.
- Deleted categories still count toward "allocated".
- Ring and rows use different warning colours; `onRefresh` captures stale state.
- No tests for `budgetCalculations.ts`.

## Decisions

| Topic | Decision |
|---|---|
| New capabilities | Pace & forecast, period history, smarter alerts. **No rollover.** |
| Budget kinds | **Cashbook budget** (one cashbook) and **Global budget** (all cashbooks in one currency, including ones created later). Max one per cashbook and one per currency. Both: required total limit + optional category limits. |
| Creating | "New budget" sheet asks *One cashbook* vs *All {symbol} cashbooks*, then which one. Options already budgeted are disabled ("Already set · Edit"). Chip empty state "Set a budget" is a shortcut with the kind pre-selected. |
| Hero | Speedometer gauge (270° arc), card-less, on the page background |
| Gauge needle | % of limit **used** (not forecast) |
| Colour | Arc painted along its length green → gold → red; stops tied to the alert threshold |
| Pace / forecast | Linear (even-spending) assumption |
| Per-day figure | Always `remaining ÷ days left` |
| History | Past periods judged against the limit in force **at the time** |
| Alerts | In-app when foreground (queued while locked or loading), local push when the app is backgrounded but still running (there is no headless drain, see Alerts); fire on **crossing** only; per-budget toggle; warn at 70/80/90% (default 80) + always 100%; each fires once per period; simultaneous crossings combined into one message |
| Week start | **Monday** (was Sunday) |
| Category rename | Cascades to existing transactions and recurring templates |
| Storage | Stay on AsyncStorage (`@budgets`), migrate on load |

## Data model

```ts
// src/types.ts
type BudgetPeriod = "weekly" | "monthly" | "yearly";

type BudgetScope =
    | { kind: "cashbook"; businessId: string }
    | { kind: "currency"; currency: string }; // ISO code, e.g. "GHS"

interface BudgetLimits {
    periodStart: string;                       // ISO date (local) of the period this entry starts in
    totalLimit: number;
    categoryLimits: { [categoryId: string]: number };
}

interface Budget {
    id: string;
    scope: BudgetScope;
    period: BudgetPeriod;
    limits: BudgetLimits[];                    // sorted ascending by periodStart, never empty
    alerts: { enabled: boolean; warnAt: 70 | 80 | 90 };
    createdAt: string;
    updatedAt: string;
}
```

- **Saving a change** writes an entry keyed to the start of the *current* period. A second
  edit in the same period overwrites that entry. The change applies to the whole current period.
- **Limit for a period** = the latest entry with `periodStart <= period.start`. If none
  exists (period predates the budget), the period shows spend only — no limit, no colour verdict.
- **Changing period type** (e.g. monthly → weekly) resets `limits` to a single entry for the
  new current period. Past periods under the new type have no limit → spend only.
- **Migration** (`migrate.ts`, pure, idempotent):
  - Legacy `{ businessId, totalLimit, categoryBudgets }` becomes
    `scope: cashbook`, `limits: [{ periodStart: start of the period containing createdAt, totalLimit, categoryLimits }]`,
    `alerts: { enabled: true, warnAt: 80 }`.
  - Category limits ≤ 0 are dropped (legacy code skipped them).
  - Several legacy budgets for one `businessId` (possible after a restore) are deduped, keeping the newest `updatedAt`.
  - **Migration never drops a budget on read.** `loadBusinesses` and `loadCategories` fall back to `[]` or defaults
    on error, so dropping on read could wipe data.
  - `loadBudgets` returns migrated data in memory. Only the app process writes it back (never the widget's
    headless task), and only if the stored string hasn't changed since it was read.
  - Orphan cleanup happens only in explicit delete flows (see "Other changes").
  - Deleted category ids are filtered out in the view model, never pruned in storage.
- **Fired-alert ledger:** new key `@budget_alerts_fired`, a list of
  `"{budgetId}|{periodStart}|{total|categoryId}|{70|80|90|100}"` strings. Entries for periods
  older than the previous period are pruned on write. The ledger only de-duplicates; whether an
  alert fires is decided by crossing (see Alerts).
- **Backup/restore** includes `@budgets` (already) and is migrated by the same load path. The ledger is not backed up.
- **Uniqueness:** at most one budget per scope; saving a duplicate scope is rejected in the storage layer.
- **Global budget with no cashbooks left** (all books in that currency deleted or moved): it is kept
  but hidden, and reappears when a book in that currency exists again. Its scope slot stays taken.
  Books with no `currency` count as `USD` (`cashbookCurrency` default), the same as in Reports.
- **Dates:** all period maths uses local-date helpers (`toLocalISODate`, `parseLocalISODate`) and
  counts calendar days, never milliseconds ÷ 86,400,000, so it is DST- and timezone-safe.
  Bare `new Date("YYYY-MM-DD")` is never used.

## Calculations (`src/features/budget/`)

Pure functions, no React, fully unit-tested.

- **`periods.ts`:**
  - `periodRange(period, at)` returns the **full** range containing `at`
    (weekly Monday 00:00 → Sunday 23:59:59.999; monthly 1st → last day; yearly Jan 1 → Dec 31),
    in device local time.
  - `previousPeriods(period, at, n)` lists the n periods before `at`.
  - `daysElapsed` counts today as elapsed (day 1 of 31 ⇒ 1 day). `daysLeft` = days in period − daysElapsed + 1, minimum 1, so the per-day figure never divides by zero.
- **`scope.ts`:** `businessIdsForScope(scope, businesses)`. A currency scope uses
  `cashbookCurrency(b)` from `utils/transfers` (same grouping as Reports), so it includes books
  created later. A cashbook that changes currency moves to the other global budget for all
  periods. This is accepted: AsyncStorage keeps no currency history.
- **`spend.ts`:**
  - Counts expenses in scope within the range.
  - **Transfers:** reuse Reports' `excludeInternalTransfers` (`utils/transfers.ts`), grouping by
    cashbook for cashbook scope and by currency for global scope.
    - Internal moves don't count as spending; half-pairs whose other book was deleted still count,
      exactly as in Reports.
    - Fees on transfers still count.
  - **Total spent** = Σ gross (amount + fee).
  - **Category spent** = Σ net `amount`, matched by category **id**.
    - This is an **intentional change** from the old gross-per-category: fees now sit in their own row,
      consistent with Reports.
    - Name → id resolution only looks at `type === "expense"` categories, compares names trimmed and
      case-insensitively, and on duplicate names picks the first in list order.
  - **Fees** go to a synthetic "Fees & Taxes" row (`FEES_CATEGORY_LABEL`).
  - Spend in categories without a limit (including uncategorised) goes to **"Everything else"**.
    The rows always sum to the total.
- **`limits.ts`:** `limitsForPeriod(budget, periodStart)` and `upsertLimits(budget, next, now)`.
  The categories list prunes deleted category ids from `categoryLimits` at load time.
- **`pace.ts`:**
  - `elapsedShare` = daysElapsed / daysInPeriod; `usedShare` = spent / limit.
  - `delta` = usedShare − elapsedShare, in percentage points.
  - Verdict: `over` if spent > limit; else `ahead` if delta > 2; else `on-track`.
    - On track with delta ≤ 0 reads "On track · {x}% under pace"; with 0 < delta ≤ 2 it reads "On pace".
  - `forecast` = spent / daysElapsed × daysInPeriod. It is hidden for the first 3 days of a weekly or monthly
    period (too noisy) and for the first month of a yearly period.
  - `perDay` = max(0, limit − spent) / daysLeft.
  - Past (closed) periods have no pace, forecast or per-day figure.
- **`colour.ts`:** `budgetColour(share, warnAt, palette: { income; gold; expense })` returns a
  6-digit hex. Stops: `income` at 0, `income` at (warnAt − 20)%, `gold` at warnAt%, `expense` at 100%,
  clamped beyond. Linear RGB interpolation between the palette's tokens; no hardcoded colours.
  - The app passes theme tokens; the widget passes `WidgetColors`, which gains a `gold` entry.
  - It replaces `budgetBarColor` in `widgetTheme.ts` and is used by the gauge, the category bars, the history bars and the widget.
- **`history.ts`:** the last 6 periods (5 closed + current), each with spent, the limit in force (or null) and its colour.
- All money goes through `exactMoney`; all percentages through `formatPercent`. Use `getCurrencySymbol`.
- `budgetCalculations.ts` is deleted once callers move over.

## Alerts (`src/features/budget/alerts/`)

### Where they are triggered

`saveTransactions(next, opts?: { prev?: Transaction[]; silent?: boolean })` in `utils/storage.ts`.
After a successful write, if `opts.prev` is given and `!opts.silent`, it calls
`checkBudgetAlerts(prev, next)` fire-and-forget (`.catch` logs, never throws, never blocks the save).
Callers already hold `prev`:

| Caller | prev | Alerts |
|---|---|---|
| `App.tsx` `handleSaveTransactions`: manual entry, edit, delete, transfer, quick-add, and widget quick-add (which deep-links into the app) | `transactions` state | yes |
| `App.tsx` recurring catch-up | loaded list | yes (queued, see delivery) |
| `applyPlan.ts` save/replace (auto-log drain) | `state.transactions` | yes |
| `useAutoLogQueue.ts` (review approve) | `existing` | yes |
| Backup restore, rename cascade, cashbook "Delete all" / "Move to another cashbook", migrations | — | `silent: true` |

**Background reality:** auto-logged messages are drained by `drainNativeQueue`. It runs only in the
app's JS process: at startup, when the app returns to "active", and from a native listener while
the process is alive. There is no headless task, and iOS has no drain. So a push notification
happens only when the drain runs while the app is backgrounded but still alive. Otherwise the alert
shows in-app the next time the app opens and drains. This is accepted; adding a headless task is out of scope.

### Deciding (`evaluateAlerts`, pure, unit-tested)

1. **Early exit:** load budgets first. Stop if none has `alerts.enabled`. Stop if the prev → next diff
   (added, removed or changed expenses, by id) has no transaction whose old **or** new date is in the
   current period of any alert-enabled budget.
2. **Affected scopes:** the cashbook budgets of the affected books, plus the global budget for each affected book's currency.
3. **Totals:** one pass over current-period expenses of the affected books computes the total and each
   category for **prev** and **next**.
4. **Crossing:** a threshold `t ∈ {warnAt, 100}` fires only if `prevShare < t ≤ nextShare` and its key
   is not in the ledger.
   - Deleting or editing spend down never fires.
   - Spend that already existed at upgrade time never fires.
   - Lowering a limit or `warnAt` mid-period never fires by itself. The next expense that crosses fires normally.
   - When one save crosses both thresholds, only the 100% message is shown, but both are recorded.
5. **Concurrency:** load ledger → evaluate → write ledger → hand off messages, all inside
   `withLock("budget-alerts", …)` (`autoLogging/services/ingestion/mutex.ts`), so back-to-back drain saves can't
   double-fire or lose ledger entries.

Message lines state the threshold, with the exact amounts:
"Food in Main cashbook passed 80% · ₵ 486.20 of ₵ 600.00",
"All ₵ cashbooks reached the limit · ₵ 2,013.40 of ₵ 2,000.00".

### Delivering (`deliverAlerts`)

- **Foreground** = `AppState === "active"` **and** not loading **and** not locked (PIN/biometric).
  - Foreground: one `appAlert` ("Budget alert", lines joined) plus `hapticWarning`, on both platforms
    (no `ToastAndroid`; it truncates multi-line text).
  - Alerts produced while loading or locked are **queued in memory** and delivered after unlock, so amounts never
    show over `LockScreen`.
- **Not active:** one local notification via `expo-notifications` (`trigger: null`). It uses a new Android
  channel `budget-alerts`, and `visibility: private` so amounts aren't shown on the lock screen.
- **Permission:**
  - Setup reads it with `getPermissionsAsync`. It requests only when the user turns alerts on and the status is undetermined.
  - If denied, the toggle stays on and setup shows "Notifications are off for this app: you'll only see budget alerts while the app is open."
- **Removed:** `checkBudgetWarning` / `getBudgetWarningMessage` and their `BusinessDetailView` call site.

## UI

### Dashboard (`BudgetDashboardScreen`, split into components)

Layout top to bottom (mockup `full-screen-v3.html`):

1. Title "Budget" + **New budget** button (opens the kind sheet).
2. **Scope chips:**
   - Global chips first ("All ₵", "All $", shown only for currencies the user has cashbooks in),
     then cashbook chips.
   - Selected chip is the inverse-surface style; selection is remembered per session via
     `resolveBudgetSelection`, extended to scopes.
3. **`PeriodSwitcher`:** `‹ October 2026 ›`. The right arrow is disabled on the current period. Weekly
   shows "6–12 Oct"; yearly shows "2026".
4. **`BudgetGauge`** (no card):
   - Title ("October budget"); subtitle ("Monthly limit" for a cashbook, "All ₵ cashbooks · 3 books" for a global budget).
   - Sliders button that opens setup.
   - 270° arc of `react-native-svg` segments coloured by `budgetColour` along their length; hatched remainder (SVG pattern);
     radial glow wedge in the tip colour; triangular pointer and hub in the tip colour; today's
     pace tick (current period only); "N days left" / "Final".
   - Footer: exact spent, "of {limit}", **`PaceChip`**, big % in the tip colour.
5. Hairline divider.
6. **`BudgetSummary`:**
   - Sentence: "You have **{remaining}** left for N days, about {perDay} a day." Over budget:
     "You're **{over}** over your {limit} limit." Past period recap: "{Month} finished {under|over} …".
   - Forecast line (current period only): "At this rate you'll reach {forecast} by {end}."
   - Allocation bar shows **spend as a share of the total limit**.
     - Segments: each limited category, then "Everything else", then "Fees & Taxes", in category chart colours, on a hatched track.
     - The track is the limit. When over, segments are scaled to fit and an over marker shows at the end.
     - The legend gives each share of the limit to one decimal. With zero spend the bar is an empty track.
7. **`CategoryLimitsCard`** (in a card, no pace legend):
   - Rows have a swatch, name, and either "{left} left" or an over chip; a threshold-coloured bar on a hatched track with
     a pace tick; "{spent} of {limit}" and the %.
   - "Everything else" and "Fees & Taxes" rows have no bar.
8. **`BudgetHistoryChart`** (no card):
   - "Last 6 {months|weeks|years}"; bars coloured by the final share; the current
     period is drawn dashed. A stepped dashed limit line shows the limits in force, with a gap where none applied.
   - Tapping a bar selects that period.
   - Summary: "Under budget X of the last Y {periods}." Only periods with a limit count.
9. **Empty state** for a scope with no budget: `EmptyScene variant="budget"` + "Set a budget"
   (opens setup with the kind preselected).

**`PaceChip`:** a soft tonal pill (container tone of the state) with a lucide icon in the state colour:
`CircleCheck` "On track · {x}% under pace" (or "On pace" when 0 < delta ≤ 2), `TrendingUp` "Ahead of pace · +{x}%",
`CircleAlert` "Over by {amount}". Past periods show "Finished {amount} under/over".

### Setup (`BudgetSetupScreen`, mockup `setup.html`)

- Title "{Cashbook} budget" or "Global ₵ budget".
- Period segmented control.
- Large money input with the correct symbol, exact to the cent.
- **Category limits card:** live allocation bar, "{allocated} allocated · {unallocated} unallocated", rows with
  amount inputs and remove, "Add category limit" (`AppModal` picker of expense categories not yet added).
- If the categories exceed the total, Save is disabled **and** an inline error explains why.
- **Alerts card:** toggle, warn-at segmented 70/80/90, "You'll also be told at 100%", colour strip preview,
  and the permission note when notifications are denied.
  Changing warnAt mid-period doesn't fire by itself (crossing rule); a lower threshold can still fire later in the
  same period even if a higher one already fired. That is intended.
- The category picker lists existing expense categories only (unchanged from today; no inline creation).
- Save; **Delete budget** (destructive `appAlert` confirm). Validation: total > 0, each category
  limit > 0, Σ categories ≤ total, amounts parsed to cents.

### New budget sheet (`NewBudgetSheet`, `AppModal` bottom sheet)

Two rows: **One cashbook** ("Limit spending in a single book") and **All {symbol} cashbooks**
("One limit across every book in a currency"). Each expands to its list of cashbooks or currencies;
already-budgeted options are disabled with "Already set · Edit" (which opens edit). If only one
currency exists, the global row goes straight to setup.

### Motion

Reuse `components/reports/motion.ts` (`useReveal`, `useCountUp`, `slice`, `riseStyle`,
`useReducedMotion`):

- The gauge arc and pointer sweep 0 → value; the glow fades in; the spent amount and % count up.
- The allocation bar grows left to right; category rows rise in with a stagger; history bars grow from the baseline.
- Changing period or scope replays the gauge sweep from zero.
- Reduced motion shows the final state immediately.
- Only `react-native-svg` + `Animated`; no new dependencies.

### Widget

- `budgetDataForCashbook` / `buildBudgetView` (`widgetData.ts`) and the BUDGET case in
  `renderWidget.ts` (which reads `b.businessId`) switch to cashbook-scope lookup, the `spend.ts` total and
  `budgetColour` with the budget's warnAt.
- Widgets stay per cashbook. A cashbook covered only by a global budget shows the widget's existing "no budget" state.
- The widget's headless task reads budgets through the pure migration, but never writes them back.

## Other changes

- **Category rename cascade** (`renameCategory(category, nextName)` in `utils/storage.ts`):
  - **Validation:** names are trimmed. Renaming to an existing name of the same type (case-insensitive) is rejected
    with an `appAlert`, so histories never merge silently. Empty names are rejected (already the case).
  - **What it rewrites:** `category` on transactions of the **same type** whose name matches (trimmed,
    case-insensitive), on recurring templates of the same type, and on pending auto-log review items
    (`ReviewItem.draft.category`). Then it saves categories.
  - Transaction writes go through `saveTransactions(..., { silent: true })`.
  - **Stale state:** `CategoryManagementScreen` gets an `onDataChanged` prop from `SettingsScreen`, wired to `App`'s
    `refreshData`, called after the cascade. Without it, the in-memory arrays in `App` would overwrite the rename on the next save.
- **Category delete:** removes its id from all budgets' `categoryLimits` (current and history).
- **Cashbook delete:**
  - Hook: `App.tsx` `handleSaveBusinesses`, where `removedIds` is already computed. It deletes those books'
    cashbook budgets and their ledger entries.
  - The "Delete all" and "Move to another cashbook" transaction rewrites in `BusinessesScreen` use `silent: true`.
- **Callers to migrate off `businessId`:** `getBudgetByBusinessId` (`storage.ts`) is replaced by
  `getBudgetForScope`. Its uses in `BusinessDetailView` (removed with the old warning) and `BudgetSetupScreen`
  are updated, and `budgetSelection.ts` is generalised to scopes. Also `widgetSync.ts` (refresh on save).
- **Notifications:** `scheduleReminders` already requests permission at launch; budget alerts only add the
  `budget-alerts` Android channel (created alongside the existing channel setup).
- Fix the stale `onRefresh` closure; the dashboard uses a `useBudgetDashboard` hook that owns loading.
- Update `BUDGET_FEATURE_GUIDE.md`: replace the three old docs with one short doc.
- The tour (`TourOverlay`) steps are re-pointed at the gauge, chips and New budget.

## File layout

```
src/features/budget/
  periods.ts  scope.ts  spend.ts  limits.ts  pace.ts  colour.ts  history.ts  migrate.ts
  alerts/evaluateAlerts.ts  alerts/deliverAlerts.ts  alerts/checkBudgetAlerts.ts  alerts/ledger.ts
  hooks/useBudgetDashboard.ts
  components/BudgetGauge.tsx  PaceChip.tsx  BudgetSummary.tsx  AllocationBar.tsx
             CategoryLimitsCard.tsx  BudgetHistoryChart.tsx  PeriodSwitcher.tsx  ScopeChips.tsx
             NewBudgetSheet.tsx
src/screens/BudgetDashboardScreen.tsx   (composition only)
src/screens/BudgetSetupScreen.tsx       (restyled, split if > ~500 lines)
```

## Testing

Unit (jest, `__tests__/budget/`):

- **periods:** Monday weeks, including Sunday edge, month and year ends, leap February, daysLeft ≥ 1.
- **spend:** scope filter (cashbook vs currency, including a later-added book and a no-currency book as USD),
  internal transfers excluded but fees and orphan half-pairs kept (parity with Reports), gross total,
  duplicate and case-different category names, "Everything else" and "Fees & Taxes", rows sum to total.
- **limits/migrate:** legacy migration, limit lookup across edits, same-period overwrite,
  period-type change reset, zero category limits dropped, duplicate legacy budgets deduped, nothing dropped
  when businesses fail to load, idempotence.
- **renameCategory:** cascade per type, collision rejected, recurring and review items updated.
- **pace:** verdict boundaries (±2 points, exactly at the limit), forecast, perDay when over.
- **colour:** stops at warnAt 70/80/90, clamp > 100%.
- **evaluateAlerts:** fires once, crossing only (pre-existing spend and lowered limits don't fire), warn and 100 in one
  save (one message, both recorded), category vs total, global + cashbook combined, alerts disabled, no limit
  for the period, edits and deletes that reduce spend don't fire, diffs outside the current period exit early,
  two concurrent evaluations don't double-fire (lock).
- **widget:** update the existing `widgetData` tests to the new totals.

Then `pnpm test`, `npx tsc -b`, eslint, and an on-device check via the demo build (gauge animation,
auto-log alert while backgrounded with the app alive, alert queued behind the lock screen, dark mode, reduced motion).

## Out of scope

Rollover, history-based pace, global-budget widget, custom periods or start days, budget sharing,
a headless background drain for auto-log, per-cashbook breakdown inside a global budget's categories.
