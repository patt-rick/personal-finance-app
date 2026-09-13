# Design: Transparent fee/tax split on transactions

**Date:** 2026-09-13
**Status:** Approved (pending final spec review)
**Reviewed with:** Fable (adversarial review, 2026-09-13)

## Problem

The SMS auto-logging parser detects a fee/tax (VAT, levy, commission, etc.) in a
transaction message and **folds it into the amount**: `finalAmount = amount + fee`
(`providers/helpers.ts`, `keywordClassifier.ts`). The fee is invisible to the user,
cannot be reported on, and there is no separate field for it.

We want the fee to be **transparent** (shown separately) while remaining **linked** to
its parent transaction so that deleting, transferring, or reassigning the transaction
carries the fee with it — and so users can see how much they lose to fees/taxes.

## Decisions

| Decision | Choice |
|---|---|
| Data model | Single field `fee?: number` on the transaction (no linked records) |
| Insight | Dedicated "Fees & Taxes" metric **and** a reconciling synthetic donut slice |
| Scope | Auto-logged **and** manual entry (full entry modal; QuickAdd stays minimal) |
| Income | Fees are **never** applied to income (expense/transfer only) — unchanged |
| Detection | Extend detector to also match `tax`, `withholding` |
| Field name | `fee` (matches `AmountResult.fee`; captures are mostly fees, not taxes). UI label: "Fees & Taxes" |

## Data model

Add one optional field — no linked/second record:

```ts
// Transaction (src/types.ts)
fee?: number;   // fee/tax portion, same currency as `amount`; expense/transfer only
```

- `amount` = **principal** (net of fee). `fee` = the fee portion. Money moved = `amount + fee`.
- "Linked" is inherent: one row, so delete / cashbook-transfer / reassign carry the fee
  automatically — **zero cascade code**.
- Income transactions never set `fee`.

Mirror the field on the pipeline types:

- `ParsedDraft` (`features/autoLogging/types/index.ts`) — `fee?: number`
- `ParseOutput` (`features/autoLogging/services/parser/providers/types.ts`) — `fee?: number`
- `ConfirmEdits` (`features/autoLogging/hooks/useAutoLogQueue.ts`) — `fee?: number`

## The correctness pivot: `grossAmount`

Because `amount` no longer includes the fee, **every balance / spend / trend total must add
the fee back** or balances drop by the fee total. Introduce one helper:

```ts
// src/utils/transactionAmount.ts
export const grossAmount = (t: Pick<Transaction, "amount" | "fee">) =>
    t.amount + (t.fee ?? 0);
```

**Backward compatibility (verified):** old stored rows have `fee` undefined, so
`grossAmount = amount` = the previously-folded total — unchanged. New rows store principal +
fee, so `grossAmount` = the same total. No migration required.

### Sites routed through `grossAmount` (spend/balance/trend totals)

- `src/utils/cashbookBalance.ts` — `computeCashbookBalance`, `computeMonthFlows`
  (this also fixes **widgets**, which call these via `features/widgets/services/widgetData.ts`)
- `src/utils/budgetCalculations.ts` — `calculateCategorySpent` (fee was in budget spend before; preserve)
- `src/utils/reportCalculations.ts` — `getMonthlyTrends`, `getMonthComparison`, `getBiggestTransactions` (gross for both sort and display)
- `src/screens/DashboardScreen.tsx` — cashbook card totals, currency balances, weekly net
- `src/screens/BusinessDetailView.tsx` — header totals, daily chart
- `src/screens/BusinessesScreen.tsx` — per-currency income/expense, per-cashbook totals
- `src/components/CashbookDetailSheet.tsx` — income/expense totals

### Category aggregations: one consistent convention

All category-grouped views keep category slices on **principal** and add a **synthetic
"Fees & Taxes" bucket** = sum of fees, so slices sum to gross and reconcile with the trends
chart and balances.

Applies uniformly to:
- `getCategoryBreakdown` (`reportCalculations.ts`) — donut on ReportsScreen
- `getTopCategories` (`reportCalculations.ts`) — top-categories list
- `categoryPieData` in `BusinessDetailView.tsx`
- `topCategories` in `CashbookDetailSheet.tsx`

Rationale (from review): the Reports "Monthly Trends" bar (gross) and the "Expense Breakdown"
donut center-total live on the **same carousel**. If the donut summed only principal it would
disagree with the bar by the fee total for any month with fees. The synthetic slice keeps them
reconciled and doubles as the dedicated metric (it appears as its own labeled line, never
blended into Food/Transport/etc.).

## Parser changes

- **Stop folding** the fee into the amount:
  - `providers/helpers.ts` `buildBase` — set `amount = amount.amount`, `fee = amount.fee`
    (expense/transfer only; income leaves `fee` unset).
  - `keywordClassifier.ts` `classifyEvent` — same; set `draft.fee` (expense/transfer only).
- **Plumb** the fee through: `ParseOutput.fee` → `engine.buildDraft` → `ParsedDraft.fee`.
- **Extend detection** `FEE_HINT_RE` (`normalize.ts`) to add `tax` and `withholding`
  (`levy` already matches `e-levy` / `e levy` / `govt levy` via `\b`).

## Save paths (must not drop the fee)

- `saveDraft.ts` `draftToTransaction` (auto-save path) — set `fee` (undefined for income).
- `useAutoLogQueue.ts` `confirm` (review path) — `fee: edits?.fee ?? item.draft.fee`.

## Dedupe

No change. `match.ts` / `fingerprint.ts` compare `draft.amount`, which is now the **principal**.
Keeping dedupe on principal is correct and **fixes an existing bug**: today an SMS-with-fee
(101) and its fee-less notification (100) never match and double-log; post-change both are
principal (100) and dedupe correctly.

Known minor risk: a message auto-logged *before* this change (stored gross) whose duplicate
arrives from a *different* channel *after* the change (draft principal) could miss dedupe once,
during the update window. Bounded by the 2-min match / 24h candidate windows and one-time.
Not mitigated in v1 (optional future: also match `candidate.amount === grossAmount(draft)`).

## UI surfaces

- **Transaction rows** (`TransactionItem`, `RecentTransactions`, `BusinessDetailView` list,
  Reports "biggest" list) — display **gross**, so lists visually sum to the balance.
- **TransactionDetailModal** — headline shows **gross**; when `fee > 0`, add rows
  "Amount (excl. fees)" = principal and "Fees & Taxes" = fee.
- **ReviewItemCard** — headline shows amount **+ fee together** (gross) to prevent the user
  "correcting" the principal up to the SMS total and double-counting. Expanded editor gets an
  **Amount** (principal) and a **Fee** input; both thread into `ConfirmEdits`.
- **Manual entry** — `TransactionEntryModal` gains an optional **"Fee / tax"** input:
  hydrate `editingTx.fee` on edit, validate (finite, ≥ 0), strip fee when toggled to income,
  and clear it when appropriate. `onSubmit` payload gains `fee`. `QuickAddModal` stays minimal
  (no fee input — preserves the quick path; `fee` undefined).
  Update call sites: `BusinessDetailView` `handleEntrySubmit` (incl. the edit branch that
  spreads `...t` — must set/clear `fee`, not retain a stale value).
- **Reports** — a "Fees & Taxes" StatCard = `sum(t.fee ?? 0)` over the active period/cashbook
  filter (same number as the synthetic donut slice).

## CSV export

`BusinessDetailView` export (`~L381-385`) currently writes only `amount` (now principal).
Add **`Fee`** and **`Total`** columns (and the matching header) so exported rows still sum to
the balance and the fee is not lost.

## Not affected (verified)

`transfers.ts` (`createTransferPair` — manual transfers have no fee; `removeTransactionWithPair`
already cascades by `transferId`), `recurringTransactions.ts`, Debt / DebtPayment amounts,
`RecurringTransactionModal`.

## Testing

- **Parser:** fee split on both provider-template and keyword paths; income never sets fee;
  new keywords (`tax`, `withholding`); principal vs. fee values correct.
- **`grossAmount`:** unit tests incl. `fee` undefined → `amount`.
- **Aggregation regression:** balances, budget spend, and trends are numerically **unchanged**
  vs. the old folded behavior for equivalent inputs (old-folded fixture vs. new-split fixture).
- **Category breakdown:** synthetic "Fees & Taxes" slice present and slices sum to gross.
- **Widgets:** `cashbookBalance` / `widgetData` with fee fixtures match in-app balance.
- **Dedupe:** SMS+notification pair with a fee logs once (regression for the fixed bug).

## Known limitations (pre-existing, now user-visible)

- `looksLikeFee` only scans the 24 chars **before** the amount, so a fee keyword *after* its
  amount (e.g. `GHS1.00 E-levy`) is missed.

  This pre-dates this change; documenting because the fee is now a visible field.

## Resolved (parser-hardening, 2026-09-13)

- Multiple fee candidates in one message are now **summed** (all same-currency `suspectedFee`
  amounts), so a message like `Fee: GHS 0.50. E-levy: GHS 1.00` reports `fee: 1.5` rather than
  only the first `0.50`. (Was: "only the first fee candidate is captured".)
