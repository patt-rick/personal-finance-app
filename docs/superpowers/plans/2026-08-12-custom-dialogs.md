# Custom App Dialogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every native `Alert.alert` popup with a custom theme-aware dialog (`appAlert`) that has the exact same call signature.

**Architecture:** A self-contained `src/components/dialog/` module: a pure TS API + FIFO queue (`appAlert.ts`, unit-testable under ts-jest/node), a presentational centered card (`AppDialog.tsx`), and a root-mounted host (`AppDialogHost.tsx`) that renders the active request in its own transparent RN `Modal` so dialogs stack above open bottom sheets. All call sites migrate via import swap + rename.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, lucide-react-native icons, existing M3 theme tokens, jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-08-12-custom-dialogs-design.md`

---

### Task 0: Commit pre-existing working-tree changes

The working tree holds unrelated finished work (widget preview harness, responsive appearance-picker grid, `readableOn` tests, AppModal keyboard tweak). Four of those files are also dialog-migration targets, so commit this work first to keep migration commits clean.

**Files:**
- Commit as-is: `App.tsx`, `__tests__/cashbooks/resolve.test.ts`, `src/components/AppModal.tsx`, `src/components/CashbookAppearancePicker.tsx`, `src/components/CreateCashbookModal.tsx`, `src/features/cashbooks/appearance/resolve.ts`, `src/features/widgets/components/BalanceWidget.tsx`, `src/features/widgets/components/QuickAddWidget.tsx`, `src/screens/BudgetSetupScreen.tsx`, `src/screens/LockScreen.tsx`, `src/screens/PinSetupScreen.tsx`, `src/features/widgets/screens/WidgetPreviewScreen.tsx`, `tsconfig.tsbuildinfo`

- [ ] **Step 0.1: Verify the tree state matches the list above**

Run: `git status --short`
Expected: exactly the files listed (12 modified + 1 untracked).

- [ ] **Step 0.2: Run existing checks so we don't commit a broken baseline**

Run: `npx tsc -b` then `npx jest`
Expected: tsc clean; all suites pass.

- [ ] **Step 0.3: Commit**

```bash
git add -A
git commit -m "feat: widget preview harness, responsive appearance picker grid, and keyboard-behavior polish"
```

---

### Task 1: Dialog API, tone inference, and queue (`appAlert.ts`) — TDD

**Files:**
- Create: `src/components/dialog/appAlert.ts`
- Test: `__tests__/dialogs/appAlert.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `__tests__/dialogs/appAlert.test.ts`:

```ts
import {
    appAlert,
    currentDialog,
    dismissCurrentDialog,
    inferTone,
    normalizeButtons,
    resetDialogsForTest,
    subscribeDialogs,
} from "../../src/components/dialog/appAlert";

beforeEach(() => {
    resetDialogsForTest();
});

describe("normalizeButtons", () => {
    it("defaults to a single OK button when omitted or empty", () => {
        expect(normalizeButtons(undefined)).toEqual([{ text: "OK" }]);
        expect(normalizeButtons([])).toEqual([{ text: "OK" }]);
    });

    it("returns given buttons unchanged", () => {
        const buttons = [{ text: "Cancel", style: "cancel" as const }, { text: "Delete" }];
        expect(normalizeButtons(buttons)).toBe(buttons);
    });
});

describe("inferTone", () => {
    it("is destructive when any button is destructive", () => {
        expect(
            inferTone("Delete Debt", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive" },
            ]),
        ).toBe("destructive");
    });

    it("is destructive for Error/Failed titles", () => {
        expect(inferTone("Error", [{ text: "OK" }])).toBe("destructive");
        expect(inferTone("Import Failed", [{ text: "OK" }])).toBe("destructive");
    });

    it("is success for Success titles", () => {
        expect(inferTone("Success", [{ text: "OK" }])).toBe("success");
    });

    it("is warning for multi-button confirmations", () => {
        expect(
            inferTone("Mark Settled", [{ text: "Cancel", style: "cancel" }, { text: "Settle" }]),
        ).toBe("warning");
    });

    it("falls back to info", () => {
        expect(inferTone("Tours Reset", [{ text: "OK" }])).toBe("info");
    });

    it("explicit tone override wins", () => {
        expect(inferTone("Error", [{ text: "OK" }], "info")).toBe("info");
    });
});

describe("appAlert queue", () => {
    it("shows requests one at a time in FIFO order", () => {
        appAlert("First");
        appAlert("Second");
        expect(currentDialog()?.title).toBe("First");
        dismissCurrentDialog();
        expect(currentDialog()?.title).toBe("Second");
        dismissCurrentDialog();
        expect(currentDialog()).toBeNull();
    });

    it("notifies the subscriber on push and dismiss", () => {
        const seen: (string | null)[] = [];
        subscribeDialogs(() => seen.push(currentDialog()?.title ?? null));
        appAlert("Hello");
        dismissCurrentDialog();
        expect(seen).toEqual([null, "Hello", null]);
    });

    it("builds the request with defaults and options", () => {
        appAlert("Delete Debt", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive" },
        ]);
        const req = currentDialog();
        expect(req?.message).toBe("Are you sure?");
        expect(req?.cancelable).toBe(true);
        expect(req?.tone).toBe("destructive");

        dismissCurrentDialog();
        const onDismiss = jest.fn();
        appAlert("Heads up", undefined, undefined, { cancelable: false, onDismiss, tone: "warning" });
        const req2 = currentDialog();
        expect(req2?.buttons).toEqual([{ text: "OK" }]);
        expect(req2?.cancelable).toBe(false);
        expect(req2?.onDismiss).toBe(onDismiss);
        expect(req2?.tone).toBe("warning");
    });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `npx jest __tests__/dialogs/appAlert.test.ts`
Expected: FAIL — cannot find module `../../src/components/dialog/appAlert`.

- [ ] **Step 1.3: Implement `src/components/dialog/appAlert.ts`**

No react-native imports in this file (tests run in the node environment).

```ts
export type AppAlertTone = "info" | "success" | "warning" | "destructive";

export type AppAlertButton = {
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
};

export type AppAlertOptions = {
    cancelable?: boolean;
    onDismiss?: () => void;
    tone?: AppAlertTone;
};

export type DialogRequest = {
    title: string;
    message?: string;
    buttons: AppAlertButton[];
    cancelable: boolean;
    onDismiss?: () => void;
    tone: AppAlertTone;
};

export function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
    if (!buttons || buttons.length === 0) return [{ text: "OK" }];
    return buttons;
}

export function inferTone(
    title: string,
    buttons: AppAlertButton[],
    override?: AppAlertTone,
): AppAlertTone {
    if (override) return override;
    if (buttons.some((b) => b.style === "destructive")) return "destructive";
    const lower = title.toLowerCase();
    if (lower.startsWith("error") || lower.includes("failed")) return "destructive";
    if (lower.includes("success")) return "success";
    if (buttons.length >= 2) return "warning";
    return "info";
}

type Listener = () => void;

const queue: DialogRequest[] = [];
let listener: Listener | null = null;

export function appAlert(
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
): void {
    const normalized = normalizeButtons(buttons);
    queue.push({
        title,
        message,
        buttons: normalized,
        cancelable: options?.cancelable !== false,
        onDismiss: options?.onDismiss,
        tone: inferTone(title, normalized, options?.tone),
    });
    listener?.();
}

export function subscribeDialogs(next: Listener): () => void {
    listener = next;
    next();
    return () => {
        if (listener === next) listener = null;
    };
}

export function currentDialog(): DialogRequest | null {
    return queue[0] ?? null;
}

export function dismissCurrentDialog(): void {
    queue.shift();
    listener?.();
}

export function resetDialogsForTest(): void {
    queue.length = 0;
    listener = null;
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `npx jest __tests__/dialogs/appAlert.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 1.5: Commit**

```bash
git add src/components/dialog/appAlert.ts __tests__/dialogs/appAlert.test.ts
git commit -m "feat: appAlert dialog API with tone inference and FIFO queue"
```

---

### Task 2: Dialog card, host, and root mount

Visual components — no unit tests (repo tests pure logic only; jest env is node).

**Files:**
- Create: `src/components/dialog/AppDialog.tsx`
- Create: `src/components/dialog/AppDialogHost.tsx`
- Create: `src/components/dialog/index.ts`
- Modify: `App.tsx` (root return, ~line 80)

- [ ] **Step 2.1: Create `src/components/dialog/AppDialog.tsx`**

Tone → token mapping: destructive `errorContainer`/`onErrorContainer`, warning `goldContainer`/`onGoldContainer`, success `incomeContainer`/`onIncomeContainer`, info `primaryContainer`/`onPrimaryContainer`. Filled action button: `error`/`onError` when destructive, else `primary`/`onPrimary`. Cancel buttons are text buttons. 3+ buttons stack vertically.

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { TriangleAlert, CircleCheck, Info } from "lucide-react-native";
import { useTheme, AppTheme } from "../../theme/theme";
import type { AppAlertButton, AppAlertTone } from "./appAlert";

const TONE_ICONS = {
    destructive: TriangleAlert,
    warning: TriangleAlert,
    success: CircleCheck,
    info: Info,
} as const;

interface AppDialogProps {
    tone: AppAlertTone;
    title: string;
    message?: string;
    buttons: AppAlertButton[];
    onButtonPress: (button: AppAlertButton) => void;
}

export default function AppDialog({ tone, title, message, buttons, onButtonPress }: AppDialogProps) {
    const theme = useTheme();
    const s = React.useMemo(() => createStyles(theme), [theme]);

    const toneColors = {
        destructive: { circle: theme.colors.errorContainer, icon: theme.colors.onErrorContainer },
        warning: { circle: theme.colors.goldContainer, icon: theme.colors.onGoldContainer },
        success: { circle: theme.colors.incomeContainer, icon: theme.colors.onIncomeContainer },
        info: { circle: theme.colors.primaryContainer, icon: theme.colors.onPrimaryContainer },
    }[tone];
    const ToneIcon = TONE_ICONS[tone];
    const stacked = buttons.length >= 3;

    const renderButton = (button: AppAlertButton, index: number) => {
        const isCancel = button.style === "cancel";
        const isDestructive = button.style === "destructive";
        if (isCancel) {
            return (
                <TouchableOpacity
                    key={index}
                    onPress={() => onButtonPress(button)}
                    style={[s.textButton, stacked && s.stackedButton]}
                    accessibilityRole="button"
                >
                    <Text style={s.textButtonLabel}>{button.text}</Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity
                key={index}
                onPress={() => onButtonPress(button)}
                style={[
                    s.filledButton,
                    { backgroundColor: isDestructive ? theme.colors.error : theme.colors.primary },
                    stacked && s.stackedButton,
                ]}
                accessibilityRole="button"
            >
                <Text
                    style={[
                        s.filledButtonLabel,
                        { color: isDestructive ? theme.colors.onError : theme.colors.onPrimary },
                    ]}
                >
                    {button.text}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={s.card}>
            <View style={[s.iconCircle, { backgroundColor: toneColors.circle }]}>
                <ToneIcon size={26} color={toneColors.icon} />
            </View>
            <Text style={s.title}>{title}</Text>
            {!!message && <Text style={s.message}>{message}</Text>}
            <View style={stacked ? s.buttonColumn : s.buttonRow}>{buttons.map(renderButton)}</View>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        card: {
            borderRadius: theme.shape.largeIncreased,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
            alignItems: "center",
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
        iconCircle: {
            width: 52,
            height: 52,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        title: {
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            textAlign: "center",
            marginBottom: 8,
        },
        message: {
            fontSize: 14,
            lineHeight: 20,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            marginBottom: 4,
        },
        buttonRow: {
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            alignSelf: "stretch",
            gap: 10,
            marginTop: 16,
        },
        buttonColumn: {
            alignSelf: "stretch",
            gap: 8,
            marginTop: 16,
        },
        stackedButton: {
            alignSelf: "stretch",
            alignItems: "center",
        },
        filledButton: {
            borderRadius: theme.shape.full,
            paddingHorizontal: 22,
            paddingVertical: 11,
            alignItems: "center",
        },
        filledButtonLabel: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
        },
        textButton: {
            paddingHorizontal: 14,
            paddingVertical: 11,
        },
        textButtonLabel: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
        },
    });
```

- [ ] **Step 2.2: Create `src/components/dialog/AppDialogHost.tsx`**

Backdrop matches `AppModal`'s scrim (`rgba(0,0,0,0.4)`). Back button / backdrop tap when `cancelable`: dismiss, fire the cancel button's `onPress`, then `onDismiss`. Button press: dismiss, then that button's `onPress`.

```tsx
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import AppDialog from "./AppDialog";
import {
    AppAlertButton,
    DialogRequest,
    currentDialog,
    dismissCurrentDialog,
    subscribeDialogs,
} from "./appAlert";

export default function AppDialogHost() {
    const [request, setRequest] = React.useState<DialogRequest | null>(null);

    React.useEffect(() => subscribeDialogs(() => setRequest(currentDialog())), []);

    if (!request) return null;

    const handleButtonPress = (button: AppAlertButton) => {
        dismissCurrentDialog();
        button.onPress?.();
    };

    const handleCancelDismiss = () => {
        if (!request.cancelable) return;
        dismissCurrentDialog();
        request.buttons.find((b) => b.style === "cancel")?.onPress?.();
        request.onDismiss?.();
    };

    return (
        <Modal
            visible
            transparent
            statusBarTranslucent
            animationType="fade"
            onRequestClose={handleCancelDismiss}
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleCancelDismiss} />
                <AppDialog
                    tone={request.tone}
                    title={request.title}
                    message={request.message}
                    buttons={request.buttons}
                    onButtonPress={handleButtonPress}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 32,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
});
```

- [ ] **Step 2.3: Create `src/components/dialog/index.ts`**

```ts
export { appAlert } from "./appAlert";
export type { AppAlertButton, AppAlertOptions, AppAlertTone } from "./appAlert";
export { default as AppDialogHost } from "./AppDialogHost";
```

- [ ] **Step 2.4: Mount the host in `App.tsx`**

The host must be a sibling of `MainApp` inside `ThemeProvider` (NOT inside `MainApp`'s main return) so dialogs also cover the `SplashScreen`/`LockScreen` early returns.

```tsx
import { AppDialogHost } from "./src/components/dialog";
// ...
return (
    <ThemeProvider>
        <MainApp />
        <AppDialogHost />
    </ThemeProvider>
);
```

- [ ] **Step 2.5: Typecheck**

Run: `npx tsc -b`
Expected: clean.

- [ ] **Step 2.6: Commit**

```bash
git add src/components/dialog/ App.tsx
git commit -m "feat: custom dialog card and root-mounted host"
```

---

### Task 3: Migrate all Alert.alert call sites

**Files (18 — every current `Alert.alert` caller):**
- Modify: `App.tsx` (1 call — "Update Available")
- Modify: `src/screens/SettingsScreen.tsx` (7)
- Modify: `src/screens/BusinessDetailView.tsx` (6)
- Modify: `src/screens/BudgetSetupScreen.tsx` (4)
- Modify: `src/screens/DebtTrackerScreen.tsx` (3)
- Modify: `src/features/autoLogging/screens/AutoLogSettingsScreen.tsx` (3)
- Modify: `src/screens/BusinessesScreen.tsx` (2)
- Modify: `src/screens/CategoryManagementScreen.tsx` (2)
- Modify: `src/components/DebtEntryModal.tsx` (2)
- Modify: `src/components/DebtPaymentModal.tsx` (2)
- Modify: `src/components/RecurringTransactionModal.tsx` (2)
- Modify: `src/screens/SecuritySettingsScreen.tsx` (1)
- Modify: `src/screens/RecurringTransactionsScreen.tsx` (1)
- Modify: `src/screens/LockScreen.tsx` (1)
- Modify: `src/components/TransactionEntryModal.tsx` (1)
- Modify: `src/components/CreateCashbookModal.tsx` (1)
- Modify: `src/features/autoLogging/screens/AutoLogOnboardingScreen.tsx` (1)
- Modify: `src/features/autoLogging/services/permissions/android.ts` (1)

- [ ] **Step 3.1: Apply the mechanical migration to every file**

In each file:

1. Replace every `Alert.alert(` with `appAlert(` — argument lists are compatible, change nothing else.
2. Add the import (adjust relative depth per file):
   - from `src/screens/*` and `src/components/*`: `import { appAlert } from "../components/dialog";` / `import { appAlert } from "./dialog";`
   - from `App.tsx`: `import { appAlert } from "./src/components/dialog";`
   - from `src/features/autoLogging/screens/*`: `import { appAlert } from "../../../components/dialog";`
   - from `src/features/autoLogging/services/permissions/android.ts`: `import { appAlert } from "../../../../components/dialog";`
3. Remove `Alert` from the `react-native` import if nothing else in the file uses it (keep it if `Alert.prompt` or other `Alert` members remain — none are expected).

- [ ] **Step 3.2: Grep gate — no native alerts remain**

Run: `npx tsc -b` (catches leftover unused imports only if noUnusedLocals; rely on grep for usage)
Run (Grep tool or): `git grep -n "Alert.alert" -- "*.ts" "*.tsx"`
Expected: zero matches in `App.tsx` and `src/` (matches inside `docs/` are fine).

Also: `git grep -n "from \"react-native\"" App.tsx src | findstr /C:"Alert"`
Expected: no file still imports `Alert` (unless it genuinely uses another `Alert` member).

- [ ] **Step 3.3: Full verification**

Run: `npx tsc -b`
Expected: clean.
Run: `npx jest`
Expected: all suites pass.

- [ ] **Step 3.4: Commit**

```bash
git add -A
git commit -m "feat: replace native Alert.alert with custom appAlert dialogs app-wide"
```

---

### Task 4: Final review pass (CLAUDE.md gates)

- [ ] **Step 4.1: Security/quality scan of the new code**

Re-read the full diff (`git diff main...HEAD -- src/components/dialog __tests__/dialogs`): no hardcoded secrets; no user input flows into anything dangerous (dialog text is rendered via `<Text>` — no injection surface); no hardcoded colors beyond the scrim that matches `AppModal`'s existing literal.

- [ ] **Step 4.2: Fresh-eyes bug hunt**

Re-read `appAlert.ts`, `AppDialog.tsx`, `AppDialogHost.tsx`, and the migration diff hunks looking for: stale `Alert` imports, wrong relative import depths, call sites that passed `Alert.alert`-only options, the LockScreen `[{ text: "OK", onPress: onBack }]` case (single non-cancel button — back/backdrop dismiss fires no onPress, but pressing OK must fire `onBack`), and the `cancelable: false` path. Fix anything found.

- [ ] **Step 4.3: Re-run full checks after any fixes**

Run: `npx tsc -b` and `npx jest`
Expected: clean + all pass. Commit any fixes with a `fix:` message.
