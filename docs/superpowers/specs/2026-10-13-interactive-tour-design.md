# Design: Interactive tour (spotlight + do-it steps)

**Date:** 2026-10-13
**Status:** Approved in brainstorming; Opus spec review folded in (2026-10-13); awaiting owner review

## Problem

The current tour (`src/components/TourOverlay.tsx`) is a dimmed backdrop with one card pinned
to the bottom of the screen. It never points at the UI it describes, and it cannot teach by
doing.

- Steps are title + description + icon; nothing on screen is highlighted.
- It is rendered inside each screen, so it cannot reach the floating tab bar or the quick-add
  `+` button, which the navigator draws outside the screens.
- Tapping the backdrop marks the tour completed for good, so one stray tap loses it.
- Step content is inline in four screens (`DashboardScreen`, `BusinessesScreen`,
  `BudgetDashboardScreen`, `SettingsScreen`).

## Decisions

| Topic | Decision |
|---|---|
| Teaching style | **Hybrid.** Spotlight (`info`) steps for things to notice; do-it (`action`) steps for the core actions. |
| Structure | One **first-run journey** across Home and Cashbooks, plus short spotlight-only **tip tours** for Budget and Settings on first visit. |
| Existing users | Not interrupted. The journey auto-starts on new installs only; everyone can run it from Settings > Replay Tours. |
| Satisfied do-it steps | A do-it step whose goal is already met (a cashbook exists) is shown as an `info` step instead. |
| Build vs library | **Custom engine**, no new dependencies. Every sheet in the app is a native `Modal`; a library overlay that is itself a `Modal` would swallow the touches the do-it steps need. |
| Inside sheets | No coach marks inside sheets in v1. The overlay steps aside while a sheet is open. |
| Dismissal | Tapping the dim area does nothing. Skip and the Android back button end the tour. |
| Back button | None. Do-it steps cannot be undone, and tip tours are 3 to 4 steps. |
| Cashbooks tour | Removed; the journey covers it. The "transfer on delete" tip is dropped (the delete flow already offers the transfer). |
| Review prompt | Requested when the journey is **finished**, not when it is skipped (same trigger as today). |
| Colours | Theme tokens only (`scrim`, `surfaceContainerLow`, `primary`, ...). No hardcoded colours. |

## Device spike (first task of the plan)

Two claims below come from reading React Native source, not from a device. Before the rest
is built, a throwaway overlay must confirm on an Android device that:

1. A plain root `View` mounted after the navigator draws **above the floating tab bar pill**.
   The pill has elevation (`FloatingTabBar.tsx:70-78`) and its ancestors may be flattened,
   in which case Android orders it above the overlay by elevation. Expected fix: wrap
   `<NavigationContainer>` in `<View style={{ flex: 1 }} collapsable={false}>` so the pill is
   confined to a native parent.
2. A tap inside the hole reaches the real button, and a tap anywhere else does not.

If either fails with the expected fix, stop and revisit the design.

## Architecture

New module `src/features/tour/`:

| File | Purpose |
|---|---|
| `types.ts` | `TourId`, `TourStep`, `TourContext`, `TargetId`, `TabName` |
| `tours.ts` | All tour definitions as data |
| `tourMachine.ts` | Pure functions: which step to show, how it resolves against context |
| `placement.ts` | Pure geometry: tooltip position and arrow offset |
| `tourStore.ts` | Module-level state + subscribe (same pattern as `components/dialog/appAlert.ts`) |
| `tourStorage.ts` | Completion flags (moved from `src/utils/tourStorage.ts`) + migration |
| `targets.ts` | Target registry and `useTourTarget` hook |
| `TourHost.tsx` | Root overlay: measures the target, renders spotlight and tooltip |
| `Spotlight.tsx` | SVG dim layer with cutout, touch blockers, pulse ring |
| `TourTooltip.tsx` | Tooltip card |

`src/components/TourOverlay.tsx` and `src/utils/tourStorage.ts` are deleted, along with the
four inline `<TourOverlay>` usages.

### Types

```ts
type TourId = "journey" | "budget-v2" | "settings";
type TabName = "Dashboard" | "Cashbooks" | "Budget" | "Settings";

interface TourContext {
    cashbookCount: number;
    transactionCount: number;
    activeTab: TabName;
    sheetOpen: boolean;
}

interface TourStep {
    id: string;
    tab: TabName | null;              // tab the target lives on; null = tab bar or no target
    target: TargetId | null;          // null = centred card (welcome step)
    shape?: "rect" | "pill";          // cutout shape, default "rect"
    title: string;
    body: string;
    kind: "info" | "action";
    doneWhen?: (ctx: TourContext, atStepStart: TourContext) => boolean; // action steps
    satisfiedWhen?: (ctx: TourContext) => boolean; // already met at step start -> show as info
    infoBody?: string;                // body used when shown as info because satisfied
    optional?: boolean;               // dropped if its target is not registered
}
```

### State machine (`tourMachine.ts`, pure)

`currentView(tour, stepIndex, ctx, atStepStart, registered)` returns what the host should
show:

- **Tab redirect.** If the step has a `tab` and `ctx.activeTab !== step.tab`, the view is a
  generated `action` step targeting that tab's button ("Tap Books to continue"). It
  completes when the tab becomes active. This is how the journey moves between tabs, and how
  a tour recovers after the lock screen resets navigation to Home.
- **Satisfied.** An `action` step whose `satisfiedWhen(atStepStart)` is true is shown as
  `info` with `infoBody`.
- **Otherwise** the step as defined.

`shouldAdvance(step, ctx, atStepStart)` is true for an `action` step once `doneWhen` holds.
`info` steps advance only on Next.

`nextIndex(tour, stepIndex, registered)` skips `optional` steps whose target is not in the
registry. It is evaluated when the previous step ends, so the host knows at once whether the
step on screen is the last and labels its button **Got it**.

The counter ("2 of 5") is the number of steps already shown plus one, out of that plus the
later steps that are not currently dropped. The total can grow by one mid-tour when an
optional target appears (the first cashbook row exists only once the journey has created a
cashbook). Tab redirects show no counter.

The store snapshots the context when a step starts, so "cashbook created" is
`ctx.cashbookCount > atStepStart.cashbookCount`. Screens never call "advance".

### Store (`tourStore.ts`)

Module-level state `{ tourId, stepIndex, atStepStart } | null`, plus:

- `setContext(patch)`: `MainApp` pushes `cashbookCount`, `transactionCount` and `activeTab`.
  `activeTab` comes from `NavigationContainer` `onReady` and `onStateChange` (not from
  `FloatingTabBar`, which is not rendered while a cashbook detail is open).
- `setSheetOpen(key, open)`: `MainApp` reports `quickAdd`; `BusinessesScreen` reports
  `createCashbook`. Reporters clear their key in an unmount cleanup, so a sheet left open
  when the lock screen unmounts the tree cannot hide the tour forever.
- `requestTour(id)`: a screen asks for its tour when its root view is visible and focused.
  The store starts it when no tour is active, no sheet is open, and the tour is not
  completed; otherwise the request stays pending and is re-evaluated on every context or
  sheet change. Requests are idempotent, and completion flags are cached in memory after the
  first storage read, so a screen that remounts often (`DashboardHome`) can call it freely.
  A screen withdraws its request when its root view is hidden or blurred.
- `startTour(id)`: explicit start (Replay). A no-op while a tour is active.
- `next()`, `skip()`, `finish()`.

Because the state is module-level, an active tour survives `MainApp` swapping the tree for
`LockScreen`. On unlock the navigator remounts on Home; the tab redirect brings the user
back to the step's tab.

Nothing about progress is persisted mid-tour. See Persistence for what happens if the app is
killed during the journey.

### Targets (`targets.ts`)

```ts
const target = useTourTarget("budget-history", scrollRef); // scrollRef optional
<View ref={target.ref} onLayout={target.onLayout} collapsable={false}>
```

- The hook registers `{ ref, scrollRef }` under the id on mount and removes it on unmount.
- `collapsable={false}` keeps the view measurable. Components that do not forward refs
  (`BudgetGauge`, `ScopeChips`, `BudgetHistoryChart`, `AutoLogPromoCard`, the cashbook row)
  get a wrapper `View`; `PaymentCard` uses the hook on its own card view, because the card is
  inset 20 px from the wrapper's edge.
- `FloatingTabBar` registers the four tab buttons (`tab-home`, `tab-books`, `tab-budget`,
  `tab-settings`) and the `+` (`tab-add`).
- `onLayout` tells the host to re-measure.

### Host (`TourHost.tsx`)

Mounted once in `MainApp`, after `<QuickAddModal>`, inside the root `View`: an
absolutely-filled plain `View` (not a `Modal`) with `pointerEvents="box-none"`. It sits above
the tab bar (see Device spike) and below every native sheet and dialog.

For each view to show:

1. If the target has a `scrollRef`, call `measureLayout` against the scroll view and
   `scrollTo({ animated: false })` so the target sits in the visible band between the header
   and the tab bar.
2. Measure the target and the host root with `measureInWindow`; draw at the difference.
3. Re-measure on the target's `onLayout`, once more 500 ms after the step starts (native
   driven entry animations do not report intermediate positions), and on window resize.
4. Until a non-empty rect is known, draw the dim layer with no hole and no tooltip, with all
   touches blocked. If none arrives within 1.5 s, show the step as a centred card with a
   **Next** button, whatever its kind, so the user is never stranded.

The host renders nothing while no tour is active or while `sheetOpen` is true.

Android back: the host registers a `BackHandler` listener while a tour is active that skips
the tour and returns `true`, so Back does not also change tabs.

## Overlay

**Spotlight.** A full-screen `Svg` with an even-odd path: screen rect minus a rounded rect
around the target (8 px padding, radius 16, or a full pill for `shape: "pill"`). Fill is
`theme.colors.scrim` at 0.6 opacity. The SVG has `pointerEvents="none"`. The overlay fades
in and out; the cutout does not glide between steps.

**Touch handling.** Blockers are `Pressable`s with a no-op `onPress` (a bare transparent
`View` blocks nothing).

- `info` steps: one full-screen blocker.
- `action` steps: four blockers around the hole. They are laid out against the target's
  **unpadded** rect, so the 8 px visual padding is not tappable and a tap cannot land on a
  neighbouring tab.

**Pulse.** `action` steps draw a ring around the hole with a native-driven `Animated` loop
and `pointerEvents="none"`. Reduced motion (`useReducedMotion` from
`components/reports/motion.ts`) removes the pulse and the fades.

**Tooltip.** A card (`surfaceContainerLow`, `shape.extraLarge`, `elevation.level3`) holding
the title, body, counter, Skip, and a primary button:

- `info`: **Next**, or **Got it** on the last step.
- `action`: no primary button; a hint line ("Tap the highlighted button") instead.
- `action` with a screen reader on, or after the 1.5 s fallback: **Next** as well.

**Placement (`placement.ts`).** `placeTooltip({ target, tooltip, screen, insets })` returns
`{ top, left, arrowX, side }`:

- Prefer below the target; flip above when there is not enough room below.
- When it fits on neither side (the budget gauge on a small phone), overlap the lower part of
  the target: pin the card's bottom edge 12 px above the tab bar, `side: "over"`, no arrow.
- Clamp horizontally to 16 px margins; keep the arrow pointed at the target centre, clamped
  inside the card's rounded corners.
- With no target, centre the card and omit the arrow.

**Accessibility.** The tooltip is announced with `AccessibilityInfo.announceForAccessibility`
on each step. The host sets `accessibilityViewIsModal`. On `info` steps the navigator wrapper
gets `importantForAccessibility="no-hide-descendants"`, so TalkBack cannot activate the
blocked UI; on `action` steps the app stays reachable and the tooltip offers **Next**.

## Tours

### Journey (`journey`)

Requested by `DashboardHome` (the Home root view, not a cashbook detail or the review queue)
600 ms after it is shown and focused.

| # | Tab | Target | Kind | Title / body | Advances when |
|---|---|---|---|---|---|
| 1 | none | none | info | Welcome / "Take a one-minute tour of the basics." | Next |
| 2 | Cashbooks | `cashbooks-new` (pill) | action | Create your first cashbook / "Each cashbook tracks one business or account. Tap + and give yours a name." | cashbook count increases |
| 3 | none | `tab-add` (pill) | action | Add a transaction / "Tap + to log money in or out from anywhere in the app." | transaction count increases |
| 4 | Dashboard | `home-balance` | info | Your balance / "Income, expenses and what is left, for each currency you use." | Next |
| 5 | Dashboard | `home-autolog` | info, optional | Automatic logging / "The app can read bank and MoMo SMS on this phone and log them for you." | Next |
| 6 | Dashboard | `home-cashbook-row` | info | Your cashbooks / "Tap a cashbook to see and edit its transactions." | Got it |

- The user reaches Cashbooks (before step 2) and returns Home (before step 4) through tab
  redirects, tapping the real tab buttons.
- Step 2 always targets the Cashbooks FAB, which renders in the empty state too
  (`BusinessesScreen.tsx:509-515`). `satisfiedWhen: cashbookCount > 0`, `infoBody` "Tap +
  here to add another cashbook."
- Step 3 `satisfiedWhen: transactionCount > 0`, `infoBody` "Tap + any time to log money in or
  out." The count can also rise from an auto-log drain during a replay; the step then
  advances on its own, which is acceptable.
- Step 5 needs no platform check: the promo card renders only on Android, and only until it
  is dismissed or auto-logging is on. It comes before step 6 so the Home list scrolls in one
  direction.
- Steps 5 and 6 scroll into view; the Home `ScrollView` gets a ref.
- `home-cashbook-row` is the first row of the list.

### Budget tips (`budget-v2`)

Requested by `BudgetDashboardScreen` while it is focused and the gauge is on screen. The
gauge renders only for a budget with a total limit (`view.limit !== null`), so the tips do
not show on the "No cashbooks" or "No budget" empty states, or for a budget with category
limits only.

1. `budget-gauge`: "The speedometer shows how much of your limit is gone. The small tick
   marks where even spending would put you today."
2. `budget-scope` (optional): "Budget a single cashbook, or all of them together."
3. `budget-history` (scrolls into view): "Use the arrows, or tap a bar in the history chart,
   to see how earlier periods went."

### Settings tips (`settings`)

Requested by `SettingsScreen` while it is focused **and showing its root view** (none of the
`show*` sub-screen flags set), so arriving through the auto-log promo link does not start it
until the user backs out to the root.

1. `settings-profile` 2. `settings-general` 3. `settings-features` 4. `settings-data`
   (text carried over from today's four steps; 3 and 4 scroll into view).

## Persistence and migration

- Storage key stays `@tour_completed` (a `Record<string, boolean>`).
- `budget-v2` and `settings` keep their ids, so anyone who already saw those is not shown
  them again. The legacy `cashbooks` and `budget` flags are ignored.
- Skip and finish both write the flag.
- Reads and writes both tolerate unreadable JSON (today only the read path does).

**Who gets the journey automatically.** When the journey is first requested after launch:

1. `journey` or the legacy `dashboard` flag is set: completed, never auto-starts.
2. Neither is set and `cashbookCount > 0`: treated as an existing user. Write the `journey`
   flag and do not start. This covers existing users whose legacy flag is missing (they used
   Replay Tours, or updated from a build that predates the old tour).
3. Neither is set and there are no cashbooks: a new install. Start the journey.

Known trade-off of rule 2: a new user who quits the app mid-journey after creating a cashbook
is not shown the rest on next launch. They can run it from Replay Tours.

**Replay Tours** (Settings > About): awaits clearing `@tour_completed`, navigates to Home and
calls `startTour("journey")`, which bypasses rule 2. The "Tours Reset" alert is removed.
Budget and Settings tips show again on the next visit to those tabs.

## Edge cases

| Case | Behaviour |
|---|---|
| App locks mid-tour | Store keeps the step. After unlock the navigator is back on Home; a tab redirect returns the user to the step's tab |
| Sheet opened then closed without saving | Overlay returns on the same step |
| Create-cashbook sheet open when the app locks | The screen's unmount cleanup clears its sheet key |
| Quick-add opened from a widget deep link before the journey starts | The request stays pending and the journey starts when the sheet closes |
| Quick-add opened from a widget deep link mid-tour | Sheet covers the overlay; counts toward step 3 if a transaction is saved |
| Target not registered | `optional` steps are dropped; others show a centred card with Next after 1.5 s |
| Tooltip fits neither above nor below | Overlaps the lower part of the target |
| `appAlert` dialog (update prompt, budget alert) mid-tour | It is a native `Modal`, so it shows above the overlay; the tour continues underneath |
| Replay tapped while a tour is active | Cannot happen: Settings is blocked during a tour, and `startTour` is a no-op while one is active |
| Android back | Ends the tour, writes the flag, consumes the event |

## Testing

Unit tests first (jest, logic only, matching the existing suite):

- `__tests__/tour/tourMachine.test.ts`: tab redirect when off-tab and none when on-tab; an
  action step shown as info when satisfied; `shouldAdvance` for count conditions;
  `nextIndex` dropping unregistered optional steps, including a trailing one; counter totals.
- `__tests__/tour/tourStore.test.ts`: a pending request starts when a sheet closes;
  `startTour` is a no-op while active; a withdrawn request does not start; skip and finish
  write the flag.
- `__tests__/tour/placement.test.ts`: below by default, flips above near the bottom, overlaps
  when neither fits, horizontal clamping at both edges, arrow clamping, centred with no
  target.
- `__tests__/tour/tourStorage.test.ts`: the three auto-start rules; legacy `dashboard` flag;
  corrupt JSON on read and write; reset.

Not covered by jest: stacking order, measuring, the SVG cutout, touch pass-through and
scroll-into-view. These need a manual pass on an Android device (and iOS when that branch
lands): the device spike, then a fresh-install journey end to end, lock and unlock on each
step with a PIN set, a small-screen phone for the budget gauge, light and dark themes,
reduced motion, and TalkBack.

## Out of scope

- Coach marks inside sheets and forms.
- Tours for Reports, Debts, Recurring and Auto-log settings.
- Persisting mid-tour progress across app restarts.
- A Back button in the tooltip, and a gliding cutout between steps.
- Fixing layout that sizes from `Dimensions` at module load (`FloatingTabBar`,
  `PaymentCard`); rotation is an existing limitation.
