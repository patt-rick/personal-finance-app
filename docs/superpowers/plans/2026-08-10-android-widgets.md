# Android Home-Screen Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three Android home-screen widgets (balance glance, budget progress, quick-add), each pinned to a chosen cashbook, using `react-native-android-widget`.

**Architecture:** Widgets render in a headless JS task that reuses the app's AsyncStorage layer (`src/utils/storage.ts`) and money math (`src/utils/budgetCalculations.ts`). Display logic is factored into pure functions (data-in → view-out) for mock-free tests; the task handler and app mutation points drive refreshes. Quick-add deep-links into the existing `QuickAddModal`.

**Tech Stack:** Expo SDK 54, RN 0.81, React 19, TypeScript, `react-native-android-widget` v0.22.x, Jest + ts-jest, npm (per project decision).

**Spec:** `docs/superpowers/specs/2026-08-10-android-widgets-design.md`

**Conventions observed:**
- Tests live in `__tests__/**/*.test.ts`, ts-jest, `testEnvironment: node`.
- Prefer pure functions taking data as args (see `__tests__/autoLogging/saveDraft.test.ts`); mock `@react-native-async-storage/async-storage` or `src/utils/storage` only when needed (see `__tests__/autoLogging/drain.test.ts`).
- Never hardcode colors — resolve from `theme.ts` tokens.
- Commit messages: no Claude co-author.
- Run tests: `npx jest <path>`; types: `npx tsc -b`.

---

## File Structure

**New files:**
- `index.js` — new app entry (registers app + widget task handler + config screen).
- `src/utils/cashbookBalance.ts` — `computeCashbookBalance`, `computeMonthFlows` (pure).
- `src/features/widgets/constants.ts` — widget names, storage key.
- `src/features/widgets/services/widgetConfig.ts` — `widgetId → businessId` map (AsyncStorage).
- `src/features/widgets/services/widgetData.ts` — `buildBalanceView`, `buildBudgetView` (pure).
- `src/features/widgets/services/deepLink.ts` — `parseQuickAddLink` (pure).
- `src/features/widgets/services/widgetSync.ts` — `refreshCashbookWidgets` (Android-guarded).
- `src/features/widgets/theme/widgetTheme.ts` — resolve theme colors for widgets.
- `src/features/widgets/components/BalanceWidget.tsx`
- `src/features/widgets/components/BudgetWidget.tsx`
- `src/features/widgets/components/QuickAddWidget.tsx`
- `src/features/widgets/components/WidgetStates.tsx`
- `src/features/widgets/screens/WidgetConfigScreen.tsx`
- `src/features/widgets/widgetTaskHandler.tsx`
- Tests: `__tests__/widgets/cashbookBalance.test.ts`, `widgetConfig.test.ts`, `widgetData.test.ts`, `deepLink.test.ts`.

**Modified files:**
- `package.json` — `main` → `index.js`; add dependency.
- `app.json` — add `react-native-android-widget` plugin config.
- `App.tsx` — call `refreshCashbookWidgets` in save handlers; handle quick-add deep link.
- `src/components/QuickAddModal.tsx` — add optional `initialBusinessId` prop.
- Budget save site (`src/screens/BudgetSetupScreen.tsx`) — refresh widgets after save.

---

## Task 1: Add dependency and Expo plugin config

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Install the library (npm, per project decision)**

Run:
```bash
npm install react-native-android-widget
```
Expected: `react-native-android-widget` appears in `package.json` `dependencies`; `package-lock.json` updated.

- [ ] **Step 2: Register the config plugin in `app.json`**

In `app.json`, replace the `plugins` array with the following (adds the widget plugin; keeps existing plugins):

```json
    "plugins": [
      "@react-native-community/datetimepicker",
      "expo-notifications",
      "expo-secure-store",
      "expo-font",
      [
        "react-native-android-widget",
        {
          "widgets": [
            {
              "name": "BalanceWidget",
              "label": "Cashbook Balance",
              "minWidth": "110dp",
              "minHeight": "40dp",
              "targetCellWidth": 2,
              "targetCellHeight": 1,
              "description": "Balance for a chosen cashbook",
              "previewImage": "./src/icon.png",
              "resizeMode": "horizontal|vertical",
              "widgetFeatures": "reconfigurable"
            },
            {
              "name": "BudgetWidget",
              "label": "Budget Progress",
              "minWidth": "180dp",
              "minHeight": "110dp",
              "targetCellWidth": 3,
              "targetCellHeight": 2,
              "description": "Budget usage for a chosen cashbook",
              "previewImage": "./src/icon.png",
              "resizeMode": "horizontal|vertical",
              "widgetFeatures": "reconfigurable"
            },
            {
              "name": "QuickAddWidget",
              "label": "Quick Add Expense",
              "minWidth": "110dp",
              "minHeight": "40dp",
              "targetCellWidth": 2,
              "targetCellHeight": 1,
              "description": "Tap to log an expense",
              "previewImage": "./src/icon.png",
              "resizeMode": "horizontal|vertical",
              "widgetFeatures": "reconfigurable"
            }
          ]
        }
      ]
    ],
```

> Note: `previewImage` reuses `./src/icon.png` as a placeholder; designed preview PNGs are a follow-up (spec §14.5).

- [ ] **Step 3: Verify config is valid JSON / Expo config loads**

Run:
```bash
npx expo config --type public
```
Expected: prints resolved config with no error; the `react-native-android-widget` plugin is listed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add react-native-android-widget dependency and plugin config"
```

---

## Task 2: Switch entry point to local index.js

**Files:**
- Create: `index.js`
- Modify: `package.json:4` (`main` field)

- [ ] **Step 1: Create `index.js` (app registration only, for now)**

Create `index.js` at repo root:

```js
import { registerRootComponent } from "expo";
import App from "./App";

// Widget registration is added in a later task (registerWidgetTaskHandler /
// registerWidgetConfigurationScreen). Keeping app registration isolated here
// mirrors what expo/AppEntry.js does.
registerRootComponent(App);
```

- [ ] **Step 2: Point `package.json` `main` at the new entry**

In `package.json`, change:
```json
  "main": "node_modules/expo/AppEntry.js",
```
to:
```json
  "main": "index.js",
```

- [ ] **Step 3: Verify the bundler resolves the new entry**

Run:
```bash
npx expo config --type public
```
Expected: no error. (Full runtime verification happens at the device build in Task 13.)

- [ ] **Step 4: Run existing test suite to confirm nothing broke**

Run:
```bash
npx jest
```
Expected: all existing tests pass (entry change does not affect Jest).

- [ ] **Step 5: Commit**

```bash
git add index.js package.json
git commit -m "chore: use local index.js as app entry for widget registration"
```

---

## Task 3: Pure cashbook balance math

**Files:**
- Create: `src/utils/cashbookBalance.ts`
- Test: `__tests__/widgets/cashbookBalance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/widgets/cashbookBalance.test.ts`:

```ts
import { Transaction } from "../../src/types";
import { computeCashbookBalance, computeMonthFlows } from "../../src/utils/cashbookBalance";

const tx = (over: Partial<Transaction>): Transaction => ({
    id: "t",
    description: "d",
    amount: 0,
    date: "2026-08-05T10:00:00.000Z",
    type: "expense",
    businessId: "b1",
    ...over,
});

describe("computeCashbookBalance", () => {
    it("nets income minus expense for the given cashbook only", () => {
        const txns = [
            tx({ id: "1", type: "income", amount: 100, businessId: "b1" }),
            tx({ id: "2", type: "expense", amount: 30, businessId: "b1" }),
            tx({ id: "3", type: "income", amount: 999, businessId: "b2" }),
        ];
        expect(computeCashbookBalance(txns, "b1")).toBe(70);
    });

    it("returns 0 for a cashbook with no transactions", () => {
        expect(computeCashbookBalance([], "b1")).toBe(0);
    });
});

describe("computeMonthFlows", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");

    it("sums income and expense within the current month for the cashbook", () => {
        const txns = [
            tx({ id: "1", type: "income", amount: 200, date: "2026-08-02T00:00:00.000Z" }),
            tx({ id: "2", type: "expense", amount: 50, date: "2026-08-10T00:00:00.000Z" }),
            tx({ id: "3", type: "expense", amount: 999, date: "2026-07-31T00:00:00.000Z" }),
            tx({ id: "4", type: "income", amount: 999, businessId: "b2", date: "2026-08-05T00:00:00.000Z" }),
        ];
        expect(computeMonthFlows(txns, "b1", now)).toEqual({ income: 200, expense: 50 });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/widgets/cashbookBalance.test.ts`
Expected: FAIL — cannot find module `cashbookBalance`.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/cashbookBalance.ts`:

```ts
import { Transaction } from "../types";
import { getDateRangeForPeriod } from "./budgetCalculations";

export const computeCashbookBalance = (
    transactions: Transaction[],
    businessId: string,
): number =>
    transactions
        .filter((t) => t.businessId === businessId)
        .reduce((sum, t) => (t.type === "income" ? sum + t.amount : sum - t.amount), 0);

export const computeMonthFlows = (
    transactions: Transaction[],
    businessId: string,
    now: Date = new Date(),
): { income: number; expense: number } => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
        if (t.businessId !== businessId) continue;
        const d = new Date(t.date);
        if (d < start || d > now) continue;
        if (t.type === "income") income += t.amount;
        else expense += t.amount;
    }
    return { income, expense };
};
```

> `getDateRangeForPeriod` is imported to keep the monthly-range convention discoverable alongside budget code, but `computeMonthFlows` uses an explicit `now` for deterministic tests. If lint flags the unused import, remove it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/widgets/cashbookBalance.test.ts`
Expected: PASS (both suites).

- [ ] **Step 5: Commit**

```bash
git add src/utils/cashbookBalance.ts __tests__/widgets/cashbookBalance.test.ts
git commit -m "feat: pure cashbook balance and monthly flow helpers"
```

---

## Task 4: Widget constants

**Files:**
- Create: `src/features/widgets/constants.ts`

- [ ] **Step 1: Create the constants module**

```ts
export const WIDGET_NAMES = {
    BALANCE: "BalanceWidget",
    BUDGET: "BudgetWidget",
    QUICK_ADD: "QuickAddWidget",
} as const;

export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

// AsyncStorage key for the widgetId -> businessId mapping.
export const WIDGET_CASHBOOK_MAP_KEY = "@widget_cashbook_map";

// Deep-link path for the quick-add flow: financetracker://quick-add?businessId=<id>
export const QUICK_ADD_PATH = "quick-add";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/widgets/constants.ts
git commit -m "feat: widget name and storage-key constants"
```

---

## Task 5: Widget-to-cashbook config map (AsyncStorage)

**Files:**
- Create: `src/features/widgets/services/widgetConfig.ts`
- Test: `__tests__/widgets/widgetConfig.test.ts`

- [ ] **Step 1: Write the failing test (mock AsyncStorage in-memory)**

Create `__tests__/widgets/widgetConfig.test.ts`:

```ts
jest.mock("@react-native-async-storage/async-storage", () => {
    let store: Record<string, string> = {};
    return {
        __esModule: true,
        default: {
            getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
            setItem: jest.fn(async (k: string, v: string) => {
                store[k] = v;
            }),
            removeItem: jest.fn(async (k: string) => {
                delete store[k];
            }),
            __reset: () => {
                store = {};
            },
        },
    };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    getWidgetBusinessId,
    setWidgetBusinessId,
    removeWidgetMapping,
    removeMappingsForBusiness,
} from "../../src/features/widgets/services/widgetConfig";

beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

describe("widgetConfig", () => {
    it("returns null when no mapping exists", async () => {
        expect(await getWidgetBusinessId(1)).toBeNull();
    });

    it("stores and reads a widgetId -> businessId mapping", async () => {
        await setWidgetBusinessId(1, "b1");
        await setWidgetBusinessId(2, "b2");
        expect(await getWidgetBusinessId(1)).toBe("b1");
        expect(await getWidgetBusinessId(2)).toBe("b2");
    });

    it("removes a single widget mapping", async () => {
        await setWidgetBusinessId(1, "b1");
        await removeWidgetMapping(1);
        expect(await getWidgetBusinessId(1)).toBeNull();
    });

    it("removes all mappings pointing at a deleted business", async () => {
        await setWidgetBusinessId(1, "b1");
        await setWidgetBusinessId(2, "b1");
        await setWidgetBusinessId(3, "b2");
        await removeMappingsForBusiness("b1");
        expect(await getWidgetBusinessId(1)).toBeNull();
        expect(await getWidgetBusinessId(2)).toBeNull();
        expect(await getWidgetBusinessId(3)).toBe("b2");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/widgets/widgetConfig.test.ts`
Expected: FAIL — cannot find module `widgetConfig`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/widgets/services/widgetConfig.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WIDGET_CASHBOOK_MAP_KEY } from "../constants";

type WidgetMap = Record<string, string>; // widgetId (as string) -> businessId

const readMap = async (): Promise<WidgetMap> => {
    try {
        const raw = await AsyncStorage.getItem(WIDGET_CASHBOOK_MAP_KEY);
        return raw ? (JSON.parse(raw) as WidgetMap) : {};
    } catch {
        return {};
    }
};

const writeMap = async (map: WidgetMap): Promise<void> => {
    await AsyncStorage.setItem(WIDGET_CASHBOOK_MAP_KEY, JSON.stringify(map));
};

export const getWidgetBusinessId = async (widgetId: number): Promise<string | null> => {
    const map = await readMap();
    return map[String(widgetId)] ?? null;
};

export const setWidgetBusinessId = async (widgetId: number, businessId: string): Promise<void> => {
    const map = await readMap();
    map[String(widgetId)] = businessId;
    await writeMap(map);
};

export const removeWidgetMapping = async (widgetId: number): Promise<void> => {
    const map = await readMap();
    delete map[String(widgetId)];
    await writeMap(map);
};

export const removeMappingsForBusiness = async (businessId: string): Promise<void> => {
    const map = await readMap();
    let changed = false;
    for (const [wid, bid] of Object.entries(map)) {
        if (bid === businessId) {
            delete map[wid];
            changed = true;
        }
    }
    if (changed) await writeMap(map);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/widgets/widgetConfig.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/widgets/services/widgetConfig.ts __tests__/widgets/widgetConfig.test.ts
git commit -m "feat: widget-to-cashbook config map persistence"
```

---

## Task 6: Deep-link parsing

**Files:**
- Create: `src/features/widgets/services/deepLink.ts`
- Test: `__tests__/widgets/deepLink.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/widgets/deepLink.test.ts`:

```ts
import { parseQuickAddLink } from "../../src/features/widgets/services/deepLink";

describe("parseQuickAddLink", () => {
    it("extracts businessId from a well-formed quick-add link", () => {
        expect(parseQuickAddLink("financetracker://quick-add?businessId=b1")).toEqual({
            businessId: "b1",
        });
    });

    it("returns businessId null when the param is absent", () => {
        expect(parseQuickAddLink("financetracker://quick-add")).toEqual({ businessId: null });
    });

    it("returns null for a non quick-add link", () => {
        expect(parseQuickAddLink("financetracker://settings")).toBeNull();
    });

    it("returns null for undefined or malformed input", () => {
        expect(parseQuickAddLink(undefined)).toBeNull();
        expect(parseQuickAddLink("not a url")).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/widgets/deepLink.test.ts`
Expected: FAIL — cannot find module `deepLink`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/widgets/services/deepLink.ts`:

```ts
import { QUICK_ADD_PATH } from "../constants";

export interface QuickAddLink {
    businessId: string | null;
}

// Parses financetracker://quick-add?businessId=<id>. Returns null if the URL is
// not a quick-add link or cannot be parsed.
export const parseQuickAddLink = (url: string | undefined | null): QuickAddLink | null => {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        // scheme URLs parse with the path in either host or pathname depending on
        // the platform; normalize both.
        const path = (parsed.host || parsed.pathname.replace(/^\/+/, "")).replace(/^\/+/, "");
        if (path !== QUICK_ADD_PATH) return null;
        return { businessId: parsed.searchParams.get("businessId") };
    } catch {
        return null;
    }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/widgets/deepLink.test.ts`
Expected: PASS (4 tests).

> If `financetracker://quick-add` parses such that `host` is empty and `pathname` is `quick-add` (or vice versa) on the RN runtime, the normalization above handles both. Confirm on device in Task 13.

- [ ] **Step 5: Commit**

```bash
git add src/features/widgets/services/deepLink.ts __tests__/widgets/deepLink.test.ts
git commit -m "feat: quick-add deep-link parser"
```

---

## Task 7: Pure widget view builders

**Files:**
- Create: `src/features/widgets/services/widgetData.ts`
- Test: `__tests__/widgets/widgetData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/widgets/widgetData.test.ts`:

```ts
import { Business, Budget, CategoryBudgetSpent, Transaction } from "../../src/types";
import { buildBalanceView, buildBudgetView } from "../../src/features/widgets/services/widgetData";

const business = (over: Partial<Business> = {}): Business => ({
    id: "b1",
    name: "Personal",
    createdAt: "2026-01-01T00:00:00.000Z",
    currency: "GHS",
    ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
    id: "t",
    description: "d",
    amount: 0,
    date: "2026-08-05T10:00:00.000Z",
    type: "expense",
    businessId: "b1",
    ...over,
});

describe("buildBalanceView", () => {
    it("builds name, currency symbol, balance, and month flows", () => {
        const now = new Date("2026-08-15T00:00:00.000Z");
        const txns = [
            tx({ id: "1", type: "income", amount: 300, date: "2026-08-01T00:00:00.000Z" }),
            tx({ id: "2", type: "expense", amount: 120, date: "2026-08-10T00:00:00.000Z" }),
        ];
        expect(buildBalanceView(business(), txns, now)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            balance: 180,
            monthIncome: 300,
            monthExpense: 120,
        });
    });

    it("defaults the currency symbol when the cashbook has no currency", () => {
        const view = buildBalanceView(business({ currency: undefined }), [], new Date());
        expect(view.currencySymbol).toBe("$");
    });
});

describe("buildBudgetView", () => {
    const spent: CategoryBudgetSpent[] = [
        { categoryId: "6", categoryName: "Food", limit: 400, spent: 250, remaining: 150, percentage: 62.5 },
    ];
    const budget: Budget = {
        id: "bud1",
        businessId: "b1",
        period: "monthly",
        totalLimit: 1000,
        categoryBudgets: { "6": { limit: 400 } },
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
    };

    it("summarizes spent vs total limit with a period label", () => {
        expect(buildBudgetView(business(), budget, spent)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            periodLabel: "This Month",
            totalSpent: 250,
            totalLimit: 1000,
            percentage: 25,
            noBudget: false,
        });
    });

    it("flags noBudget when the cashbook has no budget", () => {
        expect(buildBudgetView(business(), null, [])).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            noBudget: true,
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/widgets/widgetData.test.ts`
Expected: FAIL — cannot find module `widgetData`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/widgets/services/widgetData.ts`:

```ts
import { Business, Budget, CategoryBudgetSpent } from "../../../types";
import { Transaction } from "../../../types";
import { computeCashbookBalance, computeMonthFlows } from "../../../utils/cashbookBalance";
import {
    calculateTotalSpent,
    getPeriodDisplayName,
} from "../../../utils/budgetCalculations";
import { getCurrencySymbol } from "../../../utils/_helpers";

export interface BalanceView {
    cashbookName: string;
    currencySymbol: string;
    balance: number;
    monthIncome: number;
    monthExpense: number;
}

export type BudgetView =
    | {
          cashbookName: string;
          currencySymbol: string;
          periodLabel: string;
          totalSpent: number;
          totalLimit: number;
          percentage: number;
          noBudget: false;
      }
    | {
          cashbookName: string;
          currencySymbol: string;
          noBudget: true;
      };

export const buildBalanceView = (
    business: Business,
    transactions: Transaction[],
    now: Date = new Date(),
): BalanceView => {
    const { income, expense } = computeMonthFlows(transactions, business.id, now);
    return {
        cashbookName: business.name,
        currencySymbol: getCurrencySymbol(business.currency),
        balance: computeCashbookBalance(transactions, business.id),
        monthIncome: income,
        monthExpense: expense,
    };
};

export const buildBudgetView = (
    business: Business,
    budget: Budget | null,
    budgetData: CategoryBudgetSpent[],
): BudgetView => {
    const currencySymbol = getCurrencySymbol(business.currency);
    if (!budget) {
        return { cashbookName: business.name, currencySymbol, noBudget: true };
    }
    const totalSpent = calculateTotalSpent(budgetData);
    const totalLimit = budget.totalLimit;
    const percentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return {
        cashbookName: business.name,
        currencySymbol,
        periodLabel: getPeriodDisplayName(budget.period),
        totalSpent,
        totalLimit,
        percentage,
        noBudget: false,
    };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/widgets/widgetData.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/widgets/services/widgetData.ts __tests__/widgets/widgetData.test.ts
git commit -m "feat: pure balance and budget view builders for widgets"
```

---

## Task 8: Widget theme resolver

**Files:**
- Create: `src/features/widgets/theme/widgetTheme.ts`

- [ ] **Step 1: Create the resolver (no hardcoded colors)**

The headless task cannot use `useTheme()`. This module reads the persisted theme preference (same key as `ThemeContext`) and the OS appearance, then exposes concrete color strings from `theme.ts` tokens.

Create `src/features/widgets/theme/widgetTheme.ts`:

```ts
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme, AppTheme } from "../../../theme/theme";

// Mirrors ThemeContext's THEME_STORAGE_KEY.
const THEME_STORAGE_KEY = "@theme_preference";

export interface WidgetColors {
    background: string;
    surface: string;
    onSurface: string;
    onSurfaceVariant: string;
    primary: string;
    onPrimary: string;
    income: string;
    expense: string;
    success: string;
    secondary: string;
    error: string;
    outlineVariant: string;
}

const pick = (theme: AppTheme): WidgetColors => ({
    background: theme.colors.surfaceContainerLow,
    surface: theme.colors.surfaceContainer,
    onSurface: theme.colors.onSurface,
    onSurfaceVariant: theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
    onPrimary: theme.colors.onPrimary,
    income: theme.colors.income,
    expense: theme.colors.expense,
    success: theme.colors.success,
    secondary: theme.colors.secondary,
    error: theme.colors.error,
    outlineVariant: theme.colors.outlineVariant,
});

// Budget bar color from usage percentage, matching getBudgetStatusColor thresholds.
export const budgetBarColor = (percentage: number, c: WidgetColors): string => {
    if (percentage < 70) return c.success;
    if (percentage < 90) return c.secondary;
    return c.error;
};

export const resolveWidgetColors = async (): Promise<WidgetColors> => {
    let mode: string | null = null;
    try {
        mode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    } catch {
        mode = null;
    }
    const isDark =
        mode === "dark" || ((mode === "system" || !mode) && Appearance.getColorScheme() === "dark");
    return pick(isDark ? darkTheme : lightTheme);
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no new errors. (`AppTheme` is exported from `theme.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/features/widgets/theme/widgetTheme.ts
git commit -m "feat: theme-token color resolver for widgets"
```

---

## Task 9: Widget UI components

**Files:**
- Create: `src/features/widgets/components/WidgetStates.tsx`
- Create: `src/features/widgets/components/BalanceWidget.tsx`
- Create: `src/features/widgets/components/BudgetWidget.tsx`
- Create: `src/features/widgets/components/QuickAddWidget.tsx`

> These use `react-native-android-widget` primitives (`FlexWidget`, `TextWidget`). They are rendered by the task handler (Task 10). No unit tests (native rendering); validated on device in Task 13. Keep each component small and prop-driven.

- [ ] **Step 1: Shared placeholder/error states**

Create `src/features/widgets/components/WidgetStates.tsx`:

```tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { WidgetColors } from "../theme/widgetTheme";

const container = (bg: string) =>
    ({
        height: "match_parent",
        width: "match_parent",
        backgroundColor: bg,
        borderRadius: 16,
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
    }) as const;

export function MessageWidget({
    message,
    colors,
    clickAction,
}: {
    message: string;
    colors: WidgetColors;
    clickAction?: string;
}) {
    return (
        <FlexWidget style={container(colors.surface)} clickAction={clickAction}>
            <TextWidget
                text={message}
                style={{ fontSize: 13, color: colors.onSurfaceVariant }}
            />
        </FlexWidget>
    );
}
```

- [ ] **Step 2: Balance widget**

Create `src/features/widgets/components/BalanceWidget.tsx`:

```tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { BalanceView } from "../services/widgetData";
import { WidgetColors } from "../theme/widgetTheme";

const fmt = (symbol: string, n: number) =>
    `${symbol}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function BalanceWidget({
    view,
    colors,
    clickAction,
}: {
    view: BalanceView;
    colors: WidgetColors;
    clickAction: string;
}) {
    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 12,
                flexDirection: "column",
                justifyContent: "center",
            }}
            clickAction={clickAction}
        >
            <TextWidget
                text={view.cashbookName}
                style={{ fontSize: 12, color: colors.onSurfaceVariant }}
            />
            <TextWidget
                text={`${view.balance < 0 ? "-" : ""}${fmt(view.currencySymbol, view.balance)}`}
                style={{ fontSize: 24, color: colors.onSurface }}
            />
            <FlexWidget style={{ flexDirection: "row", marginTop: 4 }}>
                <TextWidget
                    text={`↑ ${fmt(view.currencySymbol, view.monthIncome)}`}
                    style={{ fontSize: 12, color: colors.income, marginRight: 10 }}
                />
                <TextWidget
                    text={`↓ ${fmt(view.currencySymbol, view.monthExpense)}`}
                    style={{ fontSize: 12, color: colors.expense }}
                />
            </FlexWidget>
        </FlexWidget>
    );
}
```

- [ ] **Step 3: Budget widget**

Create `src/features/widgets/components/BudgetWidget.tsx`:

```tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { BudgetView } from "../services/widgetData";
import { WidgetColors, budgetBarColor } from "../theme/widgetTheme";
import { MessageWidget } from "./WidgetStates";

const fmt = (symbol: string, n: number) =>
    `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function BudgetWidget({
    view,
    colors,
    clickAction,
}: {
    view: BudgetView;
    colors: WidgetColors;
    clickAction: string;
}) {
    if (view.noBudget) {
        return (
            <MessageWidget
                message={`${view.cashbookName}\nNo budget set — tap to create`}
                colors={colors}
                clickAction={clickAction}
            />
        );
    }
    const pct = Math.min(100, Math.max(0, view.percentage));
    const barColor = budgetBarColor(view.percentage, colors);
    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 12,
                flexDirection: "column",
            }}
            clickAction={clickAction}
        >
            <TextWidget
                text={view.cashbookName}
                style={{ fontSize: 12, color: colors.onSurfaceVariant }}
            />
            <TextWidget
                text={view.periodLabel}
                style={{ fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 6 }}
            />
            <FlexWidget
                style={{
                    height: 10,
                    width: "match_parent",
                    backgroundColor: colors.outlineVariant,
                    borderRadius: 999,
                }}
            >
                <FlexWidget
                    style={{
                        height: 10,
                        width: `${pct}%` as unknown as number,
                        backgroundColor: barColor,
                        borderRadius: 999,
                    }}
                />
            </FlexWidget>
            <TextWidget
                text={`${fmt(view.currencySymbol, view.totalSpent)} of ${fmt(view.currencySymbol, view.totalLimit)}`}
                style={{ fontSize: 13, color: colors.onSurface, marginTop: 6 }}
            />
        </FlexWidget>
    );
}
```

> The percent-width `FlexWidget` is the library's idiom for a progress fill; if v0.22 requires a numeric width, compute a pixel width from a known widget width during device QA (Task 13). This is the one visual detail to confirm against the running widget.

- [ ] **Step 4: Quick-add widget**

Create `src/features/widgets/components/QuickAddWidget.tsx`:

```tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { WidgetColors } from "../theme/widgetTheme";

export function QuickAddWidget({
    cashbookName,
    colors,
    clickAction,
}: {
    cashbookName: string;
    colors: WidgetColors;
    clickAction: string;
}) {
    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: colors.primary,
                borderRadius: 16,
                padding: 12,
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
            clickAction={clickAction}
        >
            <TextWidget text="+ Add expense" style={{ fontSize: 16, color: colors.onPrimary }} />
            <TextWidget
                text={cashbookName}
                style={{ fontSize: 11, color: colors.onPrimary, marginTop: 2 }}
            />
        </FlexWidget>
    );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no new errors (the `width: \`${pct}%\`` cast is intentional per the note).

- [ ] **Step 6: Commit**

```bash
git add src/features/widgets/components
git commit -m "feat: balance, budget, quick-add widget UI components"
```

---

## Task 10: Widget task handler + registration

**Files:**
- Create: `src/features/widgets/widgetTaskHandler.tsx`
- Modify: `index.js`

- [ ] **Step 1: Implement the task handler**

Create `src/features/widgets/widgetTaskHandler.tsx`:

```tsx
import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { Linking } from "react-native";
import { loadBusinesses, loadTransactions, loadBudgets, loadCategories } from "../../utils/storage";
import { calculateBudgetData } from "../../utils/budgetCalculations";
import { WIDGET_NAMES, QUICK_ADD_PATH } from "./constants";
import { getWidgetBusinessId, removeWidgetMapping } from "./services/widgetConfig";
import { resolveWidgetColors } from "./theme/widgetTheme";
import { buildBalanceView, buildBudgetView } from "./services/widgetData";
import { BalanceWidget } from "./components/BalanceWidget";
import { BudgetWidget } from "./components/BudgetWidget";
import { QuickAddWidget } from "./components/QuickAddWidget";
import { MessageWidget } from "./components/WidgetStates";

const OPEN_QUICK_ADD = "OPEN_QUICK_ADD";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const widgetInfo = props.widgetInfo;
    const widgetName = widgetInfo.widgetName;
    const widgetId = widgetInfo.widgetId;
    const colors = await resolveWidgetColors();

    // Handle quick-add tap by opening the app via deep link.
    if (props.clickAction === OPEN_QUICK_ADD) {
        const businessId = await getWidgetBusinessId(widgetId);
        const suffix = businessId ? `?businessId=${businessId}` : "";
        await Linking.openURL(`financetracker://${QUICK_ADD_PATH}${suffix}`);
        return;
    }

    if (props.widgetAction === "WIDGET_DELETED") {
        await removeWidgetMapping(widgetId);
        return;
    }

    const businessId = await getWidgetBusinessId(widgetId);
    if (!businessId) {
        props.renderWidget(<MessageWidget message="Tap to set up" colors={colors} />);
        return;
    }

    const businesses = await loadBusinesses();
    const business = businesses.find((b) => b.id === businessId) ?? null;
    if (!business) {
        props.renderWidget(
            <MessageWidget message="Cashbook removed — tap to reconfigure" colors={colors} />,
        );
        return;
    }

    if (widgetName === WIDGET_NAMES.QUICK_ADD) {
        props.renderWidget(
            <QuickAddWidget cashbookName={business.name} colors={colors} clickAction={OPEN_QUICK_ADD} />,
        );
        return;
    }

    const transactions = await loadTransactions();

    if (widgetName === WIDGET_NAMES.BALANCE) {
        const view = buildBalanceView(business, transactions);
        props.renderWidget(
            <BalanceWidget view={view} colors={colors} clickAction={OPEN_QUICK_ADD} />,
        );
        return;
    }

    if (widgetName === WIDGET_NAMES.BUDGET) {
        const [budgets, categories] = await Promise.all([loadBudgets(), loadCategories()]);
        const budget = budgets.find((b) => b.businessId === businessId) ?? null;
        const budgetData = budget ? calculateBudgetData(budget, transactions, categories) : [];
        const view = buildBudgetView(business, budget, budgetData);
        props.renderWidget(
            <BudgetWidget view={view} colors={colors} clickAction={OPEN_QUICK_ADD} />,
        );
        return;
    }
}
```

> `WidgetTaskHandlerProps` field names (`widgetInfo`, `widgetAction`, `clickAction`, `renderWidget`) follow the library's documented handler shape. Confirm exact casing against the installed `react-native-android-widget` types during Step 3; adjust if the d.ts differs.

- [ ] **Step 2: Register the handler and config screen in `index.js`**

Replace `index.js` contents with:

```js
import { registerRootComponent } from "expo";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import App from "./App";
import { widgetTaskHandler } from "./src/features/widgets/widgetTaskHandler";

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
```

- [ ] **Step 3: Typecheck against the installed library types**

Run: `npx tsc -b`
Expected: no errors. If `WidgetTaskHandlerProps` fields differ from the code above, fix the field access to match the installed d.ts, then re-run.

- [ ] **Step 4: Run the full test suite (no regressions)**

Run: `npx jest`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/widgets/widgetTaskHandler.tsx index.js
git commit -m "feat: widget task handler wiring data, theme, and deep-link tap"
```

---

## Task 11: Widget refresh on data changes

**Files:**
- Create: `src/features/widgets/services/widgetSync.ts`
- Modify: `App.tsx` (save handlers + business delete path)
- Modify: `src/screens/BudgetSetupScreen.tsx` (after budget save)

- [ ] **Step 1: Implement the Android-guarded sync helper**

`requestWidgetUpdate`'s `renderWidget` callback is synchronous per widget instance, but data loads are async — so resolve a full snapshot up front, then render each instance synchronously from it.

Create `src/features/widgets/services/widgetSync.ts`:

```ts
import React from "react";
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { WIDGET_NAMES } from "../constants";
import { loadBusinesses, loadTransactions, loadBudgets, loadCategories } from "../../../utils/storage";
import { calculateBudgetData } from "../../../utils/budgetCalculations";
import { readAllWidgetMappings } from "./widgetConfig";
import { resolveWidgetColors, WidgetColors } from "../theme/widgetTheme";
import { buildBalanceView, buildBudgetView } from "./widgetData";
import { BalanceWidget } from "../components/BalanceWidget";
import { BudgetWidget } from "../components/BudgetWidget";
import { MessageWidget } from "../components/WidgetStates";
import { Business, Transaction, Budget, Category } from "../../../types";

const OPEN_QUICK_ADD = "OPEN_QUICK_ADD";

interface Snapshot {
    colors: WidgetColors;
    mappings: Record<string, string>;
    businesses: Business[];
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
}

const renderBalance = (snap: Snapshot, widgetId: number): React.ReactElement => {
    const businessId = snap.mappings[String(widgetId)];
    const business = businessId ? snap.businesses.find((b) => b.id === businessId) : undefined;
    if (!business) return React.createElement(MessageWidget, { message: "Tap to set up", colors: snap.colors });
    return React.createElement(BalanceWidget, {
        view: buildBalanceView(business, snap.transactions),
        colors: snap.colors,
        clickAction: OPEN_QUICK_ADD,
    });
};

const renderBudget = (snap: Snapshot, widgetId: number): React.ReactElement => {
    const businessId = snap.mappings[String(widgetId)];
    const business = businessId ? snap.businesses.find((b) => b.id === businessId) : undefined;
    if (!business) return React.createElement(MessageWidget, { message: "Tap to set up", colors: snap.colors });
    const budget = snap.budgets.find((b) => b.businessId === business.id) ?? null;
    const budgetData = budget ? calculateBudgetData(budget, snap.transactions, snap.categories) : [];
    return React.createElement(BudgetWidget, {
        view: buildBudgetView(business, budget, budgetData),
        colors: snap.colors,
        clickAction: OPEN_QUICK_ADD,
    });
};

export const refreshCashbookWidgets = async (): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
        const [colors, mappings, businesses, transactions, budgets, categories] = await Promise.all([
            resolveWidgetColors(),
            readAllWidgetMappings(),
            loadBusinesses(),
            loadTransactions(),
            loadBudgets(),
            loadCategories(),
        ]);
        const snap: Snapshot = { colors, mappings, businesses, transactions, budgets, categories };

        await requestWidgetUpdate({
            widgetName: WIDGET_NAMES.BALANCE,
            renderWidget: ({ widgetId }: { widgetId: number }) => renderBalance(snap, widgetId),
            widgetNotFound: () => {},
        });
        await requestWidgetUpdate({
            widgetName: WIDGET_NAMES.BUDGET,
            renderWidget: ({ widgetId }: { widgetId: number }) => renderBudget(snap, widgetId),
            widgetNotFound: () => {},
        });
    } catch {
        // Never let widget refresh crash app flows.
    }
};
```

- [ ] **Step 2: Add `readAllWidgetMappings` to `widgetConfig.ts`**

In `src/features/widgets/services/widgetConfig.ts`, add this exported function (uses the existing private `readMap`):

```ts
export const readAllWidgetMappings = async (): Promise<Record<string, string>> => {
    // Exposes the raw widgetId -> businessId map for batch rendering.
    return readMap();
};
```

Change the `readMap` declaration from `const readMap = async` to keep it module-private but callable — it already is; just ensure `readAllWidgetMappings` is declared after it in the same file.

- [ ] **Step 3: Call refresh from `App.tsx` save handlers**

In `App.tsx`, add the import near the other feature imports (after line 48):

```tsx
import { refreshCashbookWidgets } from "./src/features/widgets/services/widgetSync";
import { removeMappingsForBusiness } from "./src/features/widgets/services/widgetConfig";
```

Then update the two save handlers (currently at `App.tsx:214` and `App.tsx:219`):

```tsx
    const handleSaveBusinesses = async (newBusinesses: Business[]) => {
        const removedIds = businesses
            .filter((b) => !newBusinesses.some((n) => n.id === b.id))
            .map((b) => b.id);
        setBusinesses(newBusinesses);
        await saveBusinesses(newBusinesses);
        for (const id of removedIds) await removeMappingsForBusiness(id);
        await refreshCashbookWidgets();
    };

    const handleSaveTransactions = async (newTransactions: Transaction[]) => {
        setTransactions(newTransactions);
        await saveTransactions(newTransactions);
        await refreshCashbookWidgets();
    };
```

- [ ] **Step 4: Refresh after budget save**

Open `src/screens/BudgetSetupScreen.tsx`, locate where the budget is persisted (a call to `saveBudget`/`saveBudgets` from `src/utils/storage`). Immediately after the successful save, add:

```tsx
        await refreshCashbookWidgets();
```

Add the import at the top of `BudgetSetupScreen.tsx`:

```tsx
import { refreshCashbookWidgets } from "../features/widgets/services/widgetSync";
```

> If `BudgetSetupScreen` cannot `await` at that point, call `refreshCashbookWidgets().catch(() => {})` fire-and-forget. Verify the exact save call site when implementing.

- [ ] **Step 5: Typecheck and test**

Run: `npx tsc -b && npx jest`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/widgets/services/widgetSync.ts src/features/widgets/services/widgetConfig.ts App.tsx src/screens/BudgetSetupScreen.tsx
git commit -m "feat: refresh widgets on transaction, business, and budget changes"
```

---

## Task 12: Quick-add deep link + QuickAddModal pre-selection

**Files:**
- Modify: `src/components/QuickAddModal.tsx`
- Modify: `App.tsx` (deep-link listener + pass initial cashbook)

- [ ] **Step 1: Add optional `initialBusinessId` to `QuickAddModal`**

In `src/components/QuickAddModal.tsx`, extend the props interface:

```tsx
interface QuickAddModalProps {
    visible: boolean;
    businesses: Business[];
    onClose: () => void;
    onCreate: (tx: Transaction) => void;
    initialBusinessId?: string;
}
```

Update the component signature and add a pre-selection effect (place it after the existing `useEffect` at `QuickAddModal.tsx:32-34`):

```tsx
export default function QuickAddModal({
    visible,
    businesses,
    onClose,
    onCreate,
    initialBusinessId,
}: QuickAddModalProps) {
```

```tsx
    useEffect(() => {
        if (visible && initialBusinessId) {
            const match = businesses.find((b) => b.id === initialBusinessId);
            if (match) setSelected(match);
        }
    }, [visible, initialBusinessId, businesses]);
```

- [ ] **Step 2: Handle the deep link in `App.tsx`**

Add imports (near the top of `App.tsx`):

```tsx
import * as Linking from "expo-linking";
import { parseQuickAddLink } from "./src/features/widgets/services/deepLink";
```

Add state next to the existing `quickAddVisible` state (`App.tsx:85`):

```tsx
    const [quickAddBusinessId, setQuickAddBusinessId] = useState<string | undefined>(undefined);
```

Add a deep-link effect inside `MainApp` (alongside the other `useEffect`s, e.g. after the AppState effect at `App.tsx:197`):

```tsx
    useEffect(() => {
        const openFromUrl = (url: string | null) => {
            const link = parseQuickAddLink(url);
            if (!link) return;
            setQuickAddBusinessId(link.businessId ?? undefined);
            setQuickAddVisible(true);
        };
        Linking.getInitialURL().then(openFromUrl);
        const sub = Linking.addEventListener("url", (e) => openFromUrl(e.url));
        return () => sub.remove();
    }, []);
```

- [ ] **Step 3: Pass the initial cashbook into the modal**

In `App.tsx`, the `<QuickAddModal>` render is at `App.tsx:428-433`. Replace exactly:

```tsx
                <QuickAddModal
                    visible={quickAddVisible}
                    businesses={businesses}
                    onClose={() => setQuickAddVisible(false)}
                    onCreate={(tx) => handleSaveTransactions([...transactions, tx])}
                />
```

with:

```tsx
                <QuickAddModal
                    visible={quickAddVisible}
                    businesses={businesses}
                    initialBusinessId={quickAddBusinessId}
                    onClose={() => {
                        setQuickAddVisible(false);
                        setQuickAddBusinessId(undefined);
                    }}
                    onCreate={(tx) => handleSaveTransactions([...transactions, tx])}
                />
```

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc -b && npx jest`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/QuickAddModal.tsx App.tsx
git commit -m "feat: quick-add widget deep-link opens modal pre-selected to cashbook"
```

---

## Task 13: Configuration screen + prebuild + device QA

**Files:**
- Create: `src/features/widgets/screens/WidgetConfigScreen.tsx`
- Modify: `index.js` (register config screen)
- Regenerate: `android/` via prebuild

- [ ] **Step 1: Build the cashbook-picker configuration screen**

Create `src/features/widgets/screens/WidgetConfigScreen.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import type { WidgetConfigurationScreenProps } from "react-native-android-widget";
import { useTheme } from "../../../theme/theme";
import { getCurrencySymbol } from "../../../utils/_helpers";
import { loadBusinesses } from "../../../utils/storage";
import { Business } from "../../../types";
import { setWidgetBusinessId } from "../services/widgetConfig";

export function WidgetConfigScreen(props: WidgetConfigurationScreenProps) {
    const theme = useTheme();
    const [businesses, setBusinesses] = useState<Business[]>([]);

    useEffect(() => {
        loadBusinesses().then(setBusinesses);
    }, []);

    const choose = async (business: Business) => {
        await setWidgetBusinessId(props.widgetInfo.widgetId, business.id);
        // Render the first frame and finish configuration.
        props.setResult("ok");
    };

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.title, { color: theme.colors.onSurface, fontFamily: theme.fonts.bold }]}>
                Choose a cashbook
            </Text>
            <ScrollView>
                {businesses.map((b) => (
                    <TouchableOpacity
                        key={b.id}
                        style={[styles.row, { backgroundColor: theme.colors.surfaceContainer }]}
                        onPress={() => choose(b)}
                    >
                        <Text style={{ color: theme.colors.onSurface, fontFamily: theme.fonts.semibold, fontSize: 15 }}>
                            {b.name}
                        </Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: theme.fonts.regular }}>
                            {getCurrencySymbol(b.currency)} {b.currency ?? "USD"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, padding: 16 },
    title: { fontSize: 20, marginBottom: 16 },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
    },
});
```

> `WidgetConfigurationScreenProps` field/method names (`widgetInfo.widgetId`, `setResult`) follow the library's documented configuration API. Confirm exact names against the installed types in Step 3 and adjust if needed.

- [ ] **Step 2: Register the config screen in `index.js`**

Update `index.js` to also register the configuration screen:

```js
import { registerRootComponent } from "expo";
import {
    registerWidgetTaskHandler,
    registerWidgetConfigurationScreen,
} from "react-native-android-widget";
import App from "./App";
import { widgetTaskHandler } from "./src/features/widgets/widgetTaskHandler";
import { WidgetConfigScreen } from "./src/features/widgets/screens/WidgetConfigScreen";

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(WidgetConfigScreen);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors (adjust any library prop names flagged here).

- [ ] **Step 4: Regenerate native Android project**

Run:
```bash
npx expo prebuild -p android
```
Expected: `android/` updated with the widget provider XML, manifest receiver/config-activity entries, and the config plugin's generated sources.

Then verify the custom auto-log sources are intact:
```bash
git status android/
git diff --stat android/
```
Expected: your `android/app/src/main/java/com/yourcompany/financetracker/autolog/*.kt` files are unchanged; only widget-related additions appear. If prebuild altered auto-log files, restore them from git before continuing.

- [ ] **Step 5: Build and run on a device/emulator**

Run:
```bash
npx expo run:android
```
Expected: app builds and launches. (This is the first real runtime check of the entry-point change from Task 2.)

- [ ] **Step 6: Manual QA matrix (record results)**

Verify on device:
- Long-press home screen → widget picker shows all three widgets with labels.
- Placing a widget opens the cashbook picker; selecting a cashbook renders data.
- Balance widget shows the correct net and this-month ↑/↓ in the cashbook's currency symbol.
- Budget widget shows spent/limit + bar; "No budget set" appears for a cashbook without a budget.
- Quick-add widget → tap opens the app directly into Quick Add pre-selected to that cashbook.
- Add/edit/delete a transaction in-app → balance & budget widgets refresh.
- Delete the pinned cashbook → widget shows "Cashbook removed — tap to reconfigure".
- Toggle app theme (light/dark/system) → widget colors follow on next refresh.
- Cold start (app killed) vs warm: quick-add deep link works in both.

- [ ] **Step 7: Commit**

```bash
git add src/features/widgets/screens/WidgetConfigScreen.tsx index.js android
git commit -m "feat: widget configuration screen and native prebuild for Android widgets"
```

---

## Self-Review Notes (author)

- **Spec coverage:** balance/budget/quick-add widgets (Tasks 8–10), pinned-cashbook config (Task 13), data bridge via headless task (Task 10), refresh on writes (Task 11), deep link + pre-selection (Task 12), multi-currency (Tasks 7/9 via `getCurrencySymbol`), theme tokens/no hardcoded colors (Task 8), edge cases — no-config/removed-cashbook/no-budget (Tasks 9–11), stale-mapping cleanup (Tasks 5/11). Tests cover all pure logic (Tasks 3, 5, 6, 7).
- **Known confirm-on-device items (flagged inline, not placeholders):** exact `react-native-android-widget` prop/handler field names (`WidgetTaskHandlerProps`, `WidgetConfigurationScreenProps`, percent-width fill), and RN URL parsing of the custom scheme. Each has a concrete fallback.
- **Not automated:** native widget rendering and lifecycle (validated via the Task 13 QA matrix), per project guidance to avoid low-value tests.
```
