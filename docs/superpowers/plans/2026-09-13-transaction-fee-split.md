# Transaction Fee/Tax Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the auto-detected fee/tax out of a transaction's `amount` into a separate, transparent `fee` field, keeping all balances/budgets/reports numerically unchanged and surfacing fees as their own insight.

**Architecture:** Add one optional `fee?: number` field (principal stays in `amount`). A single `grossAmount(t) = amount + (fee ?? 0)` helper backfills every spend/balance/trend total. Category breakdowns keep principal slices plus a synthetic "Fees & Taxes" slice so they reconcile with gross totals. No data migration — old rows (`fee` undefined) evaluate identically.

**Tech Stack:** React Native 0.81 + Expo 54, TypeScript, Jest + ts-jest. Data in AsyncStorage. Package manager: **pnpm** (fallback to whatever lockfile exists — this repo has no lockfile committed, so use `npx jest`/`npx tsc`).

**Reference spec:** `docs/superpowers/specs/2026-09-13-transaction-fee-split-design.md`

---

## File Structure

**New:**
- `src/utils/transactionAmount.ts` — `grossAmount` helper + `FEES_CATEGORY_LABEL` constant
- `src/utils/__tests__/transactionAmount.test.ts`

**Modified — types:**
- `src/types.ts` — `Transaction.fee?`
- `src/features/autoLogging/types/index.ts` — `ParsedDraft.fee?`
- `src/features/autoLogging/services/parser/providers/types.ts` — `ParseOutput.fee?`
- `src/features/autoLogging/hooks/useAutoLogQueue.ts` — `ConfirmEdits.fee?` + set on confirm

**Modified — parser/pipeline:**
- `src/features/autoLogging/services/parser/normalize.ts` — extend `FEE_HINT_RE`
- `src/features/autoLogging/services/parser/providers/helpers.ts` — stop fold, set `fee`
- `src/features/autoLogging/services/parser/keywordClassifier.ts` — stop fold, set `fee`
- `src/features/autoLogging/services/parser/engine.ts` — map `output.fee` → `draft.fee`
- `src/features/autoLogging/services/ingestion/saveDraft.ts` — `draftToTransaction` set `fee`

**Modified — aggregations:**
- `src/utils/cashbookBalance.ts`, `src/utils/budgetCalculations.ts`, `src/utils/reportCalculations.ts`
- `src/screens/DashboardScreen.tsx`, `src/screens/BusinessDetailView.tsx`, `src/screens/BusinessesScreen.tsx`
- `src/components/CashbookDetailSheet.tsx`

**Modified — UI:**
- `src/components/TransactionDetailModal.tsx`, `src/components/TransactionItem.tsx`, `src/components/dashboard/RecentTransactions.tsx`
- `src/features/autoLogging/components/ReviewItemCard.tsx`, `src/components/TransactionEntryModal.tsx`
- `src/screens/ReportsScreen.tsx`

**Tests:** parser fee split, grossAmount, aggregation regression, category synthetic slice, widget balance, dedupe.

---

## Task 1: Foundation — `fee` field + `grossAmount` helper

**Files:**
- Create: `src/utils/transactionAmount.ts`, `src/utils/__tests__/transactionAmount.test.ts`
- Modify: `src/types.ts` (Transaction), `src/features/autoLogging/types/index.ts` (ParsedDraft), `src/features/autoLogging/services/parser/providers/types.ts` (ParseOutput), `src/features/autoLogging/hooks/useAutoLogQueue.ts` (ConfirmEdits interface only)

- [ ] **Step 1: Write the failing test** — `src/utils/__tests__/transactionAmount.test.ts`

```ts
import { grossAmount, FEES_CATEGORY_LABEL } from "../transactionAmount";

describe("grossAmount", () => {
  it("returns amount when fee is undefined (backward compatible)", () => {
    expect(grossAmount({ amount: 100 })).toBe(100);
  });
  it("adds fee to amount", () => {
    expect(grossAmount({ amount: 100, fee: 2.5 })).toBe(102.5);
  });
  it("treats fee 0 as no fee", () => {
    expect(grossAmount({ amount: 100, fee: 0 })).toBe(100);
  });
  it("exposes the fees category label", () => {
    expect(FEES_CATEGORY_LABEL).toBe("Fees & Taxes");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/transactionAmount.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/utils/transactionAmount.ts`

```ts
import { Transaction } from "../types";

export const FEES_CATEGORY_LABEL = "Fees & Taxes";

/** Total money moved by a transaction: principal plus any fee/tax. */
export const grossAmount = (t: Pick<Transaction, "amount" | "fee">): number =>
    t.amount + (t.fee ?? 0);
```

- [ ] **Step 4: Add the `fee` field to the four types.**

`src/types.ts` — in `Transaction`, after `transferId?: string;`:
```ts
    fee?: number; // fee/tax portion, same currency as amount; expense/transfer only
```
`src/features/autoLogging/types/index.ts` — in `ParsedDraft`, after `providerId?: string;`:
```ts
    fee?: number;
```
`src/features/autoLogging/services/parser/providers/types.ts` — in `ParseOutput`, add:
```ts
    fee?: number;
```
`src/features/autoLogging/hooks/useAutoLogQueue.ts` — in `ConfirmEdits`, add:
```ts
    fee?: number;
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx jest src/utils/__tests__/transactionAmount.test.ts && npx tsc -b`
Expected: test PASS; tsc no new errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add fee field to transaction types and grossAmount helper"
```

---

## Task 2: Parser — stop folding, plumb `fee`, extend detection

**Files:**
- Modify: `src/features/autoLogging/services/parser/normalize.ts:57`, `providers/helpers.ts:56-74`, `keywordClassifier.ts:144-146` + its return object (`~164`), `engine.ts:82-99`
- Test: `src/features/autoLogging/services/parser/__tests__/feeSplit.test.ts` (create; if a parser test dir already exists, colocate)

- [ ] **Step 1: Write the failing test** — new file `feeSplit.test.ts`

```ts
import { parseEvent } from "../engine";
import { RawEvent } from "../../../types";

const ev = (body: string): RawEvent => ({
  id: "1", source: "sms", sender: "GCB", body,
  timestamp: Date.now(), rawHash: "h",
});

describe("fee/tax split", () => {
  it("splits fee out of expense amount instead of folding", () => {
    const d = parseEvent(ev("Payment of GHS 100.00 to SHOPRITE. Fee GHS 2.50. Bal GHS 5"), []);
    expect(d).not.toBeNull();
    expect(d!.amount).toBe(100);
    expect(d!.fee).toBe(2.5);
  });
  it("detects the literal word 'tax'", () => {
    const d = parseEvent(ev("Debit GHS 50.00 at MTN. Tax GHS 1.00"), []);
    expect(d!.amount).toBe(50);
    expect(d!.fee).toBe(1);
  });
  it("does not set fee on income", () => {
    const d = parseEvent(ev("You have received GHS 200.00 from KOFI. Fee GHS 1.00"), []);
    expect(d!.type).toBe("income");
    expect(d!.fee).toBeUndefined();
  });
  it("leaves fee undefined when no fee present", () => {
    const d = parseEvent(ev("Payment of GHS 100.00 to SHOPRITE"), []);
    expect(d!.fee).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest feeSplit`
Expected: FAIL — `amount` is 102.5 (folded), `fee` undefined.

- [ ] **Step 3: Extend detection** — `normalize.ts:57`

```ts
const FEE_HINT_RE = /\b(fee|fees|commission|levy|surcharge|stamp\s*duty|vat|service\s*charge|transaction\s*charge|tax|withholding)\b/i;
```

- [ ] **Step 4: Stop folding in `providers/helpers.ts`** — replace `buildBase` body around lines 56-63:

Replace:
```ts
    const finalAmount = (opts.type === "expense" || opts.type === "transfer")
        ? amount.amount + (amount.fee ?? 0)
        : amount.amount;
    return {
        amount: finalAmount,
```
with:
```ts
    const isOutflow = opts.type === "expense" || opts.type === "transfer";
    return {
        amount: amount.amount,
        fee: isOutflow ? amount.fee : undefined,
```
(keep the rest of the returned object; `fee` is a new property on `ParseOutput`.)

- [ ] **Step 5: Map fee through `engine.buildDraft`** — `engine.ts`, in the returned draft object (after `amount: output.amount,`):

```ts
        amount: output.amount,
        fee: output.fee,
```

- [ ] **Step 6: Stop folding in `keywordClassifier.ts`** — replace lines 144-146:

```ts
    const isOutflow = cls.type === "expense" || cls.type === "transfer";
    const finalAmount = amountResult.amount;
    const fee = isOutflow ? amountResult.fee : undefined;
```
and in the returned draft object (`~165`), change `amount: finalAmount,` to keep it and add `fee,` immediately after.

- [ ] **Step 7: Run tests + typecheck**

Run: `npx jest feeSplit && npx tsc -b`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: parser splits fee/tax from amount and detects tax/withholding"
```

---

## Task 3: Save paths carry the fee

**Files:**
- Modify: `src/features/autoLogging/services/ingestion/saveDraft.ts:146-163` (`draftToTransaction`), `src/features/autoLogging/hooks/useAutoLogQueue.ts:39-54` (`confirm`)
- Test: extend an existing saveDraft/plan test, or add assertions to `feeSplit.test.ts` via `planSaveDraft`.

- [ ] **Step 1: Write the failing test** (append to `feeSplit.test.ts`)

```ts
import { planSaveDraft } from "../../ingestion/saveDraft";
import { AutoLogSettings } from "../../../types";

const settings = {
  enabled: true, captureSms: true, captureNotifications: true, defaultCurrency: "GHS",
  allowedPackages: [], allowedSenders: [], reviewLowConfidenceOnly: false,
  askBeforeSaving: false, minConfidenceForAutoSave: 0, defaultCurrencyMigrated: true,
} as AutoLogSettings;

it("persists fee onto the auto-saved transaction", () => {
  const draft = parseEvent(ev("Payment of GHS 100.00 to SHOPRITE. Fee GHS 2.50"), [])!;
  const plan = planSaveDraft({ draft, settings, businesses: [], transactions: [], mappings: [] });
  expect(plan.transaction?.amount).toBe(100);
  expect(plan.transaction?.fee).toBe(2.5);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest feeSplit`
Expected: FAIL — `plan.transaction.fee` undefined.

- [ ] **Step 3: Implement** — `saveDraft.ts` `draftToTransaction`, add after `amount: draft.amount,`:

```ts
        amount: draft.amount,
        fee: draft.type === "income" ? undefined : draft.fee,
```

- [ ] **Step 4: Implement** — `useAutoLogQueue.ts` `confirm`, add after `amount: edits?.amount ?? item.draft.amount,`:

```ts
                amount: edits?.amount ?? item.draft.amount,
                fee: item.draft.type === "income" ? undefined : (edits?.fee ?? item.draft.fee),
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx jest feeSplit && npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: carry fee through auto-save and review-confirm paths"
```

---

## Task 4: Aggregation helpers use gross; category breakdown gets synthetic slice

**Files:**
- Modify: `src/utils/cashbookBalance.ts` (both functions), `src/utils/budgetCalculations.ts:44-55` (`calculateCategorySpent`), `src/utils/reportCalculations.ts` (`getMonthlyTrends`, `getMonthComparison`, `getBiggestTransactions`, `getCategoryBreakdown`, `getTopCategories`)
- Test: `src/utils/__tests__/feeAggregation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { computeCashbookBalance } from "../cashbookBalance";
import { getCategoryBreakdown } from "../reportCalculations";
import { FEES_CATEGORY_LABEL } from "../transactionAmount";
import { Transaction } from "../../types";

const tx = (o: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(), description: "x", amount: 0, date: "2026-09-10",
  type: "expense", businessId: "b1", ...o,
});

it("balance counts fee as outflow", () => {
  const list = [tx({ type: "income", amount: 100 }), tx({ type: "expense", amount: 40, fee: 2 })];
  expect(computeCashbookBalance(list, "b1")).toBe(58); // 100 - (40+2)
});

it("old rows without fee are unchanged", () => {
  expect(computeCashbookBalance([tx({ type: "expense", amount: 42 })], "b1")).toBe(-42);
});

it("category breakdown adds a Fees & Taxes slice summing to gross", () => {
  const list = [tx({ category: "Food", amount: 50, fee: 2 }), tx({ category: "Food", amount: 30 })];
  const b = getCategoryBreakdown(list, new Date("2026-09-01"), new Date("2026-09-30"), "expense");
  const food = b.find((c) => c.name === "Food")!;
  const fees = b.find((c) => c.name === FEES_CATEGORY_LABEL)!;
  expect(food.amount).toBe(80);   // principal only
  expect(fees.amount).toBe(2);    // synthetic slice
  expect(food.amount + fees.amount).toBe(82); // == gross total
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest feeAggregation`
Expected: FAIL.

- [ ] **Step 3: Implement `cashbookBalance.ts`** — import `grossAmount` and replace expense reads:

`computeCashbookBalance` line 9: `(t.type === "income" ? sum + t.amount : sum - grossAmount(t))`
`computeMonthFlows` line 26: `else expense += grossAmount(t);`

- [ ] **Step 4: Implement `budgetCalculations.ts`** — import `grossAmount`; line 54 `.reduce((sum, t) => sum + grossAmount(t), 0)`.

- [ ] **Step 5: Implement `reportCalculations.ts`** — import `grossAmount` and `FEES_CATEGORY_LABEL`.
  - `getMonthlyTrends` line 42: `else exp += grossAmount(t);`
  - `getMonthComparison` lines 100 & 103: expense branches use `grossAmount(t)`.
  - `getBiggestTransactions`: sort by `grossAmount(b) - grossAmount(a)` (was `b.amount - a.amount`).
  - `getCategoryBreakdown`: keep the per-category map on `t.amount` (principal). After building `map`, sum fees `const feeTotal = filtered.reduce((s, t) => s + (t.fee ?? 0), 0);` and if `feeTotal > 0 && type === "expense"` add `map[FEES_CATEGORY_LABEL] = (map[FEES_CATEGORY_LABEL] || 0) + feeTotal;`. Change `total` to `Object.values(map).reduce(...)` so percentages use the fee-inclusive total.
  - `getTopCategories`: same synthetic bucket for `type === "expense"` — after the loop, if `feeTotal > 0` add a `{ amount: feeTotal, count: <number of tx with fee> }` entry under `FEES_CATEGORY_LABEL`.

- [ ] **Step 6: Run tests + typecheck**

Run: `npx jest feeAggregation && npx tsc -b`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: route balance/budget/report totals through grossAmount with fees slice"
```

---

## Task 5: Screen-level aggregations use gross

**Files:** `src/screens/DashboardScreen.tsx` (L82,85,281,334), `src/screens/BusinessDetailView.tsx` (L134,137,158,165,182), `src/screens/BusinessesScreen.tsx` (L148,427,430), `src/components/CashbookDetailSheet.tsx` (L71,94,100,113)

No new unit tests (screen code); rely on tsc + manual verification. For each: import `grossAmount` (and `FEES_CATEGORY_LABEL` where a category map exists) from `../utils/transactionAmount` (adjust relative path) and:

- [ ] **Step 1: DashboardScreen** — expense reducers at L85 (`totalExpense`) and L281 (`map[c].expense`) use `grossAmount(t)`; L334 net reducer expense branch `acc - grossAmount(t)`. Income branches unchanged.

- [ ] **Step 2: BusinessDetailView** — L137 `totalExpense`, L165 daily expense, L182 category map: category map keeps `t.amount` (principal) and add a `Fees & Taxes` entry: after building `catMap`, add fee total under `FEES_CATEGORY_LABEL` (mirror Task 4 getCategoryBreakdown). The header expense total (L137) uses `grossAmount`.

- [ ] **Step 3: BusinessesScreen** — L148 expense, L427/430 per-cashbook expense totals use `grossAmount(t)`.

- [ ] **Step 4: CashbookDetailSheet** — L71 expense total, L100 expense (if expense branch), L113 category map add fees slice like above. L94 income stays.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc -b`
```bash
git add -A && git commit -m "feat: screen totals count fees via grossAmount; category views show Fees & Taxes"
```

---

## Task 6: Transaction display shows gross; detail modal shows the split

**Files:** `src/components/TransactionDetailModal.tsx` (L79 headline, add rows), `src/components/TransactionItem.tsx:38`, `src/components/dashboard/RecentTransactions.tsx:64`, `src/screens/ReportsScreen.tsx:341` (biggest list), `src/screens/BusinessDetailView.tsx:626` (row list)

- [ ] **Step 1: Row displays use gross.** In each row/list that shows a single transaction's magnitude, pass `grossAmount(transaction)` instead of `transaction.amount` to the `MoneyText`/display: `TransactionItem.tsx:38`, `RecentTransactions.tsx:64`, `BusinessDetailView.tsx:626`, and `ReportsScreen.tsx:341` (`-{symbol}{grossAmount(tx)...}`). Import `grossAmount`.

- [ ] **Step 2: TransactionDetailModal** — headline (L77-80) shows gross:
```tsx
{transaction.type === "income" ? "+" : "-"}{symbol}{grossAmount(transaction).toLocaleString()}
```
Then in the info section (after the Category `DetailRow`, ~L119), when `transaction.fee && transaction.fee > 0`, render two rows:
```tsx
{transaction.fee ? (
  <>
    <DetailRow icon={<Tag .../>} label="Amount (excl. fees)" value={`${symbol}${transaction.amount.toLocaleString()}`} styles={styles} />
    <DetailRow icon={<Info .../>} label="Fees & Taxes" value={`${symbol}${transaction.fee.toLocaleString()}`} styles={styles} />
  </>
) : null}
```
(Use an existing lucide icon already imported, e.g. `Info`.)

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc -b`
```bash
git add -A && git commit -m "feat: show gross on transaction rows and fee split in detail modal"
```

---

## Task 7: Review card + manual entry expose the fee

**Files:** `src/features/autoLogging/components/ReviewItemCard.tsx`, `src/components/TransactionEntryModal.tsx`, `src/screens/BusinessDetailView.tsx` (`handleEntrySubmit` ~L260-315), and any other `TransactionEntryModal` `onSubmit` caller.

- [ ] **Step 1: ReviewItemCard** — headline `MoneyText` (L67-72) shows `grossAmount(item.draft)` (draft has `amount`+`fee`; import `grossAmount`). Add local `const [fee, setFee] = useState(item.draft.fee?.toString() ?? "");`. In the expanded editor, after the Amount input add a "Fee / tax" `TextInput` (decimal-pad) bound to `fee`. In `handleConfirm`, parse it and add to edits when changed:
```ts
const parsedFee = parseFloat(fee);
if (fee.trim() === "") { if (item.draft.fee != null) edits.fee = 0; }
else if (Number.isFinite(parsedFee) && parsedFee !== item.draft.fee) edits.fee = parsedFee;
```
(Show the fee input only when `item.draft.type !== "income"`.)

- [ ] **Step 2: TransactionEntryModal** — add `const [fee, setFee] = useState("");`. Hydrate in the `editingTx` effect: `setFee(editingTx.fee?.toString() ?? "")` (else `setFee("")`). Render an optional "Fee / tax ({symbol})" `TextInput` (decimal-pad) below Amount, shown only when `currentType === "expense"`. Extend `onSubmit` payload type with `fee?: number` and pass `fee: currentType === "expense" && fee.trim() !== "" && Number.isFinite(parseFloat(fee)) ? parseFloat(fee) : undefined`. Validate ≥ 0 (reject negatives via `appAlert`). Clear `fee` in `handleClose`/after submit and when toggled to income (`handleTypeChange`).

- [ ] **Step 3: BusinessDetailView `handleEntrySubmit`** — thread `fee` from the payload onto the created/edited transaction. In the **edit branch** (spreads `...t`), set `fee: data.entryType === "expense" ? data.fee : undefined` so it updates or clears (never retains stale). In the create branch, same.

- [ ] **Step 4: Other callers** — grep `TransactionEntryModal` usages; any other `onSubmit` handler (e.g. DashboardScreen) must accept the optional `fee` (defaults undefined, no behavior change). `QuickAddModal` is intentionally left without a fee input.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc -b`
```bash
git add -A && git commit -m "feat: edit fee in review queue and manual transaction entry"
```

---

## Task 8: Reports "Fees & Taxes" metric + CSV columns

**Files:** `src/screens/ReportsScreen.tsx`, `src/screens/BusinessDetailView.tsx:381-385` (CSV)

- [ ] **Step 1: Reports metric** — compute `const feesTotal = periodFilteredTx.reduce((s, t) => s + (t.fee ?? 0), 0);` over the same period/cashbook filter Reports already uses, and render a StatCard labelled "Fees & Taxes" showing `{symbol}{feesTotal}`. Reuse the existing `StatCard`/stat component and theme tokens (no hardcoded colors). Only render when `feesTotal > 0` (or always, per existing card layout — match the surrounding StatCards).

- [ ] **Step 2: CSV export** — in the row map (L385), add fee and total columns:
```ts
return `${date},${t.type},${t.amount},${t.fee ?? 0},${grossAmount(t)},"${(t.description || "").replace(/"/g, '""')}",${t.category || ""},"${(t.remark || "").replace(/"/g, '""')}"`;
```
Update the CSV header row (find where the header string is built) to include `Fee,Total` in matching positions. Import `grossAmount`.

- [ ] **Step 3: Typecheck + full test run + commit**

Run: `npx tsc -b && npx jest`
Expected: all green.
```bash
git add -A && git commit -m "feat: Fees & Taxes report metric and CSV fee/total columns"
```

---

## Final verification (orchestrator, after all tasks)

- [ ] `npx tsc -b` — zero errors.
- [ ] `npx jest` — all pass.
- [ ] Security scan: no hardcoded secrets/keys; new inputs (fee) validated (finite, ≥ 0); no injection surface (CSV values quoted).
- [ ] Fresh-eyes read of every changed file for correctness.
- [ ] Fable adversarial review of the full diff (`git diff main...HEAD`).
- [ ] Fix anything found; re-run tsc + jest.
