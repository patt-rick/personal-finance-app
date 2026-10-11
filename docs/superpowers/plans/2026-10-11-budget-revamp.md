# Budget Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild budgets around a scope model (cashbook or global per-currency), with limit history, pace and forecast, threshold-tied colours, a speedometer dashboard, crossing-based alerts and a restyled setup screen.

**Architecture:**
- **Logic:** pure budget logic lives in `src/features/budget/*.ts`. It has no React Native imports, so jest (node env) can test all of it.
- **Storage:** `features/budget/storage/budgetStore.ts`. It migrates on read and writes back only from the app process.
- **Alerts:** `utils/storage.saveTransactions` emits a "transactions saved" event when a caller passes `prev`. `features/budget/alerts` subscribes to it, evaluates crossings inside a lock, and delivers in-app or as a local notification.
- **UI:** small components under `features/budget/components`, composed by a thin `BudgetDashboardScreen`.

**Tech Stack:** React Native 0.81 / Expo 54, TypeScript, AsyncStorage, react-native-svg + RN `Animated`, expo-notifications, jest + ts-jest (node env).

**Spec:** `docs/superpowers/specs/2026-10-11-budget-revamp-design.md`.

**Conventions:**
- Use `pnpm` (never npm).
- No comments unless they say something the code can't.
- No hardcoded colours: use theme tokens via `useTheme()`.
- Money goes through `exactMoney`, percentages through `formatPercent`.
- Styles use `useMemo(() => createStyles(theme))`.
- Commit messages have no Claude co-author line.
- UI tasks are built with the `frontend-design` skill against the mockups in `.superpowers/brainstorm/79-1791748544/content/` (`full-screen-v3.html`, `gauge-style-v2.html`, `chip-style.html`, `setup.html`).

**Deviation from spec (deliberate):** the spec's `saveTransactions(next, { prev, silent })` becomes `saveTransactions(next, { prev })`.
- Alerts are **opt-in**: a caller that passes `prev` gets alerts, and every other caller is silent by default.
- `App.handleSaveTransactions(next, { silent })` decides whether to pass `prev`.
- This removes the risk of a forgotten `silent: true` causing an alert burst on restore.

---

## File map

**Create:**

| File | Responsibility |
|---|---|
| `src/features/budget/dates.ts` | local-date helpers |
| `src/features/budget/periods.ts` | period ranges, day counts, labels |
| `src/features/budget/scope.ts` | scope keys, which books a scope covers, names and symbols |
| `src/features/budget/spend.ts` | category index + spend for a scope/range |
| `src/features/budget/limits.ts` | limit history lookup + upsert |
| `src/features/budget/migrate.ts` | legacy → new shape, dedupe |
| `src/features/budget/pace.ts` | pace verdict, forecast, per-day |
| `src/features/budget/colour.ts` | threshold-tied colour scale |
| `src/features/budget/history.ts` | last-N period points |
| `src/features/budget/dashboardModel.ts` | period view rows + copy strings |
| `src/features/budget/setupModel.ts` | draft parsing/validation + apply draft |
| `src/features/budget/selection.ts` | available scopes + selection resolution (replaces `utils/budgetSelection.ts`) |
| `src/features/budget/storage/budgetStore.ts` | AsyncStorage persistence of budgets |
| `src/features/budget/alerts/ledgerKeys.ts` | ledger key + prune (pure) |
| `src/features/budget/alerts/ledger.ts` | ledger persistence |
| `src/features/budget/alerts/evaluateAlerts.ts` | crossing detection + messages (pure) |
| `src/features/budget/alerts/deliverAlerts.ts` | gate/queue, in-app vs notification |
| `src/features/budget/alerts/checkBudgetAlerts.ts` | lock + load + evaluate + persist + deliver |
| `src/features/budget/alerts/registerBudgetAlerts.ts` | subscribes to transaction events, AppState flush |
| `src/utils/transactionEvents.ts` | tiny event bus for saved transactions |
| `src/utils/categoryRename.ts` | pure rename cascade + name validation |
| `src/features/budget/hooks/useBudgetDashboard.ts` | loading + derived state for the dashboard |
| `src/features/budget/components/useSweep.ts` | replayable 0→1 animation value |
| `src/features/budget/components/BudgetGauge.tsx` | speedometer |
| `src/features/budget/components/PaceChip.tsx` | tonal icon chip |
| `src/features/budget/components/BudgetSummary.tsx` | sentence + forecast + allocation bar |
| `src/features/budget/components/AllocationBar.tsx` | stacked spend bar + legend |
| `src/features/budget/components/CategoryLimitsCard.tsx` | category rows card |
| `src/features/budget/components/BudgetHistoryChart.tsx` | 6-period bars + stepped limit line |
| `src/features/budget/components/PeriodSwitcher.tsx` | ‹ label › |
| `src/features/budget/components/ScopeChips.tsx` | global + cashbook chips |
| `src/features/budget/components/NewBudgetSheet.tsx` | kind chooser |
| `src/features/budget/components/HatchPattern.tsx` | shared SVG hatch `<Pattern>` |
| `src/features/budget/components/setup/CategoryLimitsEditor.tsx` | setup category card |
| `src/features/budget/components/setup/AlertSettingsCard.tsx` | setup alerts card |
| `__tests__/budget/*.test.ts` | unit tests per module |

**Modify:**
- `src/types.ts`: new Budget types; remove `CategoryBudgetSpent`.
- `src/utils/storageKeys.ts`: `BUDGET_ALERTS_FIRED`.
- `src/utils/storage.ts`:
  - `saveTransactions` opts + emit.
  - Budget functions re-exported from `budgetStore`.
  - Remove `getBudgetByBusinessId`/`saveBudget`/`deleteBudget`.
  - Add `renameCategory`.
- `App.tsx`: register alerts, gate, migration write-back, recurring `prev`, `handleSaveTransactions` opts, cashbook-delete hook.
- `src/screens/BusinessesScreen.tsx`: silent saves for "Delete All" and "Transfer"; prop type.
- `src/features/autoLogging/services/ingestion/applyPlan.ts`, `src/features/autoLogging/hooks/useAutoLogQueue.ts`: pass `prev`.
- `src/screens/BusinessDetailView.tsx`: remove the old warning.
- `src/screens/CategoryManagementScreen.tsx`: rename cascade, duplicate check, delete cleanup, `onDataChanged`.
- `src/screens/SettingsScreen.tsx`: pass `onDataChanged`.
- `src/features/widgets/services/widgetData.ts`, `renderWidget.ts`, `theme/widgetTheme.ts`, `components/BudgetWidget.tsx`: new budget model.
- `src/screens/BudgetDashboardScreen.tsx`: rewrite as composition.
- `src/screens/BudgetSetupScreen.tsx`: rewrite.
- `__tests__/widgets/widgetData.test.ts`, `__tests__/widgets/renderWidget.test.ts`: new model.

**Delete:**
- `src/utils/budgetCalculations.ts`, `src/utils/budgetSelection.ts`, `__tests__/utils/budgetSelection.test.ts`.
- `BUDGET_IMPLEMENTATION_SUMMARY.md`, `BUDGET_SCREEN_FLOWS.md`. `BUDGET_FEATURE_GUIDE.md` is rewritten short.

---

### Task 1: Types and dates

**Files:**
- Modify: `src/types.ts:49-70`
- Create: `src/features/budget/dates.ts`
- Test: `__tests__/budget/dates.test.ts`

- [ ] **Step 1: Replace the Budget types in `src/types.ts`** (remove `Budget` and `CategoryBudgetSpent` at lines 49-70)

```ts
export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export type BudgetScope =
    | { kind: "cashbook"; businessId: string }
    | { kind: "currency"; currency: string };

export type BudgetWarnAt = 70 | 80 | 90;

export interface BudgetLimits {
    periodStart: string;
    totalLimit: number;
    categoryLimits: { [categoryId: string]: number };
}

export interface Budget {
    id: string;
    scope: BudgetScope;
    period: BudgetPeriod;
    limits: BudgetLimits[];
    alerts: { enabled: boolean; warnAt: BudgetWarnAt };
    createdAt: string;
    updatedAt: string;
}

export interface LegacyBudget {
    id: string;
    businessId: string;
    period: BudgetPeriod;
    totalLimit: number;
    categoryBudgets?: { [categoryId: string]: { limit: number } };
    createdAt?: string;
    updatedAt?: string;
}
```

- [ ] **Step 2: Write the failing test** `__tests__/budget/dates.test.ts`

```ts
import { addDays, calendarDaysBetween, parseLocalISODate, toLocalISODate } from "../../src/features/budget/dates";

describe("dates", () => {
    it("round-trips local ISO dates without a UTC shift", () => {
        const d = parseLocalISODate("2026-03-01");
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(2);
        expect(d.getDate()).toBe(1);
        expect(toLocalISODate(d)).toBe("2026-03-01");
    });

    it("counts calendar days, not milliseconds", () => {
        expect(calendarDaysBetween(new Date(2026, 2, 28, 23, 0), new Date(2026, 2, 30, 1, 0))).toBe(2);
        expect(calendarDaysBetween(new Date(2026, 0, 1), new Date(2027, 0, 1))).toBe(365);
    });

    it("adds days across month ends", () => {
        expect(toLocalISODate(addDays(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
    });
});
```

- [ ] **Step 3: Run it.** `pnpm jest __tests__/budget/dates.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 4: Implement** `src/features/budget/dates.ts`

```ts
const pad = (n: number) => String(n).padStart(2, "0");

export const toLocalISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseLocalISODate = (s: string): Date => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
};

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const calendarDaysBetween = (a: Date, b: Date): number =>
    Math.round(
        (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
            86_400_000,
    );
```

- [ ] **Step 5: Run it.** Expected: PASS. (Type errors elsewhere from the removed types are expected until Task 13; don't run `tsc` yet.)

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(budget): scoped budget types and local date helpers"`

---

### Task 2: Periods

**Files:** Create `src/features/budget/periods.ts`; Test `__tests__/budget/periods.test.ts`

- [ ] **Step 1: Failing test**

```ts
import {
    daysElapsed,
    daysInPeriod,
    daysLeft,
    formatPeriodLabel,
    inPeriod,
    nextPeriod,
    periodRange,
    previousPeriod,
    recentPeriods,
} from "../../src/features/budget/periods";

describe("periodRange", () => {
    it("starts weeks on Monday, including when today is Sunday", () => {
        const sunday = new Date(2026, 9, 11, 15);
        const r = periodRange("weekly", sunday);
        expect(r.key).toBe("2026-10-05");
        expect(daysInPeriod(r)).toBe(7);
        expect(periodRange("weekly", new Date(2026, 9, 12)).key).toBe("2026-10-12");
    });

    it("covers whole months and years", () => {
        expect(daysInPeriod(periodRange("monthly", new Date(2028, 1, 10)))).toBe(29);
        expect(daysInPeriod(periodRange("yearly", new Date(2026, 5, 1)))).toBe(365);
        expect(periodRange("monthly", new Date(2026, 11, 31, 23, 59)).key).toBe("2026-12-01");
    });

    it("walks backwards and forwards", () => {
        const oct = periodRange("monthly", new Date(2026, 9, 11));
        expect(previousPeriod("monthly", oct).key).toBe("2026-09-01");
        expect(nextPeriod("monthly", oct).key).toBe("2026-11-01");
        expect(recentPeriods("monthly", new Date(2026, 9, 11), 6).map((r) => r.key)).toEqual([
            "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01",
        ]);
    });

    it("treats the end as exclusive", () => {
        const oct = periodRange("monthly", new Date(2026, 9, 11));
        expect(inPeriod(new Date(2026, 9, 31, 23, 59), oct)).toBe(true);
        expect(inPeriod(new Date(2026, 10, 1), oct)).toBe(false);
    });
});

describe("day counts", () => {
    const oct = periodRange("monthly", new Date(2026, 9, 1));
    it("counts today as elapsed and as left", () => {
        expect(daysElapsed(oct, new Date(2026, 9, 1, 8))).toBe(1);
        expect(daysLeft(oct, new Date(2026, 9, 1, 8))).toBe(31);
        expect(daysElapsed(oct, new Date(2026, 9, 31, 22))).toBe(31);
        expect(daysLeft(oct, new Date(2026, 9, 31, 22))).toBe(1);
    });
    it("clamps for closed periods", () => {
        expect(daysElapsed(oct, new Date(2027, 0, 1))).toBe(31);
        expect(daysLeft(oct, new Date(2027, 0, 1))).toBe(1);
    });
});

describe("formatPeriodLabel", () => {
    it("formats each period", () => {
        expect(formatPeriodLabel("monthly", periodRange("monthly", new Date(2026, 9, 11)))).toBe("October 2026");
        expect(formatPeriodLabel("yearly", periodRange("yearly", new Date(2026, 9, 11)))).toBe("2026");
        expect(formatPeriodLabel("weekly", periodRange("weekly", new Date(2026, 9, 7)))).toBe("5–11 Oct");
        expect(formatPeriodLabel("weekly", periodRange("weekly", new Date(2026, 8, 30)))).toBe("28 Sep – 4 Oct");
    });
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement** `src/features/budget/periods.ts`

```ts
import { BudgetPeriod } from "../../types";
import { addDays, calendarDaysBetween, startOfDay, toLocalISODate } from "./dates";

export interface PeriodRange {
    start: Date;
    end: Date;
    key: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const make = (start: Date, end: Date): PeriodRange => ({ start, end, key: toLocalISODate(start) });

export function periodRange(period: BudgetPeriod, at: Date): PeriodRange {
    const y = at.getFullYear();
    const m = at.getMonth();
    if (period === "weekly") {
        const start = addDays(startOfDay(at), -((at.getDay() + 6) % 7));
        return make(start, addDays(start, 7));
    }
    if (period === "monthly") return make(new Date(y, m, 1), new Date(y, m + 1, 1));
    return make(new Date(y, 0, 1), new Date(y + 1, 0, 1));
}

export const previousPeriod = (period: BudgetPeriod, r: PeriodRange): PeriodRange =>
    periodRange(period, addDays(r.start, -1));

export const nextPeriod = (period: BudgetPeriod, r: PeriodRange): PeriodRange => periodRange(period, r.end);

export function recentPeriods(period: BudgetPeriod, now: Date, count: number): PeriodRange[] {
    const out = [periodRange(period, now)];
    while (out.length < count) out.unshift(previousPeriod(period, out[0]));
    return out;
}

export const daysInPeriod = (r: PeriodRange): number => calendarDaysBetween(r.start, r.end);

export const inPeriod = (date: Date, r: PeriodRange): boolean => date >= r.start && date < r.end;

export const isCurrentPeriod = (r: PeriodRange, now: Date): boolean => inPeriod(now, r);

export function daysElapsed(r: PeriodRange, now: Date): number {
    return Math.min(daysInPeriod(r), Math.max(1, calendarDaysBetween(r.start, now) + 1));
}

export const daysLeft = (r: PeriodRange, now: Date): number => daysInPeriod(r) - daysElapsed(r, now) + 1;

export const periodNoun = (period: BudgetPeriod): string =>
    period === "weekly" ? "week" : period === "monthly" ? "month" : "year";

export const periodAdjective = (period: BudgetPeriod): string =>
    period === "weekly" ? "Weekly" : period === "monthly" ? "Monthly" : "Yearly";

export function formatPeriodLabel(period: BudgetPeriod, r: PeriodRange): string {
    if (period === "yearly") return String(r.start.getFullYear());
    if (period === "monthly") return `${MONTHS[r.start.getMonth()]} ${r.start.getFullYear()}`;
    const last = addDays(r.end, -1);
    const short = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);
    return r.start.getMonth() === last.getMonth()
        ? `${r.start.getDate()}–${last.getDate()} ${short(last)}`
        : `${r.start.getDate()} ${short(r.start)} – ${last.getDate()} ${short(last)}`;
}

export const formatPeriodShort = (period: BudgetPeriod, r: PeriodRange): string =>
    period === "yearly"
        ? String(r.start.getFullYear())
        : period === "monthly"
          ? MONTHS[r.start.getMonth()].slice(0, 3)
          : `${r.start.getDate()} ${MONTHS[r.start.getMonth()].slice(0, 3)}`;
```

- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat(budget): Monday-start period ranges and labels"` (add the new files first with `git add`)

---

### Task 3: Scope and spend

**Files:** Create `src/features/budget/scope.ts`, `src/features/budget/spend.ts`; Test `__tests__/budget/spend.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { Business, Category, Transaction } from "../../src/types";
import { businessIdsForScope, currencyLabel, scopeName } from "../../src/features/budget/scope";
import { computePeriodSpend, expenseCategoryIndex } from "../../src/features/budget/spend";
import { periodRange } from "../../src/features/budget/periods";

const biz = (id: string, currency?: string, name = id): Business => ({ id, name, currency, createdAt: "2026-01-01T00:00:00.000Z" });
const tx = (over: Partial<Transaction>): Transaction => ({
    id: Math.random().toString(36).slice(2),
    description: "d",
    amount: 0,
    date: new Date(2026, 9, 5, 12).toISOString(),
    type: "expense",
    businessId: "a",
    ...over,
});
const businesses = [biz("a", "GHS", "Main"), biz("b", "GHS", "Shop"), biz("c", "USD"), biz("d")];
const categories: Category[] = [
    { id: "f", name: "Food", type: "expense" },
    { id: "f2", name: "food ", type: "expense" },
    { id: "fi", name: "Food", type: "income" },
    { id: "t", name: "Transport", type: "expense" },
];
const oct = periodRange("monthly", new Date(2026, 9, 11));
const index = expenseCategoryIndex(categories);

describe("scope", () => {
    it("covers one cashbook or every book in a currency, with no-currency books as USD", () => {
        expect([...businessIdsForScope({ kind: "cashbook", businessId: "a" }, businesses)]).toEqual(["a"]);
        expect([...businessIdsForScope({ kind: "currency", currency: "GHS" }, businesses)]).toEqual(["a", "b"]);
        expect([...businessIdsForScope({ kind: "currency", currency: "USD" }, businesses)]).toEqual(["c", "d"]);
    });
    it("names scopes", () => {
        expect(scopeName({ kind: "cashbook", businessId: "a" }, businesses)).toBe("Main");
        expect(scopeName({ kind: "currency", currency: "GHS" }, businesses)).toBe("All ₵ cashbooks");
        expect(currencyLabel("KES")).toBe("KES");
        expect(currencyLabel("USD")).toBe("$");
    });
});

describe("expenseCategoryIndex", () => {
    it("matches expense names trimmed and case-insensitively, first in list wins", () => {
        expect(index.get("food")).toBe("f");
        expect(index.get("transport")).toBe("t");
    });
});

describe("computePeriodSpend", () => {
    it("counts gross totals, net category spend, fees and everything else", () => {
        const txs = [
            tx({ amount: 100, fee: 2, category: "FOOD" }),
            tx({ amount: 50, category: "Transport" }),
            tx({ amount: 30, category: "Rent" }),
            tx({ amount: 20 }),
            tx({ amount: 999, type: "income", category: "Food" }),
            tx({ amount: 70, date: new Date(2026, 8, 30).toISOString(), category: "Food" }),
        ];
        const s = computePeriodSpend(txs, businesses, { kind: "cashbook", businessId: "a" }, oct, index, new Set(["f"]));
        expect(s.total).toBe(202);
        expect(s.fees).toBe(2);
        expect(s.byCategory.get("f")).toBe(100);
        expect(s.other).toBe(100);
        expect(s.total).toBe([...s.byCategory.values()].reduce((a, b) => a + b, 0) + s.other + s.fees);
    });

    it("keeps other books out of a cashbook scope and pulls them into a currency scope", () => {
        const txs = [tx({ amount: 10 }), tx({ amount: 5, businessId: "b" }), tx({ amount: 7, businessId: "c" })];
        expect(computePeriodSpend(txs, businesses, { kind: "cashbook", businessId: "a" }, oct, index, new Set()).total).toBe(10);
        expect(computePeriodSpend(txs, businesses, { kind: "currency", currency: "GHS" }, oct, index, new Set()).total).toBe(15);
    });

    it("drops internal transfer principals in a currency scope but keeps their fees, like Reports", () => {
        const txs = [
            tx({ amount: 200, fee: 3, transferId: "x", category: "Transfer" }),
            tx({ amount: 200, type: "income", businessId: "b", transferId: "x", category: "Transfer" }),
        ];
        const global = computePeriodSpend(txs, businesses, { kind: "currency", currency: "GHS" }, oct, index, new Set());
        expect(global.total).toBe(3);
        expect(global.fees).toBe(3);
        const book = computePeriodSpend(txs, businesses, { kind: "cashbook", businessId: "a" }, oct, index, new Set());
        expect(book.total).toBe(203);
    });

    it("keeps a transfer half whose other side was deleted", () => {
        const txs = [tx({ amount: 40, transferId: "y" })];
        expect(computePeriodSpend(txs, businesses, { kind: "currency", currency: "GHS" }, oct, index, new Set()).total).toBe(40);
    });
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement** `src/features/budget/scope.ts`

```ts
import { Business, BudgetScope } from "../../types";
import { cashbookCurrency } from "../../utils/transfers";
import { getCurrencySymbol } from "../../utils/_helpers";

export const scopeKey = (s: BudgetScope): string =>
    s.kind === "cashbook" ? `cashbook:${s.businessId}` : `currency:${s.currency}`;

export const sameScope = (a: BudgetScope, b: BudgetScope): boolean => scopeKey(a) === scopeKey(b);

export function businessIdsForScope(scope: BudgetScope, businesses: Business[]): Set<string> {
    return new Set(
        businesses
            .filter((b) => (scope.kind === "cashbook" ? b.id === scope.businessId : cashbookCurrency(b) === scope.currency))
            .map((b) => b.id),
    );
}

export function scopeCurrency(scope: BudgetScope, businesses: Business[]): string {
    if (scope.kind === "currency") return scope.currency;
    const book = businesses.find((b) => b.id === scope.businessId);
    return book ? cashbookCurrency(book) : "USD";
}

export const scopeSymbol = (scope: BudgetScope, businesses: Business[]): string =>
    getCurrencySymbol(scopeCurrency(scope, businesses));

export const currencyLabel = (code: string): string => {
    const symbol = getCurrencySymbol(code);
    return symbol === "$" && code !== "USD" ? code : symbol;
};

export function scopeName(scope: BudgetScope, businesses: Business[]): string {
    if (scope.kind === "currency") return `All ${currencyLabel(scope.currency)} cashbooks`;
    return businesses.find((b) => b.id === scope.businessId)?.name ?? "Cashbook";
}
```

`src/features/budget/spend.ts`:

```ts
import { Business, BudgetScope, Category, Transaction } from "../../types";
import { excludeInternalTransfers } from "../../utils/transfers";
import { businessIdsForScope } from "./scope";
import { inPeriod, PeriodRange } from "./periods";

const norm = (s: string) => s.trim().toLowerCase();

export function expenseCategoryIndex(categories: Category[]): Map<string, string> {
    const index = new Map<string, string>();
    for (const c of categories) {
        if (c.type !== "expense") continue;
        const k = norm(c.name);
        if (!index.has(k)) index.set(k, c.id);
    }
    return index;
}

export interface PeriodSpend {
    total: number;
    byCategory: Map<string, number>;
    other: number;
    fees: number;
}

export function computePeriodSpend(
    transactions: Transaction[],
    businesses: Business[],
    scope: BudgetScope,
    range: PeriodRange,
    categoryIndex: Map<string, string>,
    limitedIds: ReadonlySet<string>,
): PeriodSpend {
    const ids = businessIdsForScope(scope, businesses);
    const scoped = excludeInternalTransfers(transactions.filter((t) => ids.has(t.businessId)));
    const spend: PeriodSpend = { total: 0, byCategory: new Map(), other: 0, fees: 0 };
    for (const t of scoped) {
        if (t.type !== "expense" || !inPeriod(new Date(t.date), range)) continue;
        const fee = t.fee ?? 0;
        spend.total += t.amount + fee;
        spend.fees += fee;
        const id = t.category ? categoryIndex.get(norm(t.category)) : undefined;
        if (id && limitedIds.has(id)) spend.byCategory.set(id, (spend.byCategory.get(id) ?? 0) + t.amount);
        else spend.other += t.amount;
    }
    return spend;
}
```

- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(budget): scope resolution and period spend`

---

### Task 4: Limits, migration, setup model

**Files:** Create `limits.ts`, `migrate.ts`, `setupModel.ts`; Test `__tests__/budget/limits.test.ts`, `__tests__/budget/migrate.test.ts`, `__tests__/budget/setupModel.test.ts`

- [ ] **Step 1: Failing tests**

`limits.test.ts`:
```ts
import { Budget } from "../../src/types";
import { limitsForPeriod, withLimits } from "../../src/features/budget/limits";

const base: Budget = {
    id: "b1",
    scope: { kind: "cashbook", businessId: "a" },
    period: "monthly",
    limits: [
        { periodStart: "2026-05-01", totalLimit: 1800, categoryLimits: {} },
        { periodStart: "2026-08-01", totalLimit: 2000, categoryLimits: { f: 600 } },
    ],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
};

describe("limitsForPeriod", () => {
    it("uses the latest entry at or before the period", () => {
        expect(limitsForPeriod(base, "2026-06-01")?.totalLimit).toBe(1800);
        expect(limitsForPeriod(base, "2026-08-01")?.totalLimit).toBe(2000);
        expect(limitsForPeriod(base, "2026-10-01")?.totalLimit).toBe(2000);
    });
    it("returns null before the budget existed", () => {
        expect(limitsForPeriod(base, "2026-04-01")).toBeNull();
    });
});

describe("withLimits", () => {
    it("adds an entry for the current period and overwrites it on a second edit", () => {
        const now = new Date(2026, 9, 11);
        const once = withLimits(base, { totalLimit: 2500, categoryLimits: {} }, now);
        const twice = withLimits(once, { totalLimit: 2600, categoryLimits: {} }, now);
        expect(twice.limits.map((l) => [l.periodStart, l.totalLimit])).toEqual([
            ["2026-05-01", 1800],
            ["2026-08-01", 2000],
            ["2026-10-01", 2600],
        ]);
        expect(limitsForPeriod(twice, "2026-09-01")?.totalLimit).toBe(2000);
    });
});
```

`migrate.test.ts`:
```ts
import { migrateBudgets } from "../../src/features/budget/migrate";

const legacy = (over: Record<string, unknown> = {}) => ({
    id: "old1",
    businessId: "a",
    period: "monthly",
    totalLimit: 2000,
    categoryBudgets: { f: { limit: 600 }, z: { limit: 0 } },
    createdAt: new Date(2026, 2, 15).toISOString(),
    updatedAt: new Date(2026, 2, 15).toISOString(),
    ...over,
});

describe("migrateBudgets", () => {
    it("converts legacy budgets and drops zero category limits", () => {
        const { budgets, changed } = migrateBudgets([legacy()]);
        expect(changed).toBe(true);
        expect(budgets).toEqual([
            {
                id: "old1",
                scope: { kind: "cashbook", businessId: "a" },
                period: "monthly",
                limits: [{ periodStart: "2026-03-01", totalLimit: 2000, categoryLimits: { f: 600 } }],
                alerts: { enabled: true, warnAt: 80 },
                createdAt: legacy().createdAt,
                updatedAt: legacy().updatedAt,
            },
        ]);
    });

    it("is idempotent", () => {
        const once = migrateBudgets([legacy()]).budgets;
        expect(migrateBudgets(once)).toEqual({ budgets: once, changed: false });
    });

    it("dedupes one scope, keeping the newest", () => {
        const older = legacy({ id: "x", updatedAt: "2026-01-01T00:00:00.000Z" });
        const newer = legacy({ id: "y", updatedAt: "2026-02-01T00:00:00.000Z" });
        const { budgets } = migrateBudgets([older, newer]);
        expect(budgets.map((b) => b.id)).toEqual(["y"]);
    });

    it("never drops a budget because its cashbook is unknown", () => {
        expect(migrateBudgets([legacy({ businessId: "ghost" })]).budgets).toHaveLength(1);
    });

    it("tolerates non-arrays and junk entries", () => {
        expect(migrateBudgets(null).budgets).toEqual([]);
        expect(migrateBudgets([42, { nope: true }]).budgets).toEqual([]);
    });
});
```

`setupModel.test.ts`:
```ts
import { Budget } from "../../src/types";
import { applyDraft, parseMoney, validateDraft } from "../../src/features/budget/setupModel";

describe("parseMoney", () => {
    it("accepts up to two decimals and rounds to cents", () => {
        expect(parseMoney("2,000.5")).toBe(2000.5);
        expect(parseMoney("12.345")).toBeNull();
        expect(parseMoney("")).toBeNull();
        expect(parseMoney("abc")).toBeNull();
    });
});

describe("validateDraft", () => {
    it("requires a positive total", () => {
        expect(validateDraft("0", [])).toEqual({ ok: false, error: { kind: "total" } });
    });
    it("requires each category amount", () => {
        expect(validateDraft("100", [{ id: "f", text: "" }])).toEqual({ ok: false, error: { kind: "category", id: "f" } });
    });
    it("rejects categories over the total", () => {
        expect(validateDraft("100", [{ id: "f", text: "60" }, { id: "t", text: "50.01" }])).toEqual({
            ok: false,
            error: { kind: "over", allocated: 110.01 },
        });
    });
    it("returns parsed limits", () => {
        expect(validateDraft("100", [{ id: "f", text: "60" }])).toEqual({ ok: true, totalLimit: 100, categoryLimits: { f: 60 } });
    });
});

describe("applyDraft", () => {
    const now = new Date(2026, 9, 11);
    const draft = { period: "monthly" as const, totalLimit: 2000, categoryLimits: {}, alerts: { enabled: true, warnAt: 80 as const } };

    it("creates a budget for the scope", () => {
        const b = applyDraft(null, { kind: "currency", currency: "GHS" }, draft, now, () => "id1");
        expect(b.limits).toEqual([{ periodStart: "2026-10-01", totalLimit: 2000, categoryLimits: {} }]);
        expect(b.scope).toEqual({ kind: "currency", currency: "GHS" });
    });

    it("resets history when the period type changes", () => {
        const existing = applyDraft(null, { kind: "cashbook", businessId: "a" }, draft, new Date(2026, 5, 1), () => "id1");
        const weekly = applyDraft(existing, existing.scope, { ...draft, period: "weekly" }, now, () => "x");
        expect(weekly.id).toBe("id1");
        expect(weekly.limits).toEqual([{ periodStart: "2026-10-05", totalLimit: 2000, categoryLimits: {} }]);
    });

    it("appends history otherwise", () => {
        const existing: Budget = applyDraft(null, { kind: "cashbook", businessId: "a" }, draft, new Date(2026, 5, 1), () => "id1");
        const edited = applyDraft(existing, existing.scope, { ...draft, totalLimit: 2500 }, now, () => "x");
        expect(edited.limits.map((l) => l.periodStart)).toEqual(["2026-06-01", "2026-10-01"]);
    });
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

`limits.ts`:
```ts
import { Budget, BudgetLimits } from "../../types";
import { periodRange } from "./periods";

export function limitsForPeriod(budget: Budget, periodKey: string): BudgetLimits | null {
    let found: BudgetLimits | null = null;
    for (const l of budget.limits) if (l.periodStart <= periodKey) found = l;
    return found;
}

export function withLimits(budget: Budget, next: Omit<BudgetLimits, "periodStart">, now: Date): Budget {
    const periodStart = periodRange(budget.period, now).key;
    const limits = [...budget.limits.filter((l) => l.periodStart !== periodStart), { periodStart, ...next }].sort((a, b) =>
        a.periodStart.localeCompare(b.periodStart),
    );
    return { ...budget, limits, updatedAt: now.toISOString() };
}
```

`migrate.ts`:
```ts
import { Budget, BudgetPeriod, LegacyBudget } from "../../types";
import { periodRange } from "./periods";
import { scopeKey } from "./scope";

const PERIODS: BudgetPeriod[] = ["weekly", "monthly", "yearly"];
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

function isBudget(x: unknown): x is Budget {
    if (!isObj(x) || typeof x.id !== "string" || !isObj(x.scope) || !isObj(x.alerts)) return false;
    const scope = x.scope;
    const scopeOk =
        (scope.kind === "cashbook" && typeof scope.businessId === "string") ||
        (scope.kind === "currency" && typeof scope.currency === "string");
    return scopeOk && PERIODS.includes(x.period as BudgetPeriod) && Array.isArray(x.limits) && x.limits.length > 0;
}

function isLegacy(x: unknown): x is LegacyBudget {
    return (
        isObj(x) &&
        typeof x.id === "string" &&
        typeof x.businessId === "string" &&
        typeof x.totalLimit === "number" &&
        PERIODS.includes(x.period as BudgetPeriod)
    );
}

function fromLegacy(old: LegacyBudget): Budget {
    const created = old.createdAt && !isNaN(Date.parse(old.createdAt)) ? new Date(old.createdAt) : new Date();
    const categoryLimits: Record<string, number> = {};
    for (const [id, entry] of Object.entries(old.categoryBudgets ?? {})) {
        const limit = entry?.limit;
        if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) categoryLimits[id] = limit;
    }
    const createdAt = old.createdAt ?? created.toISOString();
    return {
        id: old.id,
        scope: { kind: "cashbook", businessId: old.businessId },
        period: old.period,
        limits: [{ periodStart: periodRange(old.period, created).key, totalLimit: old.totalLimit, categoryLimits }],
        alerts: { enabled: true, warnAt: 80 },
        createdAt,
        updatedAt: old.updatedAt ?? createdAt,
    };
}

export function migrateBudgets(raw: unknown): { budgets: Budget[]; changed: boolean } {
    if (!Array.isArray(raw)) return { budgets: [], changed: false };
    let changed = false;
    const converted: Budget[] = [];
    for (const item of raw) {
        if (isBudget(item)) converted.push(item);
        else if (isLegacy(item)) {
            converted.push(fromLegacy(item));
            changed = true;
        } else changed = true;
    }
    const byScope = new Map<string, Budget>();
    for (const b of converted) {
        const key = scopeKey(b.scope);
        const kept = byScope.get(key);
        if (!kept) byScope.set(key, b);
        else {
            changed = true;
            if (b.updatedAt > kept.updatedAt) byScope.set(key, b);
        }
    }
    return { budgets: [...byScope.values()], changed };
}
```

Note: `byScope` keeps insertion order of the first occurrence. `Map.set` on an existing key keeps that position, so the dedupe test (`["y"]`) holds.

`setupModel.ts`:
```ts
import { Budget, BudgetPeriod, BudgetScope, BudgetWarnAt } from "../../types";
import { periodRange } from "./periods";
import { withLimits } from "./limits";

export interface BudgetDraft {
    period: BudgetPeriod;
    totalLimit: number;
    categoryLimits: Record<string, number>;
    alerts: { enabled: boolean; warnAt: BudgetWarnAt };
}

export type DraftError = { kind: "total" } | { kind: "category"; id: string } | { kind: "over"; allocated: number };

export function parseMoney(text: string): number | null {
    const clean = text.replace(/,/g, "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
    return Math.round(parseFloat(clean) * 100) / 100;
}

export function validateDraft(
    totalText: string,
    categories: { id: string; text: string }[],
): { ok: true; totalLimit: number; categoryLimits: Record<string, number> } | { ok: false; error: DraftError } {
    const total = parseMoney(totalText);
    if (total === null || total <= 0) return { ok: false, error: { kind: "total" } };
    const categoryLimits: Record<string, number> = {};
    let allocatedCents = 0;
    for (const c of categories) {
        const v = parseMoney(c.text);
        if (v === null || v <= 0) return { ok: false, error: { kind: "category", id: c.id } };
        categoryLimits[c.id] = v;
        allocatedCents += Math.round(v * 100);
    }
    if (allocatedCents > Math.round(total * 100)) return { ok: false, error: { kind: "over", allocated: allocatedCents / 100 } };
    return { ok: true, totalLimit: total, categoryLimits };
}

export function applyDraft(
    existing: Budget | null,
    scope: BudgetScope,
    draft: BudgetDraft,
    now: Date,
    makeId: () => string,
): Budget {
    const fresh = [{ periodStart: periodRange(draft.period, now).key, totalLimit: draft.totalLimit, categoryLimits: draft.categoryLimits }];
    const iso = now.toISOString();
    if (!existing) {
        return { id: makeId(), scope, period: draft.period, limits: fresh, alerts: draft.alerts, createdAt: iso, updatedAt: iso };
    }
    if (existing.period !== draft.period) {
        return { ...existing, period: draft.period, limits: fresh, alerts: draft.alerts, updatedAt: iso };
    }
    return {
        ...withLimits(existing, { totalLimit: draft.totalLimit, categoryLimits: draft.categoryLimits }, now),
        alerts: draft.alerts,
    };
}
```

- [ ] **Step 4: Run all three.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(budget): limit history, legacy migration and setup validation`

---

### Task 5: Pace, colour, history, dashboard model

**Files:** Create `pace.ts`, `colour.ts`, `history.ts`, `dashboardModel.ts`; Tests `pace.test.ts`, `colour.test.ts`, `dashboardModel.test.ts`

- [ ] **Step 1: Failing tests**

`pace.test.ts`:
```ts
import { computePace } from "../../src/features/budget/pace";
import { periodRange } from "../../src/features/budget/periods";

const oct = periodRange("monthly", new Date(2026, 9, 1));
const day20 = new Date(2026, 9, 20, 12);

describe("computePace", () => {
    it("is ahead when usage beats elapsed by more than 2 points", () => {
        const p = computePace(1668.9, 2000, oct, day20, "monthly");
        expect(p.verdict).toBe("ahead");
        expect(p.delta).toBeCloseTo(83.445 - (20 / 31) * 100, 3);
        expect(p.forecast).toBeCloseTo((1668.9 / 20) * 31, 6);
        expect(p.daysLeft).toBe(12);
        expect(p.perDay).toBeCloseTo(331.1 / 12, 6);
    });
    it("is on pace within 2 points above, on track at or below", () => {
        expect(computePace(1310, 2000, oct, day20, "monthly").verdict).toBe("on-pace");
        expect(computePace(1000, 2000, oct, day20, "monthly").verdict).toBe("on-track");
    });
    it("is over only past the limit; exactly at the limit is not over", () => {
        expect(computePace(2000, 2000, oct, day20, "monthly").verdict).toBe("ahead");
        const over = computePace(2100, 2000, oct, day20, "monthly");
        expect(over.verdict).toBe("over");
        expect(over.perDay).toBe(0);
    });
    it("hides the forecast early in the period", () => {
        expect(computePace(100, 2000, oct, new Date(2026, 9, 3), "monthly").forecast).toBeNull();
        expect(computePace(100, 2000, oct, new Date(2026, 9, 4), "monthly").forecast).not.toBeNull();
        const year = periodRange("yearly", new Date(2026, 0, 20));
        expect(computePace(100, 2000, year, new Date(2026, 0, 20), "yearly").forecast).toBeNull();
    });
});
```

`colour.test.ts`:
```ts
import { budgetColour } from "../../src/features/budget/colour";

const palette = { income: "#3E7049", gold: "#8C6A14", expense: "#A8392E" };

describe("budgetColour", () => {
    it("holds income until warnAt − 20, gold at warnAt, expense at 100+", () => {
        expect(budgetColour(0, 80, palette)).toBe("#3e7049");
        expect(budgetColour(60, 80, palette)).toBe("#3e7049");
        expect(budgetColour(80, 80, palette)).toBe("#8c6a14");
        expect(budgetColour(100, 80, palette)).toBe("#a8392e");
        expect(budgetColour(250, 80, palette)).toBe("#a8392e");
    });
    it("moves the gold point with the threshold", () => {
        expect(budgetColour(70, 70, palette)).toBe("#8c6a14");
        expect(budgetColour(50, 70, palette)).toBe("#3e7049");
    });
    it("blends between stops", () => {
        expect(budgetColour(90, 80, palette)).toBe("#9a5221");
    });
});
```
(Midway between #8C6A14 (140,106,20) and #A8392E (168,57,46) is (154, 81.5→82, 33) = `#9a5221`.)

`dashboardModel.test.ts`:
```ts
import { Budget, Business, Category, Transaction } from "../../src/types";
import { buildPeriodView, paceChip, summaryLines } from "../../src/features/budget/dashboardModel";
import { periodRange } from "../../src/features/budget/periods";
import { budgetHistory } from "../../src/features/budget/history";

const businesses: Business[] = [{ id: "a", name: "Main", currency: "GHS", createdAt: "2026-01-01T00:00:00.000Z" }];
const categories: Category[] = [
    { id: "f", name: "Food", type: "expense" },
    { id: "t", name: "Transport", type: "expense" },
];
const tx = (amount: number, category?: string, day = 5, fee?: number, month = 9): Transaction => ({
    id: `${amount}-${category}-${day}-${month}`,
    description: "d",
    amount,
    fee,
    category,
    date: new Date(2026, month, day, 12).toISOString(),
    type: "expense",
    businessId: "a",
});
const budget: Budget = {
    id: "b",
    scope: { kind: "cashbook", businessId: "a" },
    period: "monthly",
    limits: [
        { periodStart: "2026-07-01", totalLimit: 1800, categoryLimits: {} },
        { periodStart: "2026-09-01", totalLimit: 2000, categoryLimits: { f: 600, t: 400, gone: 50 } },
    ],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "",
    updatedAt: "",
};
const now = new Date(2026, 9, 20, 12);
const oct = periodRange("monthly", now);

describe("buildPeriodView", () => {
    const txs = [tx(760, "Food"), tx(340.1, "Transport"), tx(540, "Rent"), tx(20, "Food", 6, 8.8)];
    const view = buildPeriodView(budget, txs, businesses, categories, oct, now);

    it("rows sum to the total and deleted categories are ignored", () => {
        expect(view.limit).toBe(2000);
        expect(view.spent).toBeCloseTo(1668.9, 6);
        expect(view.rows.map((r) => r.key)).toEqual(["f", "t", "__other", "__fees"]);
        expect(view.rows.reduce((s, r) => s + r.spent, 0)).toBeCloseTo(view.spent, 6);
        expect(view.pace?.verdict).toBe("ahead");
    });

    it("produces chip and summary copy", () => {
        expect(paceChip(view, "₵")).toEqual({ tone: "warning", icon: "ahead", text: "Ahead of pace · +18.9%" });
        expect(summaryLines(view, "₵", "October")).toEqual({
            sentence: { before: "You have ", amount: "₵ 331.10", after: " left for 12 days, about ₵ 27.59 a day." },
            forecast: "At this rate you'll reach ₵ 2,586.79 by 31 Oct.",
        });
    });

    it("has no pace for a past period and no limit before the budget", () => {
        const june = periodRange("monthly", new Date(2026, 5, 10));
        expect(buildPeriodView(budget, txs, businesses, categories, june, now).limit).toBeNull();
        const aug = periodRange("monthly", new Date(2026, 7, 10));
        const past = buildPeriodView(budget, [tx(1900, "Food", 3, undefined, 7)], businesses, categories, aug, now);
        expect(past.pace).toBeNull();
        expect(paceChip(past, "₵")).toEqual({ tone: "error", icon: "over", text: "Finished ₵ 100.00 over" });
        expect(summaryLines(past, "₵", "August").sentence).toEqual({
            before: "August finished ",
            amount: "₵ 100.00 over",
            after: " your ₵ 1,800.00 limit.",
        });
    });
});

describe("budgetHistory", () => {
    it("returns six periods with the limit in force or null", () => {
        const points = budgetHistory(budget, [tx(100, "Food", 3, undefined, 8)], businesses, categories, now, 6);
        expect(points.map((p) => p.limit)).toEqual([null, null, 1800, 1800, 2000, 2000]);
        expect(points[4].spent).toBe(100);
        expect(points[5].current).toBe(true);
    });
});
```
Note on numbers: 1668.9 / 2000 = 83.445% used; elapsed = 20/31 = 64.516%; delta = 18.929 → "+18.9%". Remaining 331.10 over 12 days left = 27.59. Forecast = 1668.9 / 20 × 31 = 2586.795, which is 2586.7949999… in floating point, so `exactMoney` gives "₵ 2,586.79". The Food row is 780 (760 + 20 net); fees 8.8; total 760 + 340.1 + 540 + 20 + 8.8 = 1668.9.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

`pace.ts`:
```ts
import { BudgetPeriod } from "../../types";
import { daysElapsed, daysInPeriod, daysLeft, PeriodRange } from "./periods";

export type PaceVerdict = "on-track" | "on-pace" | "ahead" | "over";

export interface Pace {
    verdict: PaceVerdict;
    usedPct: number;
    elapsedPct: number;
    delta: number;
    forecast: number | null;
    perDay: number;
    daysLeft: number;
}

export function computePace(spent: number, limit: number, range: PeriodRange, now: Date, period: BudgetPeriod): Pace {
    const elapsed = daysElapsed(range, now);
    const total = daysInPeriod(range);
    const usedPct = (spent / limit) * 100;
    const elapsedPct = (elapsed / total) * 100;
    const delta = usedPct - elapsedPct;
    const left = daysLeft(range, now);
    const verdict: PaceVerdict = spent > limit ? "over" : delta > 2 ? "ahead" : delta > 0 ? "on-pace" : "on-track";
    const tooEarly = period === "yearly" ? now.getMonth() === range.start.getMonth() : elapsed <= 3;
    return {
        verdict,
        usedPct,
        elapsedPct,
        delta,
        forecast: tooEarly ? null : (spent / elapsed) * total,
        perDay: Math.max(0, limit - spent) / left,
        daysLeft: left,
    };
}
```

`colour.ts`:
```ts
export interface BudgetPalette {
    income: string;
    gold: string;
    expense: string;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}` as `#${string}`;

export function budgetColour(sharePct: number, warnAt: number, palette: BudgetPalette): `#${string}` {
    const stops: [number, string][] = [
        [0, palette.income],
        [warnAt - 20, palette.income],
        [warnAt, palette.gold],
        [100, palette.expense],
    ];
    const p = Math.min(Math.max(sharePct, 0), 100);
    for (let i = 1; i < stops.length; i++) {
        const [x1, c1] = stops[i];
        if (p <= x1) {
            const [x0, c0] = stops[i - 1];
            const t = x1 === x0 ? 1 : (p - x0) / (x1 - x0);
            const a = rgb(c0);
            const b = rgb(c1);
            return toHex(a.map((v, k) => v + (b[k] - v) * t));
        }
    }
    return toHex(rgb(palette.expense));
}
```

`history.ts`:
```ts
import { Budget, Business, Category, Transaction } from "../../types";
import { limitsForPeriod } from "./limits";
import { isCurrentPeriod, PeriodRange, recentPeriods } from "./periods";
import { computePeriodSpend, expenseCategoryIndex } from "./spend";

export interface HistoryPoint {
    range: PeriodRange;
    spent: number;
    limit: number | null;
    current: boolean;
}

export function budgetHistory(
    budget: Budget,
    transactions: Transaction[],
    businesses: Business[],
    categories: Category[],
    now: Date,
    count = 6,
): HistoryPoint[] {
    const index = expenseCategoryIndex(categories);
    return recentPeriods(budget.period, now, count).map((range) => ({
        range,
        spent: computePeriodSpend(transactions, businesses, budget.scope, range, index, new Set()).total,
        limit: limitsForPeriod(budget, range.key)?.totalLimit ?? null,
        current: isCurrentPeriod(range, now),
    }));
}
```

`dashboardModel.ts`:
```ts
import { Budget, Business, Category, Transaction } from "../../types";
import { exactMoney } from "../../utils/chartScale";
import { formatPercent } from "../../utils/categoryTiles";
import { FEES_CATEGORY_LABEL } from "../../utils/transactionAmount";
import { limitsForPeriod } from "./limits";
import { computePace, Pace } from "./pace";
import { addDays } from "./dates";
import { isCurrentPeriod, PeriodRange } from "./periods";
import { computePeriodSpend, expenseCategoryIndex } from "./spend";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface BudgetRow {
    key: string;
    label: string;
    kind: "limit" | "other" | "fees";
    spent: number;
    limit: number | null;
}

export interface BudgetPeriodView {
    range: PeriodRange;
    current: boolean;
    limit: number | null;
    spent: number;
    rows: BudgetRow[];
    pace: Pace | null;
}

export function buildPeriodView(
    budget: Budget,
    transactions: Transaction[],
    businesses: Business[],
    categories: Category[],
    range: PeriodRange,
    now: Date,
): BudgetPeriodView {
    const limits = limitsForPeriod(budget, range.key);
    const byId = new Map(categories.filter((c) => c.type === "expense").map((c) => [c.id, c]));
    const limited = Object.entries(limits?.categoryLimits ?? {}).filter(([id]) => byId.has(id));
    const spend = computePeriodSpend(
        transactions,
        businesses,
        budget.scope,
        range,
        expenseCategoryIndex(categories),
        new Set(limited.map(([id]) => id)),
    );
    const rows: BudgetRow[] = limited
        .map(([id, limit]) => ({ key: id, label: byId.get(id)!.name, kind: "limit" as const, spent: spend.byCategory.get(id) ?? 0, limit }))
        .sort((a, b) => b.spent / b.limit - a.spent / a.limit);
    if (spend.other > 0) rows.push({ key: "__other", label: "Everything else", kind: "other", spent: spend.other, limit: null });
    if (spend.fees > 0) rows.push({ key: "__fees", label: FEES_CATEGORY_LABEL, kind: "fees", spent: spend.fees, limit: null });
    const current = isCurrentPeriod(range, now);
    const limit = limits?.totalLimit ?? null;
    return {
        range,
        current,
        limit,
        spent: spend.total,
        rows,
        pace: current && limit ? computePace(spend.total, limit, range, now, budget.period) : null,
    };
}

export type ChipTone = "success" | "warning" | "error";
export type ChipIcon = "check" | "ahead" | "over";

export function paceChip(view: BudgetPeriodView, symbol: string): { tone: ChipTone; icon: ChipIcon; text: string } | null {
    if (view.limit === null) return null;
    const diff = Math.abs(view.spent - view.limit);
    if (!view.pace) {
        return view.spent > view.limit
            ? { tone: "error", icon: "over", text: `Finished ${exactMoney(diff, symbol)} over` }
            : { tone: "success", icon: "check", text: `Finished ${exactMoney(diff, symbol)} under` };
    }
    const p = view.pace;
    if (p.verdict === "over") return { tone: "error", icon: "over", text: `Over by ${exactMoney(diff, symbol)}` };
    if (p.verdict === "ahead") return { tone: "warning", icon: "ahead", text: `Ahead of pace · +${formatPercent(p.delta)}` };
    if (p.verdict === "on-pace") return { tone: "success", icon: "check", text: "On pace" };
    return { tone: "success", icon: "check", text: `On track · ${formatPercent(-p.delta)} under pace` };
}

export interface SummaryLines {
    sentence: { before: string; amount: string; after: string };
    forecast: string | null;
}

export function summaryLines(view: BudgetPeriodView, symbol: string, periodLabel: string): SummaryLines {
    const money = (v: number) => exactMoney(v, symbol);
    if (view.limit === null) {
        return { sentence: { before: "No limit was set for this period. You spent ", amount: money(view.spent), after: "." }, forecast: null };
    }
    if (!view.pace) {
        const over = view.spent > view.limit;
        return {
            sentence: {
                before: `${periodLabel} finished `,
                amount: `${money(Math.abs(view.spent - view.limit))} ${over ? "over" : "under"}`,
                after: ` your ${money(view.limit)} limit.`,
            },
            forecast: null,
        };
    }
    const p = view.pace;
    const last = addDays(view.range.end, -1);
    const forecast =
        p.forecast === null ? null : `At this rate you'll reach ${money(p.forecast)} by ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}.`;
    if (p.verdict === "over") {
        return { sentence: { before: "You're ", amount: `${money(view.spent - view.limit)} over`, after: ` your ${money(view.limit)} limit.` }, forecast };
    }
    const days = `${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}`;
    return {
        sentence: { before: "You have ", amount: money(view.limit - view.spent), after: ` left for ${days}, about ${money(p.perDay)} a day.` },
        forecast,
    };
}
```
`periodLabel` is the month name for monthly budgets (`MONTHS_LONG`-style, e.g. "August") and `formatPeriodLabel(period, range)` for weekly/yearly; the screen passes it.

- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(budget): pace, threshold colour scale, history and dashboard copy`

---

### Task 6: Budget storage and selection

**Files:** Create `storage/budgetStore.ts`, `selection.ts`; Modify `src/utils/storageKeys.ts`; Test `__tests__/budget/budgetStore.test.ts`, `__tests__/budget/selection.test.ts`; Delete `src/utils/budgetSelection.ts`, `__tests__/utils/budgetSelection.test.ts`

- [ ] **Step 1: Add the key** in `storageKeys.ts`: `BUDGET_ALERTS_FIRED: "@budget_alerts_fired",`

- [ ] **Step 2: Failing tests**

`budgetStore.test.ts` (AsyncStorage mock exactly as in `__tests__/autoLogging/reviewQueue.test.ts`, plus `removeItem`):
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
import { Budget } from "../../src/types";
import {
    deleteBudgetsForBusinesses,
    loadBudgets,
    persistBudgetMigration,
    removeCategoryFromBudgets,
    upsertBudget,
} from "../../src/features/budget/storage/budgetStore";

const KEY = "@budgets";
const budget = (id: string, businessId: string, limits = { f: 10 }): Budget => ({
    id,
    scope: { kind: "cashbook", businessId },
    period: "monthly",
    limits: [{ periodStart: "2026-10-01", totalLimit: 100, categoryLimits: limits }],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
});

beforeEach(() => (AsyncStorage as unknown as { __reset: () => void }).__reset());

it("migrates on read without writing", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([{ id: "o", businessId: "a", period: "monthly", totalLimit: 5, categoryBudgets: {} }]));
    expect((await loadBudgets())[0].scope).toEqual({ kind: "cashbook", businessId: "a" });
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!)[0].businessId).toBe("a");
    await persistBudgetMigration();
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!)[0].scope.kind).toBe("cashbook");
});

it("rejects a second budget for the same scope", async () => {
    expect(await upsertBudget(budget("1", "a"))).toBe("ok");
    expect(await upsertBudget(budget("2", "a"))).toBe("duplicate");
    expect(await upsertBudget({ ...budget("1", "a"), period: "weekly" })).toBe("ok");
});

it("refuses to write when stored budgets are unreadable", async () => {
    await AsyncStorage.setItem(KEY, "{not json");
    expect(await upsertBudget(budget("1", "a"))).toBe("error");
    expect(await AsyncStorage.getItem(KEY)).toBe("{not json");
});

it("removes cashbook budgets and category limits", async () => {
    await upsertBudget(budget("1", "a"));
    await upsertBudget(budget("2", "b"));
    await deleteBudgetsForBusinesses(["a"]);
    await removeCategoryFromBudgets("f");
    const left = await loadBudgets();
    expect(left.map((b) => b.id)).toEqual(["2"]);
    expect(left[0].limits[0].categoryLimits).toEqual({});
});
```

`selection.test.ts`:
```ts
import { Business } from "../../src/types";
import { availableScopes, resolveScopeSelection } from "../../src/features/budget/selection";

const biz = (id: string, currency = "GHS"): Business => ({ id, name: id, currency, createdAt: "2026-01-01T00:00:00.000Z" });
const books = [biz("a"), biz("b"), biz("c", "USD")];

describe("availableScopes", () => {
    it("lists currency scopes first, then cashbooks", () => {
        expect(availableScopes(books, [])).toEqual([
            { kind: "currency", currency: "GHS" },
            { kind: "currency", currency: "USD" },
            { kind: "cashbook", businessId: "a" },
            { kind: "cashbook", businessId: "b" },
            { kind: "cashbook", businessId: "c" },
        ]);
    });
});

describe("resolveScopeSelection", () => {
    it("follows the open cashbook, then keeps a valid pick, then falls back to the first cashbook", () => {
        expect(resolveScopeSelection(null, biz("b"), books)).toEqual({ kind: "cashbook", businessId: "b" });
        expect(resolveScopeSelection({ kind: "currency", currency: "USD" }, null, books)).toEqual({ kind: "currency", currency: "USD" });
        expect(resolveScopeSelection({ kind: "currency", currency: "EUR" }, null, books)).toEqual({ kind: "cashbook", businessId: "a" });
        expect(resolveScopeSelection({ kind: "cashbook", businessId: "gone" }, null, books)).toEqual({ kind: "cashbook", businessId: "a" });
        expect(resolveScopeSelection(null, null, [])).toBeNull();
    });
});
```

- [ ] **Step 3: Run.** Expected: FAIL.

- [ ] **Step 4: Implement** `storage/budgetStore.ts`

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Budget } from "../../../types";
import { STORAGE_KEYS } from "../../../utils/storageKeys";
import { migrateBudgets } from "../migrate";
import { sameScope } from "../scope";
import { removeLedgerEntriesForBudgets } from "../alerts/ledger";

const KEY = STORAGE_KEYS.BUDGETS;

async function readBudgets(): Promise<Budget[]> {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? migrateBudgets(JSON.parse(raw)).budgets : [];
}

export async function loadBudgets(): Promise<Budget[]> {
    try {
        return await readBudgets();
    } catch (error) {
        console.error("Error loading budgets:", error);
        return [];
    }
}

export async function saveBudgets(budgets: unknown[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(budgets));
        return true;
    } catch (error) {
        console.error("Error saving budgets:", error);
        return false;
    }
}

export async function persistBudgetMigration(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return;
        const { budgets, changed } = migrateBudgets(JSON.parse(raw));
        if (!changed) return;
        if ((await AsyncStorage.getItem(KEY)) !== raw) return;
        await AsyncStorage.setItem(KEY, JSON.stringify(budgets));
    } catch (error) {
        console.error("Error migrating budgets:", error);
    }
}

export async function upsertBudget(budget: Budget): Promise<"ok" | "duplicate" | "error"> {
    try {
        const budgets = await readBudgets();
        if (budgets.some((b) => b.id !== budget.id && sameScope(b.scope, budget.scope))) return "duplicate";
        const next = budgets.some((b) => b.id === budget.id)
            ? budgets.map((b) => (b.id === budget.id ? budget : b))
            : [...budgets, budget];
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        return "ok";
    } catch (error) {
        console.error("Error saving budget:", error);
        return "error";
    }
}

async function removeWhere(drop: (b: Budget) => boolean): Promise<boolean> {
    try {
        const budgets = await readBudgets();
        const removed = budgets.filter(drop).map((b) => b.id);
        if (removed.length === 0) return true;
        await AsyncStorage.setItem(KEY, JSON.stringify(budgets.filter((b) => !drop(b))));
        await removeLedgerEntriesForBudgets(removed);
        return true;
    } catch (error) {
        console.error("Error deleting budgets:", error);
        return false;
    }
}

export const deleteBudget = (id: string) => removeWhere((b) => b.id === id);

export const deleteBudgetsForBusinesses = (businessIds: string[]) =>
    removeWhere((b) => b.scope.kind === "cashbook" && businessIds.includes(b.scope.businessId));

export async function removeCategoryFromBudgets(categoryId: string): Promise<void> {
    try {
        const budgets = await readBudgets();
        if (!budgets.some((b) => b.limits.some((l) => categoryId in l.categoryLimits))) return;
        const next = budgets.map((b) => ({
            ...b,
            limits: b.limits.map((l) => {
                const { [categoryId]: _gone, ...rest } = l.categoryLimits;
                return { ...l, categoryLimits: rest };
            }),
        }));
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch (error) {
        console.error("Error updating budgets:", error);
    }
}
```
Create `alerts/ledger.ts` (code in Task 7, Step 3) as part of this task, because `budgetStore` imports it.

`selection.ts`:
```ts
import { Business, BudgetScope, Transaction } from "../../types";
import { reportCurrencies } from "../../utils/reportCurrency";
import { businessIdsForScope } from "./scope";

export function availableScopes(businesses: Business[], transactions: Transaction[]): BudgetScope[] {
    return [
        ...reportCurrencies(businesses, transactions).map((c): BudgetScope => ({ kind: "currency", currency: c.code })),
        ...businesses.map((b): BudgetScope => ({ kind: "cashbook", businessId: b.id })),
    ];
}

export function resolveScopeSelection(
    previous: BudgetScope | null,
    openCashbook: Business | null,
    businesses: Business[],
): BudgetScope | null {
    if (openCashbook && businesses.some((b) => b.id === openCashbook.id)) return { kind: "cashbook", businessId: openCashbook.id };
    if (previous && businessIdsForScope(previous, businesses).size > 0) return previous;
    return businesses[0] ? { kind: "cashbook", businessId: businesses[0].id } : null;
}
```
(With no transactions, `reportCurrencies` sorts by cashbook count desc and then code, so GHS (2 books) comes before USD (1), matching the test.)

- [ ] **Step 5: Delete** `src/utils/budgetSelection.ts` and `__tests__/utils/budgetSelection.test.ts`. Run the budget tests. Expected: PASS.
- [ ] **Step 6: Commit.** `feat(budget): scoped budget store and scope selection`

---

### Task 7: Alerts (ledger, evaluate, deliver, check, register) + transaction events

**Files:**
- Create: `src/utils/transactionEvents.ts`, `alerts/ledgerKeys.ts`, `alerts/ledger.ts`, `alerts/evaluateAlerts.ts`, `alerts/deliverAlerts.ts`, `alerts/checkBudgetAlerts.ts`, `alerts/registerBudgetAlerts.ts`
- Test: `__tests__/budget/evaluateAlerts.test.ts`, `__tests__/budget/ledgerKeys.test.ts`, `__tests__/utils/transactionEvents.test.ts`

- [ ] **Step 1: Failing tests**

`evaluateAlerts.test.ts`:
```ts
import { Budget, Business, Category, Transaction } from "../../src/types";
import { evaluateAlerts } from "../../src/features/budget/alerts/evaluateAlerts";

const businesses: Business[] = [
    { id: "a", name: "Main", currency: "GHS", createdAt: "" },
    { id: "b", name: "Shop", currency: "GHS", createdAt: "" },
];
const categories: Category[] = [{ id: "f", name: "Food", type: "expense" }];
const now = new Date(2026, 9, 20, 12);
const tx = (id: string, amount: number, over: Partial<Transaction> = {}): Transaction => ({
    id,
    description: "d",
    amount,
    category: "Food",
    date: new Date(2026, 9, 10).toISOString(),
    type: "expense",
    businessId: "a",
    ...over,
});
const book: Budget = {
    id: "B",
    scope: { kind: "cashbook", businessId: "a" },
    period: "monthly",
    limits: [{ periodStart: "2026-10-01", totalLimit: 1000, categoryLimits: { f: 600 } }],
    alerts: { enabled: true, warnAt: 80 },
    createdAt: "",
    updatedAt: "",
};
const global: Budget = { ...book, id: "G", scope: { kind: "currency", currency: "GHS" }, limits: [{ periodStart: "2026-10-01", totalLimit: 1300, categoryLimits: {} }] };
const run = (prev: Transaction[], next: Transaction[], budgets = [book], ledger: string[] = []) =>
    evaluateAlerts({ prev, next, budgets, businesses, categories, ledger: new Set(ledger), now });

describe("evaluateAlerts", () => {
    it("fires when a category crosses the warn threshold", () => {
        const r = run([tx("1", 400)], [tx("1", 400), tx("2", 86.2)]);
        expect(r.lines).toEqual(["Food in Main passed 80% · ₵ 486.20 of ₵ 600.00"]);
        expect(r.recorded).toEqual(["B|2026-10-01|f|80"]);
    });

    it("does not fire twice for the same period", () => {
        expect(run([tx("1", 400)], [tx("1", 400), tx("2", 90)], [book], ["B|2026-10-01|f|80"]).lines).toEqual([]);
    });

    it("shows only the limit message when one save crosses both, but records both", () => {
        const r = run([], [tx("1", 1000, { category: "Rent" })]);
        expect(r.lines).toEqual(["Main reached its limit · ₵ 1,000.00 of ₵ 1,000.00"]);
        expect(r.recorded.sort()).toEqual(["B|2026-10-01|total|100", "B|2026-10-01|total|80"]);
    });

    it("never fires for pre-existing spend, deletes or reductions", () => {
        expect(run([tx("1", 900)], [tx("1", 900), tx("x", 5, { type: "income" })]).lines).toEqual([]);
        expect(run([tx("1", 900), tx("2", 50)], [tx("1", 900)]).lines).toEqual([]);
        expect(run([tx("1", 900)], [tx("1", 700)]).lines).toEqual([]);
    });

    it("combines a cashbook and a global crossing from one save", () => {
        const r = run([tx("1", 700), tx("s", 300, { businessId: "b", category: "Rent" })], [tx("1", 700), tx("s", 300, { businessId: "b", category: "Rent" }), tx("2", 120, { category: "Rent" })], [book, global]);
        expect(r.lines).toEqual([
            "Main passed 80% · ₵ 820.00 of ₵ 1,000.00",
            "All ₵ cashbooks passed 80% · ₵ 1,120.00 of ₵ 1,300.00",
        ]);
    });

    it("ignores disabled budgets, periods without limits and changes outside the current period", () => {
        expect(run([], [tx("1", 2000)], [{ ...book, alerts: { enabled: false, warnAt: 80 } }]).lines).toEqual([]);
        expect(run([], [tx("1", 2000)], [{ ...book, limits: [{ periodStart: "2026-11-01", totalLimit: 10, categoryLimits: {} }] }]).lines).toEqual([]);
        expect(run([], [tx("1", 2000, { date: new Date(2026, 8, 10).toISOString() })]).lines).toEqual([]);
    });
});
```

`ledgerKeys.test.ts`:
```ts
import { Budget } from "../../src/types";
import { ledgerKey, pruneLedger } from "../../src/features/budget/alerts/ledgerKeys";

const b = { id: "B", period: "monthly" } as Budget;
it("keeps current and previous period keys of existing budgets only", () => {
    const now = new Date(2026, 9, 20);
    const keys = [ledgerKey("B", "2026-10-01", "total", 80), ledgerKey("B", "2026-09-01", "f", 100), ledgerKey("B", "2026-08-01", "f", 80), ledgerKey("X", "2026-10-01", "total", 80)];
    expect(pruneLedger(keys, [b], now)).toEqual(keys.slice(0, 2));
});
```

`transactionEvents.test.ts`:
```ts
import { emitTransactionsSaved, onTransactionsSaved } from "../../src/utils/transactionEvents";

it("delivers to listeners, isolates throwing ones and unsubscribes", () => {
    const seen: number[] = [];
    const off = onTransactionsSaved((_p, n) => seen.push(n.length));
    const offBad = onTransactionsSaved(() => {
        throw new Error("boom");
    });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    emitTransactionsSaved([], [{} as never]);
    off();
    offBad();
    emitTransactionsSaved([], []);
    expect(seen).toEqual([1]);
    spy.mockRestore();
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

`src/utils/transactionEvents.ts`:
```ts
import { Transaction } from "../types";

type Listener = (prev: Transaction[], next: Transaction[]) => void;

const listeners = new Set<Listener>();

export function onTransactionsSaved(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function emitTransactionsSaved(prev: Transaction[], next: Transaction[]): void {
    listeners.forEach((listener) => {
        try {
            listener(prev, next);
        } catch (error) {
            console.error("Transactions-saved listener failed:", error);
        }
    });
}
```

`alerts/ledgerKeys.ts`:
```ts
import { Budget } from "../../../types";
import { periodRange, previousPeriod } from "../periods";

export const ledgerKey = (budgetId: string, periodKey: string, target: string, threshold: number): string =>
    `${budgetId}|${periodKey}|${target}|${threshold}`;

export function pruneLedger(keys: string[], budgets: Budget[], now: Date): string[] {
    const cutoff = new Map(budgets.map((b) => [b.id, previousPeriod(b.period, periodRange(b.period, now)).key]));
    return [...new Set(keys)].filter((k) => {
        const [id, periodKey] = k.split("|");
        const from = cutoff.get(id);
        return from !== undefined && periodKey >= from;
    });
}
```

`alerts/ledger.ts`:
```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../utils/storageKeys";

const KEY = STORAGE_KEYS.BUDGET_ALERTS_FIRED;

export async function loadLedger(): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
    } catch {
        return [];
    }
}

export async function saveLedger(keys: string[]): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(keys));
}

export async function removeLedgerEntriesForBudgets(budgetIds: string[]): Promise<void> {
    const keys = await loadLedger();
    const next = keys.filter((k) => !budgetIds.includes(k.split("|")[0]));
    if (next.length !== keys.length) await saveLedger(next);
}
```

`alerts/evaluateAlerts.ts`:
```ts
import { Budget, Business, Category, Transaction } from "../../../types";
import { exactMoney } from "../../../utils/chartScale";
import { limitsForPeriod } from "../limits";
import { inPeriod, periodRange } from "../periods";
import { businessIdsForScope, scopeName, scopeSymbol } from "../scope";
import { computePeriodSpend, expenseCategoryIndex } from "../spend";
import { ledgerKey } from "./ledgerKeys";

export interface EvaluateInput {
    prev: Transaction[];
    next: Transaction[];
    budgets: Budget[];
    businesses: Business[];
    categories: Category[];
    ledger: ReadonlySet<string>;
    now: Date;
}

export interface EvaluateResult {
    lines: string[];
    recorded: string[];
}

function changedTransactions(prev: Transaction[], next: Transaction[]): Transaction[] {
    const before = new Map(prev.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const out: Transaction[] = [];
    for (const t of next) {
        seen.add(t.id);
        const old = before.get(t.id);
        if (!old) out.push(t);
        else if (old !== t && JSON.stringify(old) !== JSON.stringify(t)) out.push(old, t);
    }
    for (const t of prev) if (!seen.has(t.id)) out.push(t);
    return out;
}

const cents = (v: number) => Math.round(v * 100);

export function evaluateAlerts(input: EvaluateInput): EvaluateResult {
    const { prev, next, budgets, businesses, categories, ledger, now } = input;
    const result: EvaluateResult = { lines: [], recorded: [] };
    const active = budgets.filter((b) => b.alerts.enabled);
    if (active.length === 0) return result;
    const changed = changedTransactions(prev, next).filter((t) => t.type === "expense");
    if (changed.length === 0) return result;
    const index = expenseCategoryIndex(categories);
    const names = new Map(categories.filter((c) => c.type === "expense").map((c) => [c.id, c.name]));

    for (const budget of active) {
        const range = periodRange(budget.period, now);
        const limits = limitsForPeriod(budget, range.key);
        if (!limits) continue;
        const ids = businessIdsForScope(budget.scope, businesses);
        if (!changed.some((t) => ids.has(t.businessId) && inPeriod(new Date(t.date), range))) continue;
        const limited = Object.entries(limits.categoryLimits).filter(([id]) => names.has(id));
        const limitedIds = new Set(limited.map(([id]) => id));
        const before = computePeriodSpend(prev, businesses, budget.scope, range, index, limitedIds);
        const after = computePeriodSpend(next, businesses, budget.scope, range, index, limitedIds);
        const scope = scopeName(budget.scope, businesses);
        const symbol = scopeSymbol(budget.scope, businesses);
        const targets = [
            { key: "total", label: scope, limit: limits.totalLimit, from: before.total, to: after.total },
            ...limited.map(([id, limit]) => ({
                key: id,
                label: `${names.get(id)} in ${scope}`,
                limit,
                from: before.byCategory.get(id) ?? 0,
                to: after.byCategory.get(id) ?? 0,
            })),
        ];
        for (const target of targets) {
            const lc = cents(target.limit);
            if (lc <= 0) continue;
            const crossed = [budget.alerts.warnAt, 100].filter(
                (th) =>
                    cents(target.from) * 100 < th * lc &&
                    cents(target.to) * 100 >= th * lc &&
                    !ledger.has(ledgerKey(budget.id, range.key, target.key, th)),
            );
            if (crossed.length === 0) continue;
            crossed.forEach((th) => result.recorded.push(ledgerKey(budget.id, range.key, target.key, th)));
            const top = Math.max(...crossed);
            const verb = top >= 100 ? "reached its limit" : `passed ${top}%`;
            result.lines.push(`${target.label} ${verb} · ${exactMoney(target.to, symbol)} of ${exactMoney(target.limit, symbol)}`);
        }
    }
    return result;
}
```

`alerts/deliverAlerts.ts`:
```ts
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { appAlert } from "../../../components/dialog";
import { hapticWarning } from "../../../utils/haptics";

const CHANNEL_ID = "budget-alerts";
let gateOpen = false;
let queued: string[] = [];

function showInApp(lines: string[]) {
    hapticWarning();
    appAlert("Budget alert", lines.join("\n\n"), undefined, { tone: "warning" });
}

export function flushQueuedAlerts(): void {
    if (!gateOpen || AppState.currentState !== "active" || queued.length === 0) return;
    const lines = queued;
    queued = [];
    showInApp(lines);
}

export function setBudgetAlertGate(open: boolean): void {
    gateOpen = open;
    flushQueuedAlerts();
}

async function notify(lines: string[]): Promise<void> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
            queued.push(...lines);
            return;
        }
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                name: "Budget alerts",
                importance: Notifications.AndroidImportance.HIGH,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
            });
        }
        await Notifications.scheduleNotificationAsync({
            content: { title: "Budget alert", body: lines.join("\n") },
            trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
        });
    } catch {
        queued.push(...lines);
    }
}

export async function deliverAlerts(lines: string[]): Promise<void> {
    if (lines.length === 0) return;
    if (AppState.currentState !== "active") return notify(lines);
    if (!gateOpen) {
        queued.push(...lines);
        return;
    }
    showInApp(lines);
}
```

`alerts/checkBudgetAlerts.ts`:
```ts
import { Transaction } from "../../../types";
import { loadBusinesses, loadCategories } from "../../../utils/storage";
import { withLock } from "../../autoLogging/services/ingestion/mutex";
import { loadBudgets } from "../storage/budgetStore";
import { deliverAlerts } from "./deliverAlerts";
import { evaluateAlerts } from "./evaluateAlerts";
import { loadLedger, saveLedger } from "./ledger";
import { pruneLedger } from "./ledgerKeys";

export function checkBudgetAlerts(prev: Transaction[], next: Transaction[]): Promise<void> {
    return withLock("budget-alerts", async () => {
        const budgets = await loadBudgets();
        if (!budgets.some((b) => b.alerts.enabled)) return;
        const [businesses, categories, ledger] = await Promise.all([loadBusinesses(), loadCategories(), loadLedger()]);
        if (businesses.length === 0) return;
        const now = new Date();
        const { lines, recorded } = evaluateAlerts({ prev, next, budgets, businesses, categories, ledger: new Set(ledger), now });
        if (recorded.length === 0) return;
        await saveLedger(pruneLedger([...ledger, ...recorded], budgets, now));
        await deliverAlerts(lines);
    });
}
```

`alerts/registerBudgetAlerts.ts`:
```ts
import { AppState } from "react-native";
import { onTransactionsSaved } from "../../../utils/transactionEvents";
import { checkBudgetAlerts } from "./checkBudgetAlerts";
import { flushQueuedAlerts } from "./deliverAlerts";

export function registerBudgetAlerts(): () => void {
    const off = onTransactionsSaved((prev, next) => {
        checkBudgetAlerts(prev, next).catch((error) => console.error("Budget alert check failed:", error));
    });
    const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") flushQueuedAlerts();
    });
    return () => {
        off();
        sub.remove();
    };
}
```

- [ ] **Step 4: Run** `pnpm jest __tests__/budget __tests__/utils/transactionEvents.test.ts`. Expected: PASS.

The test "combines a cashbook and a global crossing" works like this:
- Book: from 700 to 820 of 1000 crosses 80% (800).
- Global: from 1000 to 1120 of 1300 crosses 80% (1040).
- Category Food (f, 600 limit) goes from 700 to 700, so no change; it was already over and is pre-existing, so it does not fire.

Budget order in `budgets` decides line order (book, then global).

- [ ] **Step 5: Commit.** `feat(budget): crossing-based alerts with ledger, lock and gated delivery`

---

### Task 8: Wire saves, migration, gate and cashbook deletion

**Files:** Modify `src/utils/storage.ts`, `App.tsx`, `src/screens/BusinessesScreen.tsx`, `applyPlan.ts`, `useAutoLogQueue.ts`, `src/screens/BusinessDetailView.tsx`

- [ ] **Step 1: `storage.ts`**

1. Change `saveTransactions`:
   ```ts
   export const saveTransactions = async (
       transactions: Transaction[],
       opts?: { prev?: Transaction[] },
   ): Promise<boolean> => {
       try {
           await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
       } catch (error) {
           console.error("Error saving transactions:", error);
           return false;
       }
       if (opts?.prev) emitTransactionsSaved(opts.prev, transactions);
       return true;
   };
   ```
   Add `import { emitTransactionsSaved } from "./transactionEvents";`.
2. Replace the "Budget Storage Functions" block (lines 131-189) with:
   `export { loadBudgets, saveBudgets } from "../features/budget/storage/budgetStore";`
   Delete `getBudgetByBusinessId`, `saveBudget` and `deleteBudget`. `exportAllData`/`importAllData` keep calling `loadBudgets`/`saveBudgets` (now imported). Add `import { loadBudgets, saveBudgets } from "../features/budget/storage/budgetStore";` and keep the re-export, or just use the imports and add `export { loadBudgets, saveBudgets };`.

- [ ] **Step 2: `App.tsx`**
- Imports:
  ```ts
  import { registerBudgetAlerts } from "./src/features/budget/alerts/registerBudgetAlerts";
  import { setBudgetAlertGate } from "./src/features/budget/alerts/deliverAlerts";
  import { deleteBudgetsForBusinesses, persistBudgetMigration } from "./src/features/budget/storage/budgetStore";
  ```
- Inside `MainApp`, before other effects:
  ```ts
  useEffect(() => registerBudgetAlerts(), []);
  useEffect(() => {
      setBudgetAlertGate(!isLoading && !isLocked);
  }, [isLoading, isLocked]);
  ```
- In `loadData`, first line after `startTime`: `await persistBudgetMigration();`. The recurring save becomes `await saveTransactions(mergedTransactions, { prev: loadedTransactions });`.
- `handleSaveBusinesses`: after `saveBusinesses`, `if (removedIds.length) await deleteBudgetsForBusinesses(removedIds);`.
- `handleSaveTransactions`:
  ```ts
  const handleSaveTransactions = async (newTransactions: Transaction[], opts?: { silent?: boolean }) => {
      setTransactions(newTransactions);
      await saveTransactions(newTransactions, opts?.silent ? undefined : { prev: transactions });
      await refreshCashbookWidgets();
  };
  ```

- [ ] **Step 3: `BusinessesScreen.tsx`.** Prop type `saveTransactions: (transactions: Transaction[], opts?: { silent?: boolean }) => void;`. Both bulk rewrites become `saveTransactions(..., { silent: true })`: "Delete All" (line 367) and `handleTransfer` (line 381).

- [ ] **Step 4: autolog**
  - `applyPlan.ts`: line 66 `await saveTransactions([...state.transactions, plan.transaction], { prev: state.transactions });` and line 74 `await saveTransactions(next, { prev: state.transactions });`.
  - `useAutoLogQueue.ts:58`: `await saveTransactions([...existing, tx], { prev: existing });`.
  - Check `__tests__/autoLogging/saveDraft.test.ts`/`drain.test.ts` mocks of `saveTransactions`. If a test asserts `toHaveBeenCalledWith([...])`, update it to `expect.anything()` for the second argument.

- [ ] **Step 5: `BusinessDetailView.tsx`.**
  - Delete `checkBudgetWarning` (lines 236-266) and its call (lines 311-313).
  - Remove the now-unused imports: `getBudgetByBusinessId`, `calculateBudgetData`, `getBudgetWarningMessage`, and `hapticWarning`/`ToastAndroid` only if unused (ToastAndroid is still used at line 384).

- [ ] **Step 6: Delete** `src/utils/budgetCalculations.ts`.
- [ ] **Step 7: Run** `pnpm jest`. Expected: budget and autolog suites PASS (widget suites fail until Task 9).
- [ ] **Step 8: Commit.** `feat(budget): alert hook on transaction saves, migration write-back and cashbook cleanup`

---

### Task 9: Widget on the new model

**Files:** Modify `widgetData.ts`, `renderWidget.ts`, `widgetTheme.ts`, `BudgetWidget.tsx`, `__tests__/widgets/widgetData.test.ts`, `__tests__/widgets/renderWidget.test.ts`

- [ ] **Step 1: Update tests.** Replace the `buildBudgetView` and `budgetDataForCashbook` describes in `widgetData.test.ts` with:
```ts
describe("buildBudgetView", () => {
    const budget: Budget = {
        id: "bud1",
        scope: { kind: "cashbook", businessId: "b1" },
        period: "monthly",
        limits: [{ periodStart: "2026-08-01", totalLimit: 1000, categoryLimits: { "6": 400 } }],
        alerts: { enabled: true, warnAt: 80 },
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
    };
    const categories: Category[] = [{ id: "6", name: "Food", type: "expense" }];
    const now = new Date(2026, 7, 15, 12);

    it("counts every expense in the cashbook, gross, against the total", () => {
        const txns = [
            tx({ id: "a", category: "Food", amount: 250, date: new Date(2026, 7, 5).toISOString() }),
            tx({ id: "b", category: "Rent", amount: 100, fee: 5, date: new Date(2026, 7, 6).toISOString() }),
            tx({ id: "c", businessId: "b2", amount: 999, date: new Date(2026, 7, 6).toISOString() }),
        ];
        expect(buildBudgetView(business(), budget, txns, categories, now)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            periodLabel: "This Month",
            totalSpent: 355,
            totalLimit: 1000,
            percentage: 35.5,
            warnAt: 80,
            noBudget: false,
            accent: resolveCashbookColor(business()),
            iconKey: resolveCashbookIconKey(business()),
        });
    });

    it("flags noBudget without a budget or without a limit for the period", () => {
        const none = { cashbookName: "Personal", currencySymbol: "₵", noBudget: true, accent: resolveCashbookColor(business()), iconKey: resolveCashbookIconKey(business()) };
        expect(buildBudgetView(business(), null, [], categories, now)).toEqual(none);
        expect(buildBudgetView(business(), budget, [], categories, new Date(2026, 6, 1))).toEqual(none);
    });
});
```
Update imports (drop `CategoryBudgetSpent`, `budgetDataForCashbook`). In `renderWidget.test.ts`, the inputs with `budgets: []` are unchanged. Run: FAIL.

- [ ] **Step 2: Implement**
- `widgetTheme.ts`:
  - Add `gold: HexColor;` to `WidgetColors` and `gold: theme.colors.gold as HexColor,` to `pick`.
  - Delete `budgetBarColor`.
- `widgetData.ts`:
  - Drop the `budgetCalculations` import and `budgetDataForCashbook`.
  - The budget union variant gains `warnAt: number`.
  - New `buildBudgetView`:
  ```ts
  const PERIOD_LABEL = { weekly: "This Week", monthly: "This Month", yearly: "This Year" } as const;

  export const buildBudgetView = (
      business: Business,
      budget: Budget | null,
      transactions: Transaction[],
      categories: Category[],
      now: Date = new Date(),
  ): BudgetView => {
      const currencySymbol = getCurrencySymbol(business.currency);
      const accent = resolveCashbookColor(business);
      const iconKey = resolveCashbookIconKey(business);
      const range = budget ? periodRange(budget.period, now) : null;
      const limits = budget && range ? limitsForPeriod(budget, range.key) : null;
      if (!budget || !range || !limits) {
          return { cashbookName: business.name, currencySymbol, noBudget: true, accent, iconKey };
      }
      const totalSpent = computePeriodSpend(transactions, [business], budget.scope, range, expenseCategoryIndex(categories), new Set()).total;
      return {
          cashbookName: business.name,
          currencySymbol,
          periodLabel: PERIOD_LABEL[budget.period],
          totalSpent,
          totalLimit: limits.totalLimit,
          percentage: (totalSpent / limits.totalLimit) * 100,
          warnAt: budget.alerts.warnAt,
          noBudget: false,
          accent,
          iconKey,
      };
  };
  ```
- `renderWidget.ts` BUDGET case:
  ```ts
  case WIDGET_NAMES.BUDGET: {
      const budget =
          inputs.budgets.find((b) => b.scope.kind === "cashbook" && b.scope.businessId === business.id) ?? null;
      return React.createElement(BudgetWidget, {
          view: buildBudgetView(business, budget, inputs.transactions, inputs.categories),
          colors,
          clickAction,
      });
  }
  ```
- `BudgetWidget.tsx`:
  - `const barColor = budgetColour(view.percentage, view.warnAt, colors) as HexColor;` (`colors` has income/gold/expense).
  - `fmt` → `exactMoney`.
  - Import `budgetColour` from `../../budget/colour` and `exactMoney` from `../../../utils/chartScale`; import `HexColor` type.
- [ ] **Step 3: Run** `pnpm jest __tests__/widgets`. Expected: PASS.
- [ ] **Step 4: Commit.** `feat(widgets): budget widget on scoped budgets and threshold colours`

---

### Task 10: Category rename cascade

**Files:** Create `src/utils/categoryRename.ts`; Modify `storage.ts`, `CategoryManagementScreen.tsx`, `SettingsScreen.tsx`; Test `__tests__/utils/categoryRename.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { Category, RecurringTransaction, Transaction } from "../../src/types";
import { ReviewItem } from "../../src/features/autoLogging/types";
import { checkCategoryName, renameCategoryEverywhere } from "../../src/utils/categoryRename";

const categories: Category[] = [
    { id: "f", name: "Food", type: "expense" },
    { id: "fi", name: "Food", type: "income" },
    { id: "t", name: "Transport", type: "expense" },
];
const tx = (id: string, type: "income" | "expense", category: string) =>
    ({ id, type, category, amount: 1, date: "", description: "", businessId: "a" }) as Transaction;

describe("checkCategoryName", () => {
    it("rejects empty and same-type duplicates, allows own name and other types", () => {
        expect(checkCategoryName(categories, "expense", "  ")).toBe("empty");
        expect(checkCategoryName(categories, "expense", " transport ", "f")).toBe("duplicate");
        expect(checkCategoryName(categories, "expense", "FOOD", "f")).toBeNull();
        expect(checkCategoryName(categories, "income", "Transport")).toBeNull();
    });
});

describe("renameCategoryEverywhere", () => {
    it("renames the category and matching same-type records only", () => {
        const result = renameCategoryEverywhere(
            {
                categories,
                transactions: [tx("1", "expense", "food "), tx("2", "income", "Food"), tx("3", "expense", "Transport")],
                recurring: [{ id: "r", type: "expense", category: "Food" } as RecurringTransaction],
                reviewItems: [
                    { id: "q", draft: { type: "transfer", category: "FOOD" } } as unknown as ReviewItem,
                    { id: "q2", draft: { type: "income", category: "Food" } } as unknown as ReviewItem,
                ],
            },
            "f",
            " Groceries ",
        );
        if ("error" in result) throw new Error(result.error);
        expect(result.categories.find((c) => c.id === "f")?.name).toBe("Groceries");
        expect(result.transactions.map((t) => t.category)).toEqual(["Groceries", "Food", "Transport"]);
        expect(result.recurring[0].category).toBe("Groceries");
        expect(result.reviewItems.map((i) => i.draft.category)).toEqual(["Groceries", "Food"]);
        expect(result.changed).toEqual({ transactions: true, recurring: true, reviewItems: true });
    });

    it("refuses collisions", () => {
        expect(renameCategoryEverywhere({ categories, transactions: [], recurring: [], reviewItems: [] }, "f", "Transport")).toEqual({ error: "duplicate" });
    });
});
```
Run: FAIL.

- [ ] **Step 2: Implement** `src/utils/categoryRename.ts`
```ts
import { Category, RecurringTransaction, Transaction } from "../types";
import { ReviewItem } from "../features/autoLogging/types";

export type CategoryNameError = "empty" | "duplicate" | "missing";

const norm = (s: string) => s.trim().toLowerCase();

export function checkCategoryName(
    categories: Category[],
    type: "income" | "expense",
    name: string,
    exceptId?: string,
): CategoryNameError | null {
    if (!name.trim()) return "empty";
    return categories.some((c) => c.id !== exceptId && c.type === type && norm(c.name) === norm(name)) ? "duplicate" : null;
}

interface RenameInput {
    categories: Category[];
    transactions: Transaction[];
    recurring: RecurringTransaction[];
    reviewItems: ReviewItem[];
}

export function renameCategoryEverywhere(
    input: RenameInput,
    categoryId: string,
    nextName: string,
): (RenameInput & { changed: { transactions: boolean; recurring: boolean; reviewItems: boolean } }) | { error: CategoryNameError } {
    const category = input.categories.find((c) => c.id === categoryId);
    if (!category) return { error: "missing" };
    const error = checkCategoryName(input.categories, category.type, nextName, categoryId);
    if (error) return { error };
    const name = nextName.trim();
    const old = norm(category.name);
    const hits = (type: string, value?: string) => type === category.type && value !== undefined && norm(value) === old;
    const changed = { transactions: false, recurring: false, reviewItems: false };
    const transactions = input.transactions.map((t) => {
        if (!hits(t.type, t.category)) return t;
        changed.transactions = true;
        return { ...t, category: name };
    });
    const recurring = input.recurring.map((r) => {
        if (!hits(r.type, r.category)) return r;
        changed.recurring = true;
        return { ...r, category: name };
    });
    const reviewItems = input.reviewItems.map((item) => {
        const type = item.draft.type === "income" ? "income" : "expense";
        if (!hits(type, item.draft.category)) return item;
        changed.reviewItems = true;
        return { ...item, draft: { ...item.draft, category: name } };
    });
    return {
        categories: input.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
        transactions,
        recurring,
        reviewItems,
        changed,
    };
}
```

- [ ] **Step 3: `storage.ts`.** Add:
```ts
export const renameCategory = async (
    categoryId: string,
    nextName: string,
): Promise<{ categories: Category[] } | { error: CategoryNameError | "save" }> => {
    const [categories, transactions, recurring, reviewItems] = await Promise.all([
        loadCategories(),
        loadTransactions(),
        loadRecurringTransactions(),
        loadReviewQueue(),
    ]);
    const result = renameCategoryEverywhere({ categories, transactions, recurring, reviewItems }, categoryId, nextName);
    if ("error" in result) return result;
    const writes: Promise<boolean>[] = [saveCategories(result.categories)];
    if (result.changed.transactions) writes.push(saveTransactions(result.transactions));
    if (result.changed.recurring) writes.push(saveRecurringTransactions(result.recurring));
    if (result.changed.reviewItems) writes.push(saveReviewQueue(result.reviewItems));
    const ok = (await Promise.all(writes)).every(Boolean);
    return ok ? { categories: result.categories } : { error: "save" };
};
```
(Imports: `renameCategoryEverywhere`, `CategoryNameError` from `./categoryRename`; `loadReviewQueue`, `saveReviewQueue` from `../features/autoLogging/services/persistence/reviewQueue`. Check for an import cycle: reviewQueue imports only `storageKeys` and types, so there is none.)

- [ ] **Step 4: `CategoryManagementScreen.tsx`**
- Props: `{ onBack?: () => void; onDataChanged?: () => Promise<void> }`.
- `handleSave`:
  ```ts
  const handleSave = async () => {
      if (editingCategory) {
          const result = await renameCategory(editingCategory.id, categoryName);
          if ("error" in result) {
              appAlert("Can't rename category", RENAME_ERRORS[result.error]);
              return;
          }
          setCategories(result.categories);
          await onDataChanged?.();
      } else {
          const problem = checkCategoryName(categories, selectedType, categoryName);
          if (problem) {
              appAlert("Can't add category", RENAME_ERRORS[problem]);
              return;
          }
          const updated = [...categories, { id: Date.now().toString(), name: categoryName.trim(), type: selectedType, isDefault: false }];
          setCategories(updated);
          await saveCategories(updated);
      }
      hapticSuccess();
      setModalVisible(false);
      setCategoryName("");
      setEditingCategory(null);
  };
  ```
  With:
  ```ts
  const RENAME_ERRORS = {
      empty: "Category name cannot be empty.",
      duplicate: "A category with that name already exists.",
      missing: "This category no longer exists.",
      save: "Something went wrong saving your changes. Please try again.",
  };
  ```
  (module scope).
- Delete flow: after `await saveCategories(updated);` add `await removeCategoryFromBudgets(id);` (import from `../features/budget/storage/budgetStore`).
- `SettingsScreen.tsx:253`: `<CategoryManagementScreen onBack={() => setShowCategories(false)} onDataChanged={onDataImported} />`.
- [ ] **Step 5: Run** `pnpm jest`. Expected: PASS.
- [ ] **Step 6: Commit.** `feat(categories): rename cascades to transactions, recurring and review items`

---

### Task 11: Dashboard hook and animation primitive

**Files:** Create `hooks/useBudgetDashboard.ts`, `components/useSweep.ts`

- [ ] **Step 1: `useSweep.ts`.** This is a JS-driven 0→1 value that replays whenever `key` changes, so it can animate SVG props. Reduced motion jumps to 1.
```ts
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function useSweep(key: string, reduced: boolean | null, duration = 900, native = false): Animated.Value {
    const value = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (reduced === null) return;
        value.stopAnimation();
        if (reduced) {
            value.setValue(1);
            return;
        }
        value.setValue(0);
        const anim = Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: native });
        anim.start();
        return () => anim.stop();
    }, [key, reduced, value, duration, native]);
    return value;
}
```

- [ ] **Step 2: `useBudgetDashboard.ts`**
```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Budget, BudgetScope, Business, Category, Transaction } from "../../../types";
import { loadCategories } from "../../../utils/storage";
import { loadBudgets } from "../storage/budgetStore";
import { availableScopes, resolveScopeSelection } from "../selection";
import { sameScope, scopeKey } from "../scope";
import { nextPeriod, periodRange, previousPeriod, PeriodRange } from "../periods";
import { buildPeriodView } from "../dashboardModel";
import { budgetHistory } from "../history";

export function useBudgetDashboard(businesses: Business[], transactions: Transaction[], currentBusiness: Business | null) {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<BudgetScope | null>(() => resolveScopeSelection(null, currentBusiness, businesses));
    const [rangeKey, setRangeKey] = useState<string | null>(null);

    const reload = useCallback(async () => {
        const [b, c] = await Promise.all([loadBudgets(), loadCategories()]);
        setBudgets(b);
        setCategories(c);
        setLoading(false);
    }, []);

    useFocusEffect(useCallback(() => void reload(), [reload]));

    useEffect(() => {
        if (currentBusiness) setSelected((prev) => resolveScopeSelection(prev, currentBusiness, businesses));
    }, [currentBusiness]);

    useEffect(() => {
        setSelected((prev) => resolveScopeSelection(prev, null, businesses));
    }, [businesses]);

    const scopes = useMemo(() => availableScopes(businesses, transactions), [businesses, transactions]);
    const budget = useMemo(() => (selected ? budgets.find((b) => sameScope(b.scope, selected)) ?? null : null), [budgets, selected]);

    useEffect(() => setRangeKey(null), [budget?.id, budget?.period, selected && scopeKey(selected)]);

    const now = new Date();
    const range: PeriodRange | null = budget
        ? rangeKey
            ? periodRange(budget.period, parseLocalISODate(rangeKey))
            : periodRange(budget.period, now)
        : null;
    const view = useMemo(
        () => (budget && range ? buildPeriodView(budget, transactions, businesses, categories, range, new Date()) : null),
        [budget, range?.key, transactions, businesses, categories],
    );
    const history = useMemo(
        () => (budget ? budgetHistory(budget, transactions, businesses, categories, new Date()) : []),
        [budget, transactions, businesses, categories],
    );

    const canGoForward = !!(budget && range && range.key < periodRange(budget.period, now).key);
    const goBack = () => budget && range && setRangeKey(previousPeriod(budget.period, range).key);
    const goForward = () => budget && range && canGoForward && setRangeKey(nextPeriod(budget.period, range).key);
    const selectRange = (key: string) => setRangeKey(key === periodRange(budget!.period, now).key ? null : key);

    return { loading, reload, scopes, selected, select: setSelected, budgets, budget, categories, range, view, history, canGoForward, goBack, goForward, selectRange };
}
```
(Import `parseLocalISODate` from `../dates`.)

- [ ] **Step 3: Commit.** `feat(budget): dashboard state hook and replayable sweep`

---

### Task 12: Dashboard components (use the `frontend-design` skill)

Build against `full-screen-v3.html`, `gauge-style-v2.html` and `chip-style.html`. Every colour comes from `theme.colors`; no hex literals in components. Each component stays under ~250 lines.

**`HatchPattern.tsx`:** `export function HatchPattern({ id, color, opacity = 0.22 }: { id: string; color: string; opacity?: number })` returns `<Pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><Line x1={0} y1={0} x2={0} y2={6} stroke={color} strokeOpacity={opacity} strokeWidth={2} /></Pattern>`. It is used inside each SVG's `<Defs>`. Category bars and the allocation bar are SVGs (`<Rect fill="url(#id)">`) so they can share it.

**`BudgetGauge.tsx`:**
- Props:
  ```ts
  { share: number; pacePct: number | null; warnAt: number; title: string; subtitle: string; spentText: string; limitText: string; caption: string; chip: React.ReactNode; onEdit: () => void; animKey: string }
  ```
- Geometry (viewBox 254×214, centre 127,118, R 92, stroke 20):
  - `ang(p) = (135 + 270p)°`; `pt(p, r) = [cx + r cos, cy + r sin]`.
  - `arc(p0, p1, r)` uses large-arc = (p1 − p0)·270 > 180.
- Layers:
  1. Hatched full track (`stroke="url(#hatch)"`).
  2. Glow wedge (centre → arc 0..p at R − 10) with a `RadialGradient` of the tip colour, opacity 0 → 0.32.
  3. Coloured arc: N = max(2, round(p·90)) segment paths, each stroked `budgetColour(p_i·100, warnAt, theme.colors)`, plus round caps as circles at both ends.
  4. Pace tick across the arc at `pacePct/100` in `onSurface` (only when not null).
  5. Hub circle in the tip colour.
  6. Caption text under the hub.
- `p = min(share, 100) / 100`.
- Sweep: wrap the glow and coloured arc in `<G mask="url(#reveal)">`. The `<Mask>` holds an `AnimatedPath` (`Animated.createAnimatedComponent(Path)`) of the full arc, stroke white, width 24. Its `strokeDasharray={[L, L]}` where `L = R·(3π/2)`, and `strokeDashoffset` is interpolated from `useSweep(animKey, reduced)` over `[0, 1] → [L, L·(1 − p)]`.
- Pointer: a triangle + hub drawn in a separate `Svg` inside an `Animated.View` absolutely positioned over the gauge with `transform: [{ rotate }]`. `rotate` is a native-driven rotation about the centre from `-135deg` to `(-135 + 270p)deg`. Drive it with `useSweep(animKey, reduced, 900, true)`; `useSweep` takes a 4th `native` flag that sets `useNativeDriver`. Draw the triangle pointing up (tip at (cx, cy − 62), base at cy − 36 ± 7) so a rotation of `ang − 270` aligns it.
- Footer row: left shows `spentText` (titleLarge, bold, tabular-nums), "of {limitText}" and the chip. Right shows the big percentage (`formatPercent(share)`, 34pt, colour = tip colour), counted up with `useCountUp(Math.round(share * 10), …) / 10`.
- Header row: title/subtitle on the left; a sliders button (lucide `SlidersHorizontal`, 34×34, `surfaceContainerHigh`, radius 12) on the right that calls `onEdit`.
- Accessibility: `accessibilityLabel` = "{title}: {spentText} of {limitText}, {percent} used".

**`PaceChip.tsx`:**
- Props: `{ tone: ChipTone; icon: ChipIcon; text: string }`.
- Tone → container/content tokens: success → `incomeContainer`/`onIncomeContainer` with icon `income`; warning → `goldContainer`/`onGoldContainer` with icon `gold`; error → `expenseContainer`/`onExpenseContainer` with icon `expense`.
- Icons: `CircleCheck`, `TrendingUp`, `CircleAlert` (size 13, strokeWidth 2.6).
- Pill radius `shape.full`, padding 5/10, labelMedium.

**`AllocationBar.tsx`:**
- Props: `{ rows: BudgetRow[]; limit: number; colorFor: (row) => string; progress: Animated.Value }`.
- Segments are `row.spent / max(limit, total)`, laid out left to right on a hatched track 16px high with radius 7.
- Grow: an `Animated.View` wrapping the filled segments, with `transform: scaleX` from `slice(progress, 0.2, 0.7)` and an origin trick via a `translateX` interpolation of `−width/2·(1 − t)`.
- Legend: a row of `■ {label} {formatPercent(spent / limit · 100)}`. Only show rows with spent > 0.

**`BudgetSummary.tsx`:**
- Props: `{ lines: SummaryLines; amountColor: string; rows; limit: number | null; colorFor; progress }`.
- Renders the sentence (titleMedium, amount span coloured), the forecast line (bodySmall `onSurfaceVariant`) and the `AllocationBar` when `limit !== null`.

**`CategoryLimitsCard.tsx`:**
- Props: `{ rows: BudgetRow[]; symbol: string; warnAt: number; pacePct: number | null; colorFor; progress: Animated.Value }`.
- Card: `card` background, hairline `border`, radius 20, padding 16. Header label "BY CATEGORY" (labelSmall, uppercase, `onSurfaceVariant`).
- Each `limit` row:
  - Name with a swatch.
  - On the right, "{left} left" or a `PaceChip`-styled over pill "Over by {x}".
  - A 10px bar on a hatched track, filled to `min(spent/limit, 1)` in `budgetColour(spent/limit·100, warnAt, …)`, with a pace tick at `pacePct` (`onSurface`, 2.5×16).
  - Footer row: "{spent} of {limit}" and `formatPercent` in the bar colour.
- `other`/`fees` rows show name + "{spent} · counts toward your total" without a bar.
- Rows rise in with `riseStyle(progress, 0.3 + i·0.05, 0.6 + i·0.05)`.
- Hidden entirely when `rows` is empty.

**`BudgetHistoryChart.tsx`:**
- Props: `{ points: HistoryPoint[]; period: BudgetPeriod; symbol: string; warnAt: number; selectedKey: string; onSelect: (key: string) => void; progress: Animated.Value }`.
- SVG width from `onLayout`, height 150.
- Scale top = `niceCeil(max(spent, limit))` over the points.
- Bars: width 30, radius 6, colour `budgetColour(spent/limit·100, warnAt, …)`, or `outline` when limit is null.
  - The current bar has 0.45 fill opacity and a dashed stroke.
  - The selected bar gets a 2px `onSurface` underline.
- Stepped dashed limit line: horizontal `outline` segments per point at the limit's y, joined by vertical steps; no segment where the limit is null.
- Labels: `formatPeriodShort` under each bar; the newest limit label at the top right ("limit {exactMoney}").
- Each bar is a `Pressable` overlay (absolute view per column) calling `onSelect(point.range.key)`.
- Grow: bar height scaled by `slice(progress, 0.4, 0.9)` using an `Animated.View` mask per column (`scaleY` with bottom origin via `translateY`).
- Summary line under the chart: "Under budget {x} of the last {y} {noun}s." counting closed points with a limit (`spent <= limit`). Omitted when y = 0.
- Section title "Last 6 {noun}s" + "tap a bar" hint. No card.

**`PeriodSwitcher.tsx`:**
- Props: `{ label: string; onBack: () => void; onForward: () => void; canGoForward: boolean }`.
- Two 34×34 radius-12 `surfaceContainerHigh` buttons with `ChevronLeft`/`ChevronRight`. The forward button is dimmed to `state.disabledContent` opacity and disabled when it can't go forward.
- Label in titleSmall.

**`ScopeChips.tsx`:**
- Props: `{ scopes: BudgetScope[]; selected: BudgetScope | null; businesses: Business[]; onSelect }`.
- Horizontal `ScrollView` of pills. Currency scopes read `All {currencyLabel}` with a lucide `Globe` (12px) prefix; cashbook scopes show the name.
- Selected chip: `inverseSurface` / `inverseOnSurface`. Others: `surfaceContainerHigh` / `onSurface`.
- Always shown when `scopes.length > 1` (even one cashbook gives a currency chip plus a cashbook chip, and both budget kinds are valid).

**`NewBudgetSheet.tsx`:**
- Props: `{ visible; onClose; businesses; transactions; budgets: Budget[]; onPick: (scope: BudgetScope, existing: Budget | null) => void }`.
- Uses `AppModal variant="bottomSheet" title="New budget" scrollable`.
- Two section rows (`BookOpen` icon "One cashbook" / "Limit spending in a single book"; `Globe` icon "All cashbooks in a currency" / "One limit across every book in a currency"). Tapping one expands its list (`LayoutAnimation`).
- List items: cashbook names or `All {currencyLabel} cashbooks · {n} books`. An item whose scope already has a budget shows "Already set · Edit" in `onSurfaceVariant` and calls `onPick(scope, existing)` to open edit.
- If exactly one currency exists, tapping the global row picks it directly.

- [ ] **Step 1: Load the frontend-design skill**, then build `HatchPattern`, `PaceChip`, `PeriodSwitcher` and `ScopeChips`. Run `npx tsc -b`; commit `feat(budget): chips, period switcher and pace chip`.
- [ ] **Step 2: Build `BudgetGauge`.** `tsc`; commit `feat(budget): speedometer gauge with threshold colours and sweep`.
- [ ] **Step 3: Build `AllocationBar`, `BudgetSummary`, `CategoryLimitsCard`.** `tsc`; commit `feat(budget): summary sentence, allocation bar and category card`.
- [ ] **Step 4: Build `BudgetHistoryChart`.** `tsc`; commit `feat(budget): six-period history chart with stepped limits`.
- [ ] **Step 5: Build `NewBudgetSheet`.** `tsc`; commit `feat(budget): new budget kind chooser`.

---

### Task 13: Dashboard screen

**Files:** Rewrite `src/screens/BudgetDashboardScreen.tsx` (target < 300 lines)

Structure:
```tsx
export default function BudgetDashboardScreen({ businesses, transactions, currentBusiness }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const reduced = useReducedMotion();
    const d = useBudgetDashboard(businesses, transactions, currentBusiness);
    const [editing, setEditing] = useState<{ scope: BudgetScope; budget: Budget | null } | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const animKey = `${d.selected ? scopeKey(d.selected) : ""}|${d.range?.key ?? ""}`;
    const progress = useSweep(animKey, reduced, 1200);
    // BackHandler: when editing, back closes setup (same pattern as today's useFocusEffect).
    if (editing) return <BudgetSetupScreen scope={editing.scope} budget={editing.budget} businesses={businesses} onBack={() => setEditing(null)} onSaved={async () => { setEditing(null); await d.reload(); }} />;
    ...
}
```
Render order:
1. Header: "Budget" (titleLarge) and a `New budget` tonal button (`Plus` icon) that opens the sheet.
2. If `businesses.length === 0`: the existing empty state ("No cashbooks yet").
3. `ScopeChips`.
4. If no budget for the selected scope: `EmptyScene variant="budget"`, "No budget for {scopeName}" and a "Set a budget" button that calls `setEditing({ scope: selected, budget: null })`.
5. Otherwise:
   - `PeriodSwitcher` (label `formatPeriodLabel`).
   - `BudgetGauge`, or, when `view.limit === null`, a plain text block with the "No limit was set…" sentence.
     - Gauge props: title `"{periodLabel} budget"`, subtitle `periodAdjective + " limit"` for a cashbook or `"All ₵ cashbooks · {n} books"` for a currency scope, chip from `paceChip`, caption `"{daysLeft} days left"` or `"Final"`, `onEdit` → `setEditing({ scope, budget })`.
   - A hairline divider (`outlineVariant`, margin 20/18).
   - `BudgetSummary`.
   - `CategoryLimitsCard`.
   - `BudgetHistoryChart` (`selectedKey = range.key`, `onSelect = d.selectRange`).
6. `RefreshControl` calls `d.reload` (no stale closure: `useCallback` depends on `[d.reload]`).
7. `TourOverlay` with 3 steps:
   - "Your budget at a glance": "The speedometer shows how much of your limit is gone. The tick marks where even spending would put you today."
   - "Cashbook or all books": "Budget one cashbook, or every cashbook in a currency, with the chips at the top."
   - "Look back": "Tap the arrows or a bar in the history chart to see how earlier periods went."
8. `NewBudgetSheet`. `onPick` → close the sheet, `d.select(scope)`, `setEditing({ scope, budget: existing })`.

`colorFor(row)`: `limit` rows use `theme.colors.chart[categoryIndex % 8]`, with the index by position among limit rows; `other` uses `theme.colors.outline`; `fees` uses `theme.colors.chartExpense`.

- [ ] **Step 1: Write the screen** (frontend-design skill), keeping styles in `createStyles(theme)`.
- [ ] **Step 2:** `npx tsc -b`. Expected: only errors left in `BudgetSetupScreen` (rewritten next).
- [ ] **Step 3: Commit.** `feat(budget): rebuilt budget dashboard`

---

### Task 14: Setup screen

**Files:** Rewrite `src/screens/BudgetSetupScreen.tsx`; Create `components/setup/CategoryLimitsEditor.tsx`, `components/setup/AlertSettingsCard.tsx`

Props: `{ scope: BudgetScope; budget: Budget | null; businesses: Business[]; onBack: () => void; onSaved: () => void }`.

State:
- `period`, `totalText`, `rows: { id: string; text: string }[]`, `alerts`, `permission: "granted" | "denied" | "undetermined"`, `error: DraftError | null`, `saving`.
- Initialise from `budget` using `limitsForPeriod(budget, periodRange(budget.period, new Date()).key)`. If that is null, fall back to the last entry. Show amounts as `toFixed(2)` with no thousands separators.
- Rows drop category ids not present in the expense categories (loaded with `loadCategories`).

Layout (mockup `setup.html`):
1. **Header:** back arrow, then the title (`budget ? "Edit budget" : "New budget"`) with the subtitle `scopeName` ("Main cashbook budget" / "Global ₵ budget": use `scope.kind === "currency" ? \`Global ${currencyLabel} budget\` : \`${name} budget\``).
2. **Period segmented control:** a `surfaceContainerHigh` track; the selected segment is `inverseSurface`/`inverseOnSurface`. When editing an existing budget and the period changes, show the inline note "Changing the period starts a fresh history." (bodySmall `onSurfaceVariant`).
3. **Total limit:** the symbol (`scopeSymbol`) + `TextInput` (headlineMedium, tabular-nums, `keyboardType="decimal-pad"`), underlined `onSurface` 2px. Helper text: "Includes everything you spend in {scopeName} each {noun}." Input sanitising: `/^[\d,]*\.?\d{0,2}$/`.
4. **`CategoryLimitsEditor`:**
   - Card. A live allocation bar (sum of the parsed rows vs total) on a hatched track, and "{allocated} allocated · {unallocated} unallocated".
   - Rows: swatch, name, amount input (`surfaceContainer`, radius 10, right-aligned), and an `X` remove button.
   - A dashed "Add category limit" button opens an `AppModal` picker of remaining expense categories ("All categories added" when none are left).
   - The row tied to `error.kind === "category"` gets an `error` border.
5. **`AlertSettingsCard`:**
   - Card with a `Switch` "Budget alerts" / "Notify me when spending crosses a threshold".
   - "Warn me at" with three chips 70/80/90 (the selected one uses `goldContainer` with a `gold` 1.5px border).
   - "You'll also be told when you reach 100%. Each alert fires once per period, for the total and for each category limit."
   - A colour strip: an SVG `LinearGradient` whose stops come from `budgetColour` at 0, warnAt − 20, warnAt and 100, with a label row "0% · {warnAt}% · 100%". Caption: "The speedometer colours follow this threshold."
   - When `alerts.enabled && permission === "denied"`, a note in `errorContainer`/`onErrorContainer`: "Notifications are off for this app, so you'll only see budget alerts while the app is open."
   - Turning the switch on: `const { status } = await Notifications.getPermissionsAsync(); `let { status } = await Notifications.getPermissionsAsync(); if (status === "undetermined") status = (await Notifications.requestPermissionsAsync()).status; setPermission(status)``.
6. **Inline error** above Save for `total` ("Enter a total limit above zero.") or `over` ("Category limits add up to {allocated}, more than the {total} total."). Save stays enabled; tapping it validates and shows the error.
7. **Save button:** full-width `inverseSurface`, radius 16. Disabled while saving.
   - On save: `validateDraft`; then `applyDraft(budget, scope, draft, new Date(), () => \`budget_${Date.now()}\`)`; then `upsertBudget`.
   - `"duplicate"` → `appAlert("Budget already exists", "This scope already has a budget. Edit it instead.")`.
   - `"error"` → `appAlert("Error", "Failed to save budget. Please try again.")`.
   - `"ok"` → `await refreshCashbookWidgets(); hapticSuccess(); onSaved();`. There is no success dialog; the dashboard sweep is the feedback.
8. **Delete budget** (only when editing): a text button in `error`. It calls `appAlert("Delete budget", "This removes the budget and its history. Your transactions are not affected.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await deleteBudget(budget.id); await refreshCashbookWidgets(); hapticError(); onSaved(); } }])`.

- [ ] **Step 1: Build** both setup components and the screen (frontend-design skill). The screen should stay under ~350 lines.
- [ ] **Step 2:** `npx tsc -b`. Expected: no errors.
- [ ] **Step 3: Commit.** `feat(budget): restyled setup with history-aware save, alerts and delete`

---

### Task 15: Docs, cleanup, verification

- [ ] **Step 1:** Delete `BUDGET_IMPLEMENTATION_SUMMARY.md` and `BUDGET_SCREEN_FLOWS.md`. Rewrite `BUDGET_FEATURE_GUIDE.md` as a short user/dev guide (≤ 80 lines) covering: kinds, periods (Monday weeks), limit history, pace/forecast rules, colours vs threshold, alerts (crossing rule, delivery, background limitation), and where the code lives.
- [ ] **Step 2:** `rg "budgetCalculations|getBudgetByBusinessId|budgetSelection|CategoryBudgetSpent|budgetBarColor|businessId ===.*budget" src App.tsx __tests__`. Expected: no hits.
- [ ] **Step 3:** `pnpm jest`. Expected: all suites pass. `npx tsc -b`. Expected: clean. `npx eslint src App.tsx --ext .ts,.tsx`. Expected: no new errors.
- [ ] **Step 4: Run the CLAUDE.md pre-completion checks:**
  - Secrets scan.
  - N+1 / perf review (alert check cost, history recomputation).
  - Security review of new inputs (money parsing, category names).
  - A fresh-eyes read of every changed file.
- [ ] **Step 5:** Fable adversarial code review (big feature). Fold in findings and re-run tests/tsc.
- [ ] **Step 6: Commit.** `docs(budget): concise budget guide; remove stale budget docs`
- [ ] **Step 7: On-device check via a demo build.**
  - The gauge sweep and pointer.
  - Period switching and history taps.
  - Global vs cashbook budgets.
  - An alert after a manual entry, and one queued behind the PIN lock.
  - An auto-log alert while the app is backgrounded but alive.
  - Dark mode and reduced motion.

---

## Review amendments (Opus plan review, 2026-10-11): apply during execution

1. **Dates:** add `parseTxDate(s)` to `dates.ts`. It returns `parseLocalISODate(s)` when `s.length === 10`, else `new Date(s)`. Use it in `spend.ts` and `evaluateAlerts.ts` instead of `new Date(t.date)`, because recurring transactions store date-only strings. Test it in `dates.test.ts`, and add a spend case with a date-only string on the 1st.
2. **Gauge glow:** the glow wedge is **not** masked. It fades in with `slice(progress, 0.5, 1)`, and only the coloured arc is inside the reveal mask.
3. **Gauge pointer:** the pointer overlay is a square `Animated.View` centred on the hub (size 2×(R−20) scaled to rendered width), rotating about its own centre.
4. **Sweep on device:** verify the masked sweep on device right after building the gauge. Fallback: draw segments up to `p·t` from an `Animated` listener into state, without a mask.
5. **Alert tests:**
   - Add `__tests__/budget/checkBudgetAlerts.test.ts`. Mock `utils/storage` (`loadBusinesses`, `loadCategories`), `storage/budgetStore` (`loadBudgets`), `alerts/ledger` (in-memory) and `alerts/deliverAlerts` (factory). Then `Promise.all` two identical checks and assert `deliverAlerts` is called once.
   - Add an evaluateAlerts case: a limit lowered below existing spend, then a small expense → no line for the already-exceeded thresholds (`prev ≥ th`).
6. **Widget:** keep the `totalLimit > 0` guard (`percentage = limit > 0 ? … : 0`).
7. **Tour:** steps include an `icon`, and use a new tour page key `"budget-v2"` (extend `TourPage`) so existing users see the new tour.
8. **Lint:** the repo has no eslint, so Task 15 lint is skipped. `tsc -b` plus tests are the gate.
9. **Money input:** the sanitiser allows `^\d[\d,]*\.?\d{0,2}$|^$`, and `parseMoney` strips a trailing "." before parsing.
10. **Gauge %:** shows the count-up while animating, then `formatPercent(share)` once it finishes.
11. **`useSweep`:** uses `Easing.linear` (`slice` eases).
12. **`useBudgetDashboard`:** the memos depend on the current period key as well. Import `parseLocalISODate`.
13. **Month names:** export `monthName(d)` from `periods.ts`. The gauge title is `"{Month} budget"` for monthly, `"This week's budget"`/`"{yyyy} budget"` otherwise. `summaryLines`' `periodLabel` uses `monthName` for monthly.
14. **Category add:** uses `persistNewCategory` (dedupes, reloads first). If the returned category already existed, show the duplicate alert.
15. **Spec alignment:**
    - Save is disabled while categories exceed the total, with the inline error (as in the spec); other validation errors show on tap.
    - The setup title follows the spec ("{Cashbook} budget" / "Global {₵} budget"), with "New"/"Edit" as an overline.
    - The sweep replays from 0 and the past-period chip reads "Finished ₵ X over/under". The spec is updated to match.

