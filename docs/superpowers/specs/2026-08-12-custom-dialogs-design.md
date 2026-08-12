# Custom App Dialogs (replace native Alert.alert)

**Date:** 2026-08-12
**Status:** Approved design

## Goal

Replace every native `Alert.alert` popup (40 call sites across 17 files) with a
custom, theme-aware dialog that matches the app's Material 3 design language.
One consistent look for error notices, success messages, and confirmations.

## Decisions (user-approved)

- **Scope:** all 40 `Alert.alert` calls — notices and confirmations alike.
- **API:** drop-in global function `appAlert(...)` with the exact `Alert.alert`
  signature, so migration is an import swap + rename. No hook, no per-screen state.
- **Visual:** centered card with a tinted tone-icon circle, semibold title,
  muted message, text-button cancel + filled action button.

## Module layout

New self-contained module `src/components/dialog/`:

| File | Responsibility |
| --- | --- |
| `AppDialog.tsx` | Presentational centered card (icon, title, message, buttons). |
| `appAlert.ts` | Public API + module-level request queue/emitter. Pure logic (button normalization, tone inference) lives here or in a sibling `logic.ts` so it is unit-testable without rendering. |
| `AppDialogHost.tsx` | Mounted once at the app root. Subscribes to the queue, renders the current request in its own transparent RN `Modal`. |
| `index.ts` | Re-exports `appAlert` and `AppDialogHost`. |

## API

```ts
type AppAlertButton = {
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
};

type AppAlertOptions = {
    cancelable?: boolean;      // default true; false disables backdrop/back dismiss
    onDismiss?: () => void;
    tone?: "info" | "success" | "warning" | "destructive"; // optional override
};

function appAlert(
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
): void;
```

Same shape as `Alert.alert` plus the optional `tone` override. Callable from
non-component modules (e.g. `src/features/autoLogging/services/permissions/android.ts`).

## Host behavior

- `AppDialogHost` is rendered at the root of `App.tsx`, above everything
  including `LockScreen`.
- It renders the active dialog inside its own transparent RN `Modal`
  (`animationType="fade"`, `statusBarTranslucent`). Because RN stacks a
  later-presented Modal above an already-open one on Android, dialogs fired
  from inside open bottom sheets (`TransactionEntryModal`, `DebtEntryModal`,
  `RecurringTransactionModal`, …) appear on top, as the native Alert did.
- **Queueing:** requests go into a FIFO queue; one dialog shows at a time; the
  next shows after the current one is dismissed (native behavior parity).
- **Dismissal:** Android back button and backdrop tap dismiss the dialog,
  firing the `cancel`-style button's `onPress` if present, then
  `options.onDismiss`. `cancelable: false` disables both. Pressing any button
  closes the dialog, then runs that button's `onPress`.
- **Button defaults:** omitted/empty `buttons` → a single "OK" button.

## Tone inference

The `Alert.alert` signature carries no tone, so the host infers one
(overridable via `options.tone`), checked in this order:

1. Any button with `style: "destructive"` → **destructive** (red).
2. Title starts with "Error" or contains "Failed"/"failed" → **destructive** (red).
3. Title starts with/contains "Success" → **success** (green).
4. Two or more buttons (a confirmation) → **warning** (amber).
5. Otherwise → **info** (blue/primary).

Icon per tone (lucide): destructive `TriangleAlert`, warning `TriangleAlert`,
success `CircleCheck`, info `Info`.

Colors come exclusively from theme tokens — `error`/`errorContainer`,
`tertiary`/`tertiaryContainer`, `primary`/`primaryContainer` and their `on*`
pairs. No hardcoded hex values.

## Visual spec

Centered card, same surface language as `AppModal`'s `center` variant:
`surfaceContainerLow` background, `theme.shape.largeIncreased` radius,
elevation level3, `rgba` backdrop identical to `AppModal`'s. Layout top-down:

1. Tinted icon circle (tone container color, `on*Container` icon), centered.
2. Title — semibold theme font, `onSurface`, centered.
3. Message — regular, `onSurfaceVariant`, centered.
4. Button row — cancel-style buttons as text buttons (`onSurfaceVariant`),
   the primary action as a filled pill (`primary` fill, `error` fill when
   destructive). 3+ buttons stack vertically full-width.

## Migration

- Mount `<AppDialogHost />` once in `App.tsx`.
- In all 17 files: replace `Alert.alert(` with `appAlert(`, add the import,
  drop the now-unused `Alert` import. No call-site argument changes needed.
- Files: SettingsScreen, SecuritySettingsScreen, BusinessDetailView,
  BusinessesScreen, BudgetSetupScreen, CategoryManagementScreen,
  DebtTrackerScreen, RecurringTransactionsScreen, LockScreen,
  TransactionEntryModal, DebtEntryModal, DebtPaymentModal,
  RecurringTransactionModal, CreateCashbookModal,
  autoLogging/AutoLogSettingsScreen, autoLogging/AutoLogOnboardingScreen,
  autoLogging/services/permissions/android.ts.
- After migration, no `Alert.alert` usage remains in `src/` (a grep gate in
  the plan verifies this).

## Known limitation

Stacking a second RN `Modal` above an open sibling `Modal` is reliable on
Android but flaky on iOS. The app ships Android-only today, so this is
accepted. If iOS ships later, the host can gain a context escape hatch to
render inside the top-most modal instead.

## Testing

Jest unit tests for the pure logic only (consistent with repo test style —
no visual snapshot tests):

- Tone inference: destructive button, "Error"/"Failed" titles, "Success"
  titles, multi-button warning, info fallback, explicit `tone` override.
- Button normalization: default OK when omitted; cancel-button detection.
- Queue: FIFO ordering; second request shows only after first dismissed.
- Dismissal semantics: backdrop/back fires cancel `onPress` + `onDismiss`;
  `cancelable: false` blocks it.
