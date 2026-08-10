# Cashbook Appearance: Color + Icon (with Widget Reuse)

**Date:** 2026-08-10
**Status:** Approved — ready for implementation plan
**Branch:** `feat/android-widgets` (continues the widgets work)

## Goal

Give each cashbook (`Business`) a **color** and an **icon** for quick visual
identification, and reuse that styling in the three Android home-screen widgets
so a pinned cashbook is recognizable at a glance. Cashbooks currently render as
plain text (name only) in the app and widgets, which looks bland and makes
same-named or many-cashbook setups hard to tell apart.

## Decisions (locked during brainstorming)

- **Icon representation:** a curated **line-icon set** consistent with the app's
  existing Lucide aesthetic. The same icon renders in the widget via the library's
  `SvgWidget` (raw SVG string) — **not** a Material icon-font mapping. One icon
  source (Lucide), identical in app and widget, no icon-font bundling.
- **Color selection:** a **curated palette** (~12 swatches), not a freeform picker —
  guarantees legible contrast on light/dark app surfaces and on the widget.
- **Defaults:** **auto-assign, editable.** Every cashbook (including all existing
  ones) resolves to a deterministic color + a default icon at read time; the user
  can change either anytime. No forced step at creation, never bland.
- **Surfaces:** **widgets + cashbook management** — widgets, create modal, edit
  sheet, cashbook list row, detail-sheet header. The dashboard filter chip
  (`BusinessChip`) is intentionally left unchanged.
- **Default icon:** a single `wallet` for all unstyled cashbooks (the auto color
  already differentiates them).

## Constraints discovered in the codebase

- The app renders icons with `lucide-react-native@^0.562.0` (SVG React components).
  The **widget cannot render Lucide** — its headless renderer
  (`react-native-android-widget@0.22.0`) exposes only `FlexWidget` / `TextWidget` /
  `SvgWidget` / `ImageWidget` / `IconWidget`, with colors typed as `` `#${string}` ``
  (`HexColor`).
- `SvgWidget` accepts a raw SVG **string**; Lucide icons are simple stroked SVGs, so
  the widget can render the exact Lucide glyph by injecting the accent color as the
  `stroke` (Lucide markup uses `stroke="currentColor"`, which won't resolve in the
  widget, so it must be replaced with an explicit hex).
- `Business` (`src/types.ts`) has `id, name, createdAt, currency?` and no styling.
  `Category` already carries `icon?`/`color?`, establishing precedent.
- Widget views are plain objects (`BalanceView`, `BudgetView`) built from a
  `Business` in `src/features/widgets/services/widgetData.ts`, so adding styling is
  additive.
- Widgets already refresh on cashbook changes: saving businesses calls
  `refreshCashbookWidgets()`, so editing color/icon re-renders widgets with no new
  plumbing.

## Data model

Extend `Business` with two **optional** fields (backward-compatible, no migration):

```ts
export interface Business {
  // …existing…
  color?: string; // hex, e.g. "#4CAF50"
  icon?: string;  // icon key, e.g. "shopping-cart"
}
```

Unstyled cashbooks are resolved at read time — never persisted as bland.

## Shared appearance module

New home: `src/features/cashbooks/appearance/`. Single source of truth imported by
both the app and the headless widget path. Kept in small focused files:

- `palette.ts` — `CASHBOOK_COLORS: HexColor[]` (~12 curated colors, legible on light
  and dark surfaces).
- `icons.data.ts` — the curated icon set as `{ key, label, svg }[]` with **raw SVG
  markup and no React import**, so the widget bundle does not pull in Lucide. SVG
  strings are copied from Lucide 0.562 so they exactly match the app components.
- `icons.tsx` — `key → Lucide component` map for app rendering.
- `resolve.ts` — pure helpers:
  - `resolveCashbookColor(business): HexColor` — `business.color` if set, else a
    deterministic palette pick hashed from `business.id` (stable per cashbook).
  - `resolveCashbookIconKey(business): string` — `business.icon` if set, else
    `"wallet"`.
  - `cashbookIconSvg(iconKey, hex): string` — the icon's SVG with `stroke` set to
    `hex` for `SvgWidget`.
  - Lookup fallbacks: an unknown stored `icon`/`color` (e.g. removed from the set)
    falls back to the default icon / deterministic color rather than crashing.

Icon set (initial ~14, all present in Lucide): `wallet`, `shopping-cart`, `home`,
`briefcase`, `car`, `utensils`, `plane`, `heart`, `gift`, `graduation-cap`,
`piggy-bank`, `building-2`, `smartphone`, `dumbbell`. Final list finalized in the plan.

## Reusable picker (app UI)

`CashbookAppearancePicker` — a color swatch grid + icon grid + a small live preview
of the resolved badge. Used by **both** `CreateCashbookModal` and
`CashbookDetailSheet`'s edit mode (DRY, consistent). Built with the frontend-design
skill; uses theme tokens only (no hardcoded colors beyond the defined palette).

## Create / edit wiring

- `CreateCashbookModal`: `onSubmit(name, currency, color, iconKey)`;
  `handleCreateCashbook` in `BusinessesScreen` stores `color`/`icon` on the new
  `Business`.
- `CashbookDetailSheet`: edit mode gains the picker; saved via a new focused
  `onUpdateAppearance(businessId, color, iconKey)` callback wired in
  `BusinessesScreen`. Existing `onRename` / `onUpdateCurrency` are untouched.

## App display surfaces

- `BusinessItem` (list row): a rounded icon badge (accent-tinted background +
  accent-stroke Lucide icon) before the name.
- `CashbookDetailSheet` header: the same icon badge next to the title.
- Create modal + edit sheet: the picker with preview.
- `BusinessChip`: **unchanged.**

## Widget rendering

- `BalanceView`, `BudgetView`, and the quick-add view gain `accent: HexColor` and
  `iconSvg: string`; builders in `widgetData.ts` call the resolvers.
- Components (`BalanceWidget`, `BudgetWidget`, `QuickAddWidget`) render an
  `SvgWidget` icon badge in the accent color alongside the cashbook name.
- **The budget progress bar keeps its usage-based colors** (green/amber/red via
  `budgetBarColor`) so the over-budget signal is never overridden by the accent.
  Accent is used only for the icon + name area.
- The render dispatch is shared across `widgetTaskHandler.tsx`,
  `services/widgetSync.ts`, and `screens/WidgetConfigScreen.tsx`; all three flow the
  new fields through the same builders/components automatically. (This is the
  previously-tracked duplication; keep the three consistent — extraction remains an
  optional follow-up, not required here.)

## Refresh

No new plumbing. `saveBusinesses` → `refreshCashbookWidgets()` already re-renders all
widgets when a cashbook's color/icon changes.

## Testing

- Pure unit tests for `resolve.ts`: deterministic color from `id`, default icon
  fallback, unknown-key fallback, and `cashbookIconSvg` stroke injection.
- View-builder tests assert `BalanceView`/`BudgetView`/quick-add carry correct
  `accent` + `iconSvg`.
- Registry integrity test: unique icon keys, every key resolvable to both a Lucide
  component and an SVG string, palette entries are valid hex.
- No new e2e — this is frontend + pure functions. Avoid redundant tests.

## Out of scope

- Freeform/custom color picker.
- Restyling the dashboard `BusinessChip` or other non-management surfaces.
- Per-cashbook custom images/photos.
- Refactoring the widget render dispatch (tracked follow-up only).

## Backward compatibility

Both new fields are optional; existing persisted `Business` objects load unchanged
and are auto-styled deterministically. No data migration.
