# Android Home-Screen Widgets — Design Spec

**Date:** 2026-08-10
**Status:** Draft for review
**Platform:** Android only
**App:** Expense Tracker (Expo SDK 54, RN 0.81, React 19)

---

## 1. Overview

Add Android home-screen widgets to Expense Tracker so users can glance at their money and log an expense without opening the app first. Three widgets, all scoped to a **pinned cashbook** (a `Business`) chosen when the widget is placed:

1. **Balance glance** — net balance (income − expense) for the pinned cashbook, in that cashbook's currency.
2. **Budget progress** — how much of the cashbook's budget is used this period, as a progress bar + figures.
3. **Quick-add** — a tap target that opens the app directly into the Quick Add flow, pre-selected to the pinned cashbook.

## 2. Goals & Non-Goals

**Goals**
- Glanceable balance and budget for a specific cashbook, respecting per-cashbook currency.
- One-tap entry into expense logging.
- Widgets stay reasonably fresh: update when the app changes data, plus Android's periodic refresh.
- Reuse existing TypeScript logic (`budgetCalculations.ts`, storage layer, theme tokens) — no reimplementation of money math in Kotlin.

**Non-Goals (YAGNI)**
- iOS widgets (Android-only for this release; the official Expo `widgets` module is iOS-only and needs SDK 57 anyway).
- Native inline expense entry from the widget surface (we deep-link into the app instead).
- "All cashbooks combined" / multi-currency aggregation.
- Recent-transactions widget and live/high-frequency updates.

## 3. Constraints & Key Facts (verified)

- **Data lives in AsyncStorage** as JSON blobs (`src/utils/storageKeys.ts`). A widget runs in a **separate process** and cannot read the app's React state — but see §5, the chosen library renders widgets in a **headless JS task** that *can* read AsyncStorage via the existing `src/utils/storage.ts` functions. This removes the need for a separate native snapshot store.
- **A `Business` is a cashbook.** `Transaction.businessId` and `Budget.businessId` scope everything; each `Business` may set its own `currency` (`src/types.ts`).
- **One budget per cashbook** — `getBudgetByBusinessId()` returns a single `Budget` for a `businessId`.
- **Widgets require a dev/production build** — they cannot run in Expo Go. The repo already has `expo-dev-client` and a committed `android/` folder, so this is fine.
- **Deep-link scheme** is `financetracker` (`app.json`).
- **Android package**: `applicationId` is `com.patrickackom.financetracker`; the Kotlin `namespace` is `com.yourcompany.financetracker` (`android/app/build.gradle`). New native artifacts introduced by the config plugin must target the real `applicationId`.

## 4. Chosen Approach

**`react-native-android-widget`** (v0.22.0, published 2026-08-08, peer dep `expo: >=54.0.0`).

Rationale (vs. hand-rolled Kotlin `AppWidgetProvider`/Glance):
- Widget UI is written in **React components** (`FlexWidget`, `TextWidget`, `OverlapWidget`), not RemoteViews/Glance.
- Rendering runs a **headless JS task** in the RN context → reuse `storage.ts` + `budgetCalculations.ts` + theme tokens; zero money-math drift.
- First-class support for **configuration screens** (pin-a-cashbook), **click actions** (deep-link to Quick Add), and programmatic **`requestWidgetUpdate()`**.
- Trade-off accepted: headless render has cold-start cost and is subject to Android background limits — fine for occasionally-updating finance widgets.

## 5. Architecture

### 5.1 Data flow

```
                       ┌─────────────────────────────┐
   App writes data     │  AsyncStorage (@transactions,│
   (save*)  ─────────► │  @budgets, @businesses, ...) │ ◄──┐
        │              └─────────────────────────────┘    │
        │ requestWidgetUpdate()                            │ read
        ▼                                                  │
  ┌───────────────┐   WIDGET_UPDATE / WIDGET_CLICK   ┌─────┴────────┐
  │ Android host  │ ──────────────────────────────► │ widgetTask    │
  │ (launcher)    │                                  │ Handler (JS)  │
  └───────────────┘ ◄── rendered widget UI ───────── └──────┬───────┘
        ▲  tap (quick-add)                                   │ resolves
        └── openApp → deep link financetracker://quick-add ──┘ widgetId→businessId
```

- **Reads:** the headless `widgetTaskHandler` loads the widget's pinned `businessId`, then reads transactions/budgets/businesses via existing storage functions and computes the display data.
- **Writes → refresh:** whenever the app mutates transactions, budgets, or businesses, it calls a `widgetSync` helper that invokes `requestWidgetUpdate()` for the affected widgets (Android-guarded no-op elsewhere).
- **Periodic:** Android fires `WIDGET_UPDATE` on the provider's `updatePeriodMillis` as a backstop.

### 5.2 New feature module: `src/features/widgets/`

Kept self-contained and small, mirroring the `autoLogging` feature layout.

| File | Responsibility |
|---|---|
| `widgetTaskHandler.tsx` | Entry for all widget lifecycle events (`WIDGET_ADDED`, `WIDGET_UPDATE`, `WIDGET_RESIZED`, `WIDGET_CLICK`, `WIDGET_DELETED`). Loads data, picks the widget component, calls `props.renderWidget(...)`. Thin dispatcher only. |
| `services/widgetConfig.ts` | Persist/read the `widgetId → businessId` map in AsyncStorage (new key `@widget_cashbook_map`). Get/set/delete. |
| `services/widgetData.ts` | Pure-ish data assembly: given a `businessId`, build `BalanceView`/`BudgetView` DTOs from storage. Delegates math to `budgetCalculations.ts` + a new `computeCashbookBalance`. |
| `services/widgetSync.ts` | `refreshCashbookWidgets(businessId?)` → Android-guarded `requestWidgetUpdate` for Balance + Budget widgets. Called from app mutation points. |
| `theme/widgetTheme.ts` | Maps `lightTheme.colors`/`darkTheme.colors` to the concrete color strings the widget components need. No hardcoded colors. |
| `components/BalanceWidget.tsx` | Renders the balance glance from a `BalanceView`. |
| `components/BudgetWidget.tsx` | Renders the budget progress from a `BudgetView`. |
| `components/QuickAddWidget.tsx` | Renders the quick-add button; declares its `clickAction`. |
| `components/WidgetStates.tsx` | Shared placeholder/error renderers ("Tap to set up", "Cashbook removed", "No budget set"). |
| `screens/WidgetConfigScreen.tsx` | Cashbook picker shown during widget configuration; writes the map then finishes configuration. |

### 5.3 Pure logic to add (testable, in `src/utils/`)

- `computeCashbookBalance(transactions, businessId): number` — `Σ income − Σ expense` for that cashbook. Small, pure, unit-tested. (No such helper exists today; dashboard computes inline.)
- Reuse `getDateRangeForPeriod`, `calculateBudgetData`, `calculateTotalSpent`, `calculateTotalLimit` from `budgetCalculations.ts` for the budget widget.
- Reuse `getCurrencySymbol` from `src/utils/_helpers.ts` for currency formatting.

## 6. The Widgets

### 6.1 Balance glance
- **Content:** cashbook name (small), big net balance with currency symbol, and a subtle "this month income ↑ / expense ↓" secondary line.
- **Data (`BalanceView`):** `{ cashbookName, currencySymbol, balance, monthIncome, monthExpense }`.
- **Sizes:** small (2×1: name + balance) and medium (adds the income/expense line). Library resize handled in one component via `props`.

### 6.2 Budget progress
- **Content:** cashbook name, period label ("This Month"), progress bar (spent / limit), `spent of limit` figures, remaining. Bar color from budget status thresholds (`getBudgetStatusColor` logic: <70% success, <90% secondary, ≥90% error) — but resolved to concrete theme tokens for the widget.
- **Data (`BudgetView`):** `{ cashbookName, periodLabel, currencySymbol, totalSpent, totalLimit, percentage }`, or `{ noBudget: true }`.
- **Empty state:** "No budget set — tap to create" (deep-links to the cashbook's budget screen).

### 6.3 Quick-add
- **Content:** cashbook name + a prominent "+ Add expense" affordance.
- **Behavior:** `clickAction` → open app with deep link `financetracker://quick-add?businessId=<id>`.

## 7. Configuration (pin-a-cashbook)

Uses the library's configuration mechanism:
- Plugin config sets `widgetFeatures: 'reconfigurable'` so the config screen opens when the widget is placed (and via long-press later).
- Native side: the config plugin wires a configuration activity (`RNWidgetConfigurationActivity`) + manifest entry; we register a React config screen via `registerWidgetConfigurationScreen`.
- `WidgetConfigScreen` receives the `widgetId`, lists cashbooks (`loadBusinesses()`), and on selection writes `{ [widgetId]: businessId }` via `widgetConfig.ts`, renders the first frame, and completes configuration.
- **Important:** `WIDGET_ADDED` fires regardless of configuration. The task handler must render a **"Tap to set up"** placeholder when no mapping exists yet, so a half-configured widget never crashes or shows stale/blank data.

## 8. Deep-link handling (Quick-add)

- Add deep-link routing in `App.tsx` using `expo-linking` / RN `Linking`: on `financetracker://quick-add?businessId=<id>` (both cold-start `getInitialURL` and warm `addEventListener`), set `quickAddVisible = true` and pass the target cashbook.
- **`QuickAddModal` change:** add an optional `initialBusinessId?: string` prop. When provided and it matches a loaded business, pre-select it (skip the "Add to which cashbook?" step). Purely additive; existing callers unaffected. (Current component derives selection internally — `src/components/QuickAddModal.tsx:32`.)
- If the `businessId` no longer exists, fall back to the normal cashbook chooser.

## 9. Theming

- Widget components cannot use `useTheme()` (no provider in the headless task). `widgetTheme.ts` selects `lightTheme.colors` or `darkTheme.colors` explicitly.
- **Light/dark selection:** read the persisted theme preference the way `ThemeContext` does (system/light/dark); if "system", fall back to the OS appearance. Resolve to concrete color strings so the widget honors the user's in-app override rather than only the OS setting.
- **No hardcoded colors** — all values come from theme tokens (satisfies project rule). Fonts: use the Manrope family names from `theme.fonts` where the library supports custom fonts; otherwise default system font (widgets have limited font control — acceptable degradation, noted as a risk).

## 10. Registration & Config Plugin

- `index.js` (new entry, currently `main` is `node_modules/expo/AppEntry.js`): register the app plus `registerWidgetTaskHandler(widgetTaskHandler)` and `registerWidgetConfigurationScreen(WidgetConfigScreen)`. Requires switching `package.json` `main` to a local `index.js` that imports `expo/AppEntry` equivalent — **decision point, see §14**.
- `app.json` `plugins`: add `react-native-android-widget` with a `widgets` array declaring each widget (name, `minWidth`/`minHeight`, `targetCellWidth/Height`, `description`, `previewImage`, `resizeMode`, and `widgetFeatures: 'reconfigurable'` where applicable).
- Run `expo prebuild` to regenerate `android/` (the folder is committed; review the diff, preserve the custom `autolog` sources).

## 11. Refresh Strategy

| Trigger | Mechanism |
|---|---|
| App saves transactions / budgets / businesses | `widgetSync.refreshCashbookWidgets()` at mutation points in `App.tsx` (and budget save flow) → `requestWidgetUpdate`. |
| Widget placed / reconfigured | Config screen renders first frame. |
| Periodic backstop | `updatePeriodMillis` in widget provider (e.g. ~30 min; Android clamps min 30 min). |
| App returns to foreground | Optional: refresh on `AppState` active (App.tsx already tracks `AppState`). |

Mutation points to hook (from `App.tsx`): transaction create/edit/delete, transfers (which touch two cashbooks), budget create/update, business create/delete, and recurring-transaction generation on launch.

## 12. Edge Cases & Error Handling

- **No mapping yet / `WIDGET_ADDED` before config** → "Tap to set up" placeholder.
- **Pinned cashbook deleted** → "Cashbook removed — tap to reconfigure"; also clean the stale entry from `@widget_cashbook_map` when a business is deleted.
- **No budget for cashbook** → budget widget shows "No budget set — tap to create".
- **AsyncStorage read throws in headless task** → render a neutral error/last-state placeholder; never crash the task.
- **Multi-currency** → always format with the pinned cashbook's own `currency`; never sum across currencies.
- **Transfers** are double-entry across two cashbooks (`transferId`) — balance math already nets naturally since each leg is income/expense on its own cashbook; no special-casing, but both cashbooks' widgets must refresh after a transfer.
- **Large numbers** → compact formatting for the balance widget's small size if it overflows.

## 13. Testing

Per project TDD guidance, focus on the pure logic (the native/rendering path is validated by manual on-device QA):

- **Unit (Jest):**
  - `computeCashbookBalance` — income/expense netting, empty, wrong-business filtering, transfer legs.
  - `widgetData` DTO assembly — balance view, budget view, `noBudget` path, unknown `businessId`.
  - `widgetConfig` map get/set/delete + stale-cleanup on business delete.
  - Deep-link URL parsing (`quick-add?businessId=` → params; malformed URL).
- **Manual QA (device):** place each widget, run config picker, verify currency per cashbook, verify refresh after add/edit/delete/transfer, dark/light, cashbook deletion state, quick-add cold-start vs warm deep link.
- Avoid redundant tests; no attempt to unit-test the headless render or native lifecycle.

## 14. Decisions

**Resolved (2026-08-10):**
1. **Package manager:** *Stay on npm* for this feature (repo has committed `package-lock.json`). A pnpm migration, if desired, is a separate change and out of scope here.
2. **Entry file switch:** *Approved* — add a local `index.js` as `package.json` `main`, registering the app + `registerWidgetTaskHandler` + `registerWidgetConfigurationScreen`.

**Still open (non-blocking, decide during implementation):**
3. **`updatePeriodMillis` value** and whether to also refresh on foreground (battery vs. freshness). Default assumption: ~30 min periodic + refresh on app data writes; foreground refresh optional.
4. **Widget font:** accept the system font on the widget surface if custom Manrope isn't cleanly supported by the library; revisit bundling Manrope for widgets only if it looks off in QA.
5. **Preview images** for the widget picker — need designed PNG assets (a design task, tracked separately from logic).

## 15. Rollout / Build Steps (high level)

1. Resolve §14.1–14.2.
2. Add dependency + `app.json` plugin config; `expo prebuild`; review `android/` diff.
3. Implement pure logic + tests (TDD).
4. Implement task handler, widget components, config screen, sync, theme.
5. Wire deep link + `QuickAddModal.initialBusinessId`.
6. Dev build to device; manual QA matrix (§13).
7. Ship behind the normal release flow (aligns with in-flight v1.3.x ASO work).

---

*Next step after approval: create the implementation plan (writing-plans skill).*
