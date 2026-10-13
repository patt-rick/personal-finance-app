# Interactive Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal-card tour with a spotlight tour that highlights real UI and has do-it steps the user completes by tapping the real element.

**Architecture:** A module-level store (same pattern as `components/dialog/appAlert.ts`) holds the active tour and a small context pushed from `MainApp`. Pure functions decide what to show. A root-level `TourHost` (plain `View`, not a `Modal`) measures registered targets and draws an SVG dim layer with a cutout plus a tooltip.

**Tech Stack:** React Native 0.81 (new architecture), Expo SDK 54, React Navigation 6 bottom tabs, `react-native-svg`, RN `Animated`, jest + ts-jest (logic only). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-interactive-tour-design.md`

**Branch:** `feat/interactive-tour` off `main`. Commits carry no co-author line.

**Device spike:** no Android device is attached in this session, so the spike in the spec cannot be run here. The expected fix (`collapsable={false}` wrapper around `NavigationContainer`) is built in from the start (Task 6), and stacking plus tap-through are listed as unverified in the hand-off.

---

## File structure

| File | Responsibility | RN imports |
|---|---|---|
| `src/features/tour/types.ts` | Shared types | none |
| `src/features/tour/tours.ts` | Tour definitions (data) | none |
| `src/features/tour/tourMachine.ts` | Pure view/advance/counter logic | none |
| `src/features/tour/placement.ts` | Pure tooltip geometry | none |
| `src/features/tour/tourStorage.ts` | `@tour_completed` read/write, journey disposition | AsyncStorage |
| `src/features/tour/targetRegistry.ts` | id -> `{ ref, scrollRef }` map + subscribe | none (refs are opaque) |
| `src/features/tour/tourStore.ts` | Active tour, context, sheets, pending requests | none |
| `src/features/tour/hooks.ts` | `useTourTarget`, `useTourRequest`, `useTourSheet`, `useTourView` | react, react-navigation |
| `src/features/tour/measure.ts` | `locateTarget`: scroll into view, then measure relative to host root | react-native |
| `src/features/tour/Spotlight.tsx` | Dim layer, cutout, blockers, pulse ring | react-native, svg |
| `src/features/tour/TourTooltip.tsx` | Tooltip card | react-native |
| `src/features/tour/TourHost.tsx` | Subscribes, measures, lays out, back handler, a11y | react-native |

Files with no RN imports are what jest covers.

## Interfaces

```ts
// types.ts
export type TourId = "journey" | "budget-v2" | "settings";
export type TabName = "Dashboard" | "Cashbooks" | "Budget" | "Settings";
export type TargetId =
    | "tab-home" | "tab-books" | "tab-budget" | "tab-settings" | "tab-add"
    | "cashbooks-new" | "home-balance" | "home-autolog" | "home-cashbook-row"
    | "budget-gauge" | "budget-scope" | "budget-history"
    | "settings-profile" | "settings-general" | "settings-features" | "settings-data";

export interface TourContext {
    cashbookCount: number | null;     // null until MainApp has pushed real data
    transactionCount: number | null;
    activeTab: TabName;
}

export interface TourStep {
    id: string;
    tab: TabName | null;
    target: TargetId | null;
    shape?: "rect" | "pill";
    title: string;
    body: string;
    kind: "info" | "action";
    doneWhen?: (ctx: TourContext, atStepStart: TourContext) => boolean;
    satisfiedWhen?: (atStepStart: TourContext) => boolean;
    infoBody?: string;
    optional?: boolean;
}

export interface TourView {
    key: string;                      // changes whenever what is shown changes
    target: TargetId | null;
    shape: "rect" | "pill";
    title: string;
    body: string;
    kind: "info" | "action";
    counter: { index: number; total: number } | null;
    isLast: boolean;
}

export interface ActiveTour {
    tourId: TourId;
    stepIndex: number;
    atStepStart: TourContext;
    counted: string[];                // step ids counted in the "n of m" total
}
```

```ts
// tourMachine.ts
type IsRegistered = (id: TargetId) => boolean;
export const TAB_TARGETS: Record<TabName, TargetId>;
export function nextIndex(steps: TourStep[], from: number, isRegistered: IsRegistered): number; // -1 = none
export function countedSteps(steps: TourStep[], isRegistered: IsRegistered): string[];
export function currentView(steps: TourStep[], active: ActiveTour, ctx: TourContext, isRegistered: IsRegistered): TourView;
export function shouldAdvance(step: TourStep, ctx: TourContext, atStepStart: TourContext): boolean;
```

- `nextIndex` skips steps that are `optional` with an unregistered target.
- `currentView`: tab redirect when `step.tab && ctx.activeTab !== step.tab` (target `TAB_TARGETS[step.tab]`, `kind: "action"`, pill, no counter, `isLast: false`, key `${step.id}>tab`); otherwise the step, shown as `info` with `infoBody ?? body` when `kind === "action"` and `satisfiedWhen?.(active.atStepStart)`. `isLast` is `nextIndex(...) === -1`. `counter` is `null` when the step id is not in `active.counted`.
- `shouldAdvance` is false for `info` steps and for satisfied action steps.

```ts
// placement.ts
export interface Rect { x: number; y: number; width: number; height: number }
export interface Placement { top: number; left: number; arrowX: number | null; side: "below" | "above" | "over" | "center" }
export function placeTooltip(args: {
    target: Rect | null;
    tooltip: { width: number; height: number };
    screen: { width: number; height: number };
    bounds: { top: number; bottom: number };  // y range the card may occupy
    gap?: number;      // default 12
    margin?: number;   // default 16
}): Placement;
```

```ts
// tourStorage.ts
export type Completed = Record<string, boolean>;
export async function loadCompleted(): Promise<Completed>;         // {} on missing or corrupt
export async function markTourCompleted(id: TourId): Promise<void>; // tolerant of corrupt JSON
export async function clearCompleted(): Promise<void>;
export function journeyDisposition(completed: Completed, cashbookCount: number): "completed" | "existing-user" | "start";
```

```ts
// targetRegistry.ts
export interface TargetEntry { ref: { current: unknown }; scrollRef?: { current: unknown } }
export function registerTarget(id: TargetId, entry: TargetEntry): () => void;
export function getTarget(id: TargetId): TargetEntry | null;   // null when unregistered or ref.current is null
export function isRegistered(id: TargetId): boolean;
export function notifyTargetChanged(): void;                    // called from target onLayout
export function subscribeTargets(listener: () => void): () => void;
```

```ts
// tourStore.ts
export function subscribeTour(listener: () => void): () => void;
export function getTourView(): TourView | null;      // null when idle or a sheet is open
export function isTourActive(): boolean;
export function setTourContext(patch: Partial<TourContext>): void;
export function setSheetOpen(key: string, open: boolean): void;
export function requestTour(id: TourId): void;
export function withdrawTour(id: TourId): void;
export function startTour(id: TourId): void;         // no-op while a tour is active
export function nextStep(): void;
export function skipTour(): void;
export async function resetTours(): Promise<void>;   // clears storage and the in-memory cache
export function onTourEnd(listener: (id: TourId, outcome: "finished" | "skipped") => void): () => void;
export function resetTourStoreForTest(): void;
```

Store rules:
- `setTourContext` merges, then, if a tour is active and `shouldAdvance` holds, advances; then evaluates pending requests.
- Advancing sets `stepIndex = nextIndex(...)` and snapshots `atStepStart`; `-1` ends the tour as `"finished"`.
- Ending writes the flag (memory cache first, then storage), clears `active`, calls end listeners, evaluates pending.
- Pending evaluation runs only when idle, no sheet is open, the completion cache is loaded (loaded lazily on the first request) and `cashbookCount !== null`. For `journey` it applies `journeyDisposition`; `"existing-user"` writes the flag without starting.
- `startTour` snapshots the context, computes `counted`, and starts at `nextIndex(steps, -1, ...)`.

## Amendments from the Opus plan review (2026-10-13)

These override the interfaces and rules above where they differ.

- **Cached view.** `getTourView()` returns a reference the store recomputes only when it emits, so `useSyncExternalStore` does not loop. The accessibility wrapper is its own small component, so `MainApp` does not re-render per step.
- **Pending evaluation triggers:** `requestTour`, completion-cache load, `setSheetOpen(false)`, `setTourContext`, tour end.
- **Replay is one synchronous store call, `replayTours()`** (replaces `resetTours` + `startTour`): cache becomes `{}`, pending requests are cleared, the journey starts, then the cache is persisted. All writes persist the whole cache through one promise chain (`saveCompleted`), and a generation counter discards stale loads.
- **`TourView.redirectTo: TabName | null`.** Next on a redirect view navigates to that tab (through `setTourNavigator`) and does not advance the step.
- **Context counts are plain numbers;** the store tracks separately whether `MainApp` has pushed real counts.
- **Advancing is not gated on an open sheet** (a save lands while the sheet is still reported open).
- **Journey:** step 6 (`home-cashbook-row`) is optional. Step 3 (`tab-add`) is shown as info when there is no cashbook, so it can never strand the user on the "No cashbooks yet" sheet.
- **Measuring:** the scroll band is intersected with the scroll view's own window rect (screen headers sit outside it); scroll at most once per locate, then poll frames until two reads agree; `screen` size comes from the host root's `onLayout`; a rect wholly off-screen counts as not found; `getInnerViewRef` needs a cast.
- **Registry** notifies on register and unregister, and only deletes an entry it still owns.
- **Wiring:** `createNavigationContainerRef()` at module level; `SettingsScreen` needs `useNavigation`; Budget eligibility also requires its own New sheet closed; remove the icon imports each screen only used for the old tour.
- **Tests:** `tourStore.test.ts` mocks AsyncStorage and awaits `whenTourStoreSettled()`.

---

### Task 1: Types, tour data, state machine

**Files:** create `types.ts`, `tours.ts`, `tourMachine.ts`; test `__tests__/tour/tourMachine.test.ts`.

- [ ] Write failing tests:
  - redirect view when off-tab (target is the tab button, action, no counter); no redirect when on-tab; no redirect when `tab` is null
  - action step shown as info with `infoBody` when `satisfiedWhen(atStepStart)` is true
  - `shouldAdvance`: true when cashbook count rises above the snapshot; false for info; false for a satisfied action step
  - `nextIndex` skips an unregistered optional step in the middle and at the end (returns -1)
  - `isLast` true on the step before a trailing unregistered optional step
  - `countedSteps` excludes unregistered optional steps; `counter` null for a step not counted
  - the real `journey` definition: step ids in order, and step 2/3 `doneWhen` and `satisfiedWhen` behave as the spec table says
- [ ] Run `pnpm jest __tests__/tour/tourMachine.test.ts`; expect failures for missing module.
- [ ] Implement `types.ts`, `tours.ts` (text from the spec tables), `tourMachine.ts`.
- [ ] Run again; expect pass. Commit `feat(tour): step definitions and state machine`.

### Task 2: Tooltip placement

**Files:** create `placement.ts`; test `__tests__/tour/placement.test.ts`.

- [ ] Write failing tests: below by default; flips above when below would cross `bounds.bottom`; `over` (bottom edge at `bounds.bottom`, no arrow) when neither fits; left clamped to `margin` at both screen edges; `arrowX` points at the target centre and is clamped to `[24, width - 24]`; `center` with no target.
- [ ] Implement; run; commit `feat(tour): tooltip placement`.

### Task 3: Storage and migration

**Files:** create `src/features/tour/tourStorage.ts`; test `__tests__/tour/tourStorage.test.ts` (AsyncStorage mocked as in `__tests__/budget/budgetStore.test.ts`).

- [ ] Write failing tests: `journeyDisposition` for the three rules (`journey` set; legacy `dashboard` set; unset with cashbooks; unset without); `loadCompleted` returns `{}` for corrupt JSON; `markTourCompleted` overwrites corrupt JSON rather than throwing; `clearCompleted` removes the key.
- [ ] Implement; run; commit `feat(tour): completion storage with legacy migration`.

### Task 4: Registry and store

**Files:** create `targetRegistry.ts`, `tourStore.ts`; test `__tests__/tour/tourStore.test.ts`.

- [ ] Write failing tests (register fake targets as `{ ref: { current: {} } }`):
  - a requested journey starts for a new install once context has counts, and does not start before
  - a request made while a sheet is open starts when the sheet closes
  - a withdrawn request does not start
  - existing user (cashbooks, no flags): journey does not start and the `journey` flag is written
  - `startTour` is a no-op while a tour is active, and bypasses the existing-user rule
  - context change advances an action step; the tour ends as `"finished"` after the last `nextStep`, writes the flag and calls `onTourEnd`
  - `skipTour` writes the flag and reports `"skipped"`
  - `getTourView()` is null while a sheet is open and returns when it closes
  - `getTarget` returns null when `ref.current` is null
- [ ] Implement; run; commit `feat(tour): target registry and tour store`.

### Task 5: Overlay UI

**Files:** create `hooks.ts`, `measure.ts`, `Spotlight.tsx`, `TourTooltip.tsx`, `TourHost.tsx`. Load the `frontend-design` skill first (project rule for UI work).

- [ ] `hooks.ts`:
  - `useTourTarget(id, scrollRef?)` returns `{ ref, onLayout, collapsable: false }` to spread on a host component; registers on mount, unregisters on unmount; `onLayout` calls `notifyTargetChanged()`.
  - `useTourRequest(id, eligible)`: when the screen is focused (`useIsFocused`) and `eligible`, requests the tour after 600 ms; cleanup clears the timer and withdraws.
  - `useTourSheet(key, open)`: reports the sheet; cleanup reports closed.
  - `useTourView()`: `useSyncExternalStore(subscribeTour, getTourView)`.
- [ ] `measure.ts`: `locateTarget(entry, rootRef, band, onRect)`:
  1. `measureInWindow` target and root.
  2. If the entry has a `scrollRef` and the rect is not fully inside `band` (`{ top, bottom }` in window coordinates), `measureLayout` the target against `scrollRef.getInnerViewRef()`, clamp to `contentHeight - viewportHeight`, `scrollTo({ y, animated: false })`, then measure again on the next frame.
  3. Report the rect relative to the root, or `null` when width or height is 0.
- [ ] `Spotlight.tsx`: props `{ rect: Rect | null, shape, kind, screen, reducedMotion }`. `Svg` (`pointerEvents="none"`) with one even-odd `Path` (screen rect plus rounded hole: 8 px padding, radius 16 or `height / 2` for pill), fill `theme.colors.scrim`, `fillOpacity` 0.6. Blockers are `Pressable`s with a no-op `onPress` and `accessible={false}`: one full-screen when `kind === "info"` or `rect` is null; four around the **unpadded** rect for `action`. Pulse ring for `action`: `Animated.View`, `pointerEvents="none"`, 2 px `theme.colors.primary` border, native-driven scale and opacity loop, omitted when `reducedMotion`.
- [ ] `TourTooltip.tsx`: props `{ view, showNext, onNext, onSkip, onLayout, arrowX, side }`. Card: `surfaceContainerLow`, `shape.extraLarge`, `elevation.level3`; title (`fonts.semibold`, `onSurface`), body (`onSurfaceVariant`), counter, Skip (text button), primary pill (`primary` / `onPrimary`) labelled Next or Got it; hint line with no primary button for `action` unless `showNext`. Arrow is a rotated square in the card colour, above or below per `side`, omitted when `arrowX` is null.
- [ ] `TourHost.tsx`:
  - root `View` `StyleSheet.absoluteFill`, `pointerEvents="box-none"`, `accessibilityViewIsModal`; renders null with no view
  - on view key change: reset rect and fallback; locate; re-locate on `subscribeTargets`, after 500 ms, and on `Dimensions` change; after 1.5 s without a rect set `fallback` (centred card, Next shown)
  - `band`: top `insets.top`, bottom `screen.height - FLOATING_TAB_HEIGHT - Math.max(insets.bottom, 8)`
  - tooltip width `Math.min(screen.width - 32, 340)`; measured with `onLayout`, invisible until measured; `bounds.bottom` is the top of the tab bar minus 12 unless the target itself is inside the tab bar zone, in which case it is the screen bottom
  - `showNext` = `info`, or fallback, or screen reader on (`AccessibilityInfo.isScreenReaderEnabled` + `screenReaderChanged`)
  - `AccessibilityInfo.announceForAccessibility(title + ". " + body)` on view change
  - `BackHandler` listener while a view is shown: `skipTour()`, return `true`
  - fade in on view change (150 ms, native driver), skipped with reduced motion
- [ ] `npx tsc -b`; commit `feat(tour): spotlight overlay host`.

### Task 6: Wire into the app

**Files:** modify `App.tsx`, `src/components/FloatingTabBar.tsx`, `src/screens/DashboardScreen.tsx`, `src/components/dashboard/PaymentCard.tsx`, `src/components/dashboard/AutoLogPromoCard.tsx`, `src/screens/BusinessesScreen.tsx`, `src/screens/BudgetDashboardScreen.tsx`, `src/features/budget/components/ScopeChips.tsx`, `src/screens/SettingsScreen.tsx`; delete `src/components/TourOverlay.tsx`, `src/utils/tourStorage.ts`.

- [ ] `App.tsx` (`MainApp`, hooks placed above the splash and lock early returns):
  - `createNavigationContainerRef()`; `onReady` and `onStateChange` push `activeTab` from `navigationRef.getCurrentRoute()?.name`
  - effect pushing `cashbookCount` / `transactionCount`, gated on `!isLoading`
  - `useTourSheet("quickAdd", quickAddVisible)`
  - `onTourEnd`: `journey` + `finished` -> `setTimeout(() => maybeRequestReview({ kind: "tour_completed" }), 600)`
  - wrap `<NavigationContainer>` in `<View style={{ flex: 1 }} collapsable={false} importantForAccessibility={...}>`, `"no-hide-descendants"` while the shown view is `info`
  - `<TourHost />` after `<QuickAddModal>`
- [ ] `FloatingTabBar.tsx`: four `useTourTarget` calls for the tabs and one for `tab-add`, spread on the `TouchableOpacity`s.
- [ ] `DashboardScreen.tsx` (`DashboardHome`): remove `<TourOverlay>` and its now-unused imports; `scrollRef` on the `ScrollView`; `useTourRequest("journey", true)`; pass `tourScrollRef` to `PaymentCard` and `AutoLogPromoCard`; `home-cashbook-row` props on a wrapper inside the first `AnimatedCashbookItem`.
- [ ] `PaymentCard.tsx`: `tourScrollRef` prop; `home-balance` target props on the first card's width wrapper.
- [ ] `AutoLogPromoCard.tsx`: `tourScrollRef` prop; `home-autolog` target props on the card's `Animated.View`.
- [ ] `BusinessesScreen.tsx`: remove `<TourOverlay>`; `cashbooks-new` on the FAB; `useTourSheet("createCashbook", createModalVisible)`.
- [ ] `BudgetDashboardScreen.tsx`: remove `<TourOverlay>`; `scrollRef`; wrapper `View` with `budget-gauge` around `BudgetGauge`; `budget-history` on the history section `View`; `useTourRequest("budget-v2", eligible)` above the early returns, with `eligible = !editing && !d.loading && !!d.budget && d.view?.limit != null`; pass `tourScrollRef` to `ScopeChips`.
- [ ] `ScopeChips.tsx`: `budget-scope` target on a wrapper `View` around the horizontal `ScrollView` (hook above the `scopes.length < 2` return).
- [ ] `SettingsScreen.tsx`: remove `<TourOverlay>`; `scrollRef`; targets on the profile card and the General, Features and Data group cards; `useTourRequest("settings", rootVisible)` above the early returns, `rootVisible` = none of the seven `show*` flags; Replay Tours row: `await resetTours()`, `navigation.navigate("Dashboard")`, `startTour("journey")`.
- [ ] Delete the two old files; `rg "TourOverlay|utils/tourStorage" src App.tsx` returns nothing.
- [ ] `npx tsc -b` and `pnpm jest`; commit `feat(tour): interactive spotlight tour replaces modal tour`.

### Task 7: Checks and review

- [ ] Project completion checks from `CLAUDE.md`: secrets scan, inefficiency scan, security pass over the diff, `pnpm jest`, `npx tsc -b`.
- [ ] Fable code review (big feature), read-only and adversarial; fold findings in; re-run tests and `tsc`.
- [ ] Fresh-eyes read of every new and modified file.
- [ ] Hand-off lists what is unverified on a device.
