# Parser Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. Full repro strings + severity for each finding are in `docs/superpowers/reviews/2026-09-13-parser-audit.md` (referenced as F1..F22).

**Goal:** Fix the confirmed defects in the auto-logging SMS/notification parser so it stops creating confidently-wrong ledger entries and stops silently dropping real transactions.

**Architecture:** Introduce one shared `guards.ts` gate module used by BOTH the template path (`helpers.buildBase`) and the keyword fallback (`classifyEvent`), so spam/amount-cap/pre-auth/reversal/reminder rejection is DRY and consistent. Rework `extractAmount` candidate selection. Tighten fingerprints, dedupe, sender normalization, merchant capture.

**Tech Stack:** TS, Jest + ts-jest. Run `npx jest` / `npx tsc -b`. Branch: `fix/parser-hardening` (stacked on `feat/transaction-fee-split`).

## Product decisions (conservative — "never invent a transaction, never silently drop a real one"). Documented for veto.
1. **F13:** the confidence threshold now always applies — `mustReview = askBeforeSaving || (confidence < minConfidenceForAutoSave)`. Low-confidence drafts go to the **review queue**, not auto-save. This is the setting's intended behavior; it shifts more items to review.
2. **F9/F10/F11/F12:** non-transactions are **dropped** (parse returns null) — promos/spam, implausible amounts (>1e9 or ≤0), OTP/pre-authorization prompts, and bill *reminders* ("due"/"reminder" without a completion verb). Reversals as a *new debit* are dropped; genuine refunds/reversals still parse as income via the refund template.
3. **F15:** known messenger packages (WhatsApp, Telegram, Messenger, Signal, Instagram, Snapchat, Discord, Slack, GBWhatsApp) are blocked in `isAllowedEvent`; the catch-all generic templates additionally require a stronger financial signal (a currency-typed amount OR a reference/balance token).
4. Every guard task ships BOTH positive (must-drop) and negative (must-still-parse) tests to prevent over-blocking.

**Existing-test note:** some current tests encode the buggy behavior (e.g. an amount test that expects the balance). When a fix changes such a test's expectation, UPDATE the test to the corrected behavior and note it — do not weaken a test to hide a real regression.

---

# PHASE 1 — Critical & High

## Task P1.1: Shared `guards.ts` gate module
**Files:** Create `src/features/autoLogging/services/parser/guards.ts`, `__tests__/autoLogging/guards.test.ts`. Refactor `keywordClassifier.ts` to consume it.

- [ ] **Step 1 — Write failing tests** (`guards.test.ts`): assert, for each exported guard, must-drop and must-keep cases:
  - `isSpam`: DROP `"Recharge GHS 10 and get 500MB free! T&Cs apply"`, `"Congratulations! You won a prize"`; KEEP `"Payment of GHS 100 to Shop"`, `"You have received GHS 50 from Ama"`.
  - `isImplausibleAmount`: true for `0`, `-5`, `1_000_000_001`, `NaN`, `Infinity`; false for `0.5`, `1600`, `1_000_000_000`.
  - `isPreAuthPrompt`: DROP `"Use OTP 483920 to authorize payment of GHS 750 to KOFI. Do not share this code"`, `"GHS 200 will be debited from your account shortly"`; KEEP `"GHS 200 has been debited from your account"`, `"You have paid GHS 50 to Shop"`.
  - `isReversalDebit`: true `"Payment of GHS 50 to VENDOR has been reversed"`; false `"Payment of GHS 50 to VENDOR"`, false `"Refund of GHS 50 received"` (refund handled as income, not a reversed debit).
  - `isBillReminder`: DROP `"Reminder: your ECG bill of GHS 320 is due on 05/05. Pay to avoid disconnection"`; KEEP `"Your ECG bill payment of GHS 320 was successful"`.
- [ ] **Step 2 — Run, confirm fail:** `npx jest guards` → module not found.
- [ ] **Step 3 — Implement `guards.ts`.** Move `SPAM_PATTERNS` and `MAX_PLAUSIBLE_AMOUNT` here from `keywordClassifier.ts` (re-export or import back). Provide:
```ts
export const MAX_PLAUSIBLE_AMOUNT = 1_000_000_000;
export function isImplausibleAmount(n: number): boolean {
    return !Number.isFinite(n) || n <= 0 || n > MAX_PLAUSIBLE_AMOUNT;
}
export function isSpam(text: string): boolean { /* SPAM_PATTERNS.some(...) */ }
const COMPLETION_RE = /\b(debited|credited|withdrawn|deducted|reversed|received|was\s+(?:paid|sent|charged)|has\s+been\s+(?:paid|sent|charged|debited|credited)|successful(?:ly)?|completed)\b/i;
const PREAUTH_RE = /\b(otp|one[\s-]?time\s?(?:pass(?:word|code)|code|pin)|do not share|will\s+be\s+(?:debited|charged|deducted)|about\s+to\s+(?:pay|send)|authoriz|authoris)\b/i;
export function isPreAuthPrompt(text: string): boolean { return PREAUTH_RE.test(text) && !COMPLETION_RE.test(text); }
const REVERSAL_RE = /\b(reversed|reversal)\b/i;
export function isReversalDebit(text: string): boolean { return REVERSAL_RE.test(text); }
const REMINDER_RE = /\b(reminder|is\s+due|due\s+on|avoid\s+disconnection|kindly\s+pay|please\s+pay|pay\s+before|outstanding\s+balance|overdue)\b/i;
export function isBillReminder(text: string): boolean { return REMINDER_RE.test(text) && !COMPLETION_RE.test(text); }
```
  Tune regexes until BOTH the positive and negative test cases pass.
- [ ] **Step 4 — Refactor `keywordClassifier.ts`** to import `isSpam`, `MAX_PLAUSIBLE_AMOUNT`/`isImplausibleAmount` from guards (remove the local duplicates). Behavior unchanged there.
- [ ] **Step 5 — Verify:** `npx jest guards keywordClassifier parser` and `npx tsc -b` all pass.
- [ ] **Step 6 — Commit:** `feat(parser): shared guard module for spam/amount/pre-auth/reversal/reminder`.

## Task P1.2: Gate the template path (F9, F10, F11, F12)
**Files:** `src/features/autoLogging/services/parser/providers/helpers.ts` (`buildBase`, and `buildDebit`). Test: `__tests__/autoLogging/templateGating.test.ts`.

- [ ] **Step 1 — Failing tests** (`parseEvent` with an MTN/GCB sender so a template fires):
  - DROP (expect `parseEvent(...) === null`): `"Recharge GHS 10 and get 500MB free! T&Cs apply"`; `"Transfer money with MoMo and enjoy GHS 5 bonus"`; `"You have paid GHS 6,576,000,000.00 to X Ltd"`; `"Use OTP 483920 to authorize payment of GHS 750 to KOFI. Do not share"`; `"Reminder: your ECG bill of GHS 320 is due on 05/05. Pay to avoid disconnection"`; `"Payment of GHS 50.00 to VENDOR has been reversed. Ref 123456"` must NOT be a new expense.
  - KEEP (must still parse as before): `"Payment of GHS 100.00 to SHOPRITE. Fee GHS 2.50"` (expense 100/fee 2.5); `"You have received GHS 200.00 from KOFI"` (income 200); a real ECG bill payment `"Your ECG bill payment of GHS 320.00 was successful"` (expense). Also the existing MoMo cash-out test must still pass.
- [ ] **Step 2 — Confirm fail:** `npx jest templateGating`.
- [ ] **Step 3 — Implement in `buildBase` (helpers.ts):** at the top (after computing nothing yet), reject non-transactions:
```ts
import { isSpam, isImplausibleAmount, isPreAuthPrompt, isBillReminder } from "../guards";
// inside buildBase, before/after extractAmount:
if (isSpam(input.text) || isPreAuthPrompt(input.text) || isBillReminder(input.text)) return null;
const amount = extractAmount(input.text);
if (amount.amount === null || isImplausibleAmount(amount.amount)) return null;
```
  In `buildDebit` add: `if (isReversalDebit(input.text)) return null;` (so a reversed payment is not a fresh debit; `genericRefund` still credits genuine refunds).
- [ ] **Step 4 — Verify:** `npx jest templateGating parser paymentReceivedRegression feeSplit` + full `npx jest` + `npx tsc -b`. Update any existing test that encoded a now-dropped bad case (note it in the commit).
- [ ] **Step 5 — Commit:** `fix(parser): gate template path against spam, huge amounts, pre-auth, reminders, reversals`.

## Task P1.3: Rework amount selection (F1, F2, F3, F4)
**Files:** `src/features/autoLogging/services/parser/normalize.ts` (`extractAmount`, `looksLikeBalance`). Test: `__tests__/autoLogging/amountSelection.test.ts`.

- [ ] **Step 1 — Failing tests:**
  - `"Sent GHS 50.00 to Ama. Cashback 2.00GHS today"` → `{amount:50, currencyCode:"GHS"}`
  - `"Recharge of GHS 5.00 successful. You earned GHS 0.05 cashback"` → `amount:5`
  - `"Debited GHS 50.00. Your balance after this transaction is GHS 900.00"` → `amount:50`
  - `"Transfer of GHS 50.00 successful. GHS 150.00 is your new wallet balance"` → `amount:50`
  - `"Your deposit was successful. Avail Bal: GHS 1,250.00"` → `{amount:null, currencyCode:null}` (balance-only)
  - Regression KEEP: existing extractAmount tests (thousand separators, fee split MoMo cash-out `{amount:1600, fee:16}`, commission/vat) must still pass.
- [ ] **Step 2 — Confirm fail.**
- [ ] **Step 3 — Implement:**
  - Sort `candidates` by `index` ascending after collection.
  - Widen `looksLikeBalance` to also check a FORWARD window (e.g. next ~30 chars) for `BALANCE_HINT_RE` in addition to the backward window; widen the backward window to ~40 chars (still bounded).
  - Change primary selection to prefer the **first** primary candidate (not last).
  - When `primary.length === 0`, do NOT fall back to a balance candidate: if every remaining candidate is `suspectedBalance`, return `NO_AMOUNT`. (Keep the non-balance fallback for account-only edge but never return a balance-suspected amount.)
- [ ] **Step 4 — Verify:** `npx jest amountSelection parser feeSplit feeAggregation` + full `npx jest` + `npx tsc -b`. Some existing tests may shift; update expectations only where the new result is the CORRECT one (document each).
- [ ] **Step 5 — Commit:** `fix(parser): choose first in-order non-balance amount; bidirectional balance detection`.

## Task P1.4: Confidence gate actually applies (F13)
**Files:** `src/features/autoLogging/services/ingestion/saveDraft.ts` (`planSaveDraft`, ~100-102). Test: extend an existing saveDraft/plan test or add to `templateGating.test.ts`.

- [ ] **Step 1 — Failing test:** with default settings (`askBeforeSaving:false, reviewLowConfidenceOnly:false, minConfidenceForAutoSave:0.75`), a draft with `confidence:0.5` yields `plan.outcome === "review"`; a draft with `confidence:0.9` yields `"save"`.
- [ ] **Step 2 — Confirm fail** (currently 0.5 → "save").
- [ ] **Step 3 — Implement:** replace
```ts
const mustReview = settings.askBeforeSaving || (settings.reviewLowConfidenceOnly && lowConfidence);
```
  with
```ts
const mustReview = settings.askBeforeSaving || lowConfidence;
```
  (keep `lowConfidence = draft.confidence < settings.minConfidenceForAutoSave`).
- [ ] **Step 4 — Verify:** full `npx jest` + `npx tsc -b`. Update any test asserting auto-save of a <0.75 draft.
- [ ] **Step 5 — Commit:** `fix(autolog): apply minConfidenceForAutoSave so low-confidence drafts go to review`.

## Task P1.5: Restrict chat/notification parsing (F15)
**Files:** `src/features/autoLogging/services/filter/isAllowedEvent.ts`; `src/features/autoLogging/services/parser/providers/generic.ts`. Test: `__tests__/autoLogging/notificationGating.test.ts`.

- [ ] **Step 1 — Failing tests:**
  - `isAllowedEvent({source:"notification", packageName:"com.whatsapp", body:"..."}, defaultSettings)` → `false` (blocked messenger), even with empty `allowedPackages`.
  - A bank-app notification package still allowed.
  - `parseEvent({source:"notification", packageName:"com.whatsapp", body:"John: I paid to Kwesi GHS 300 for you"})` — even if it reached the parser — returns null OR the generic templates don't fire (no currency-typed amount + no reference/balance). Confirm a REAL generic SMS `"You have received GHS 200.00 from KOFI. Ref 99887766"` still parses.
- [ ] **Step 2 — Confirm fail.**
- [ ] **Step 3 — Implement:**
  - In `isAllowedEvent`, add a `BLOCKED_NOTIFICATION_PACKAGES` set (com.whatsapp, org.telegram.messenger, com.facebook.orca, com.facebook.katana, org.thoughtcrime.securesms, com.instagram.android, com.snapchat.android, com.discord, com.Slack, com.gbwhatsapp, com.whatsapp.w4b) — return `false` when the notification package matches, regardless of allowlist.
  - In `generic.ts`, add a guard so `genericPaymentSent`/`genericPaymentReceived` only parse when the body has a currency-typed amount (a `CODE_GROUP|SYMBOL_GROUP` adjacent to a number) OR a reference/balance token. Simplest: in each generic `parse`, after `buildX`, return null if `output.currencyCode === null && extractReference(input.text) === null`.
- [ ] **Step 4 — Verify + Step 5 — Commit:** `fix(autolog): block messenger notifications; require financial signal for generic templates`.

## Task P1.6: Merchant sentence-boundary stop (F8)
**Files:** `normalize.ts` (`extractMerchant`/`cleanCandidate`). Test: `__tests__/autoLogging/merchant.test.ts` (extend existing extractMerchant tests).

- [ ] **Step 1 — Failing tests:** `extractMerchant("Cash Out made for GHS1600.00 to VANTHELMA VENTURES. Current Balance: GHS256.82")` → `"VANTHELMA VENTURES"`; `extractMerchant("Payment made for GHS 10.00 to Kofi Mensah. Thank you for using MTN MobileMoney")` → `"Kofi Mensah"`. KEEP existing merchant tests.
- [ ] **Step 2 — Confirm fail.**
- [ ] **Step 3 — Implement:** in `cleanCandidate`, before word-walking, truncate `raw` at the first sentence boundary `/[.!?]\s/` (or a `.` followed by uppercase). Then keep existing stop-word logic.
- [ ] **Step 4 — Verify + Step 5 — Commit:** `fix(parser): stop merchant capture at sentence boundary`.

## Task P1.7: Fingerprint time-independence only for true IDs (F16)
**Files:** `src/features/autoLogging/services/dedupe/fingerprint.ts`; `normalize.ts` (`extractReference`). Test: `__tests__/autoLogging/fingerprint.test.ts` (extend).

- [ ] **Step 1 — Failing tests:** two salary drafts one month apart with `reference` derived from `Narration: SALARY` must produce DIFFERENT fingerprints (so April is not dropped). A draft with a genuine `Txn ID: 80855322501` reference one month apart may keep the time-independent (reference) fingerprint. A same-transaction re-parse within 2 min still collides on the time-bucket path.
- [ ] **Step 2 — Confirm fail.**
- [ ] **Step 3 — Implement:** distinguish a "strong reference" (Txn/Transaction/Ref/Receipt/Token IDs — alphanumeric with digits, length ≥ 6) from narration/remark/memo prose. Only use the time-independent `"r"` fingerprint for strong references; for narration-derived or absent references, always use the time-bucketed `"t"` path. Implement by having `extractReference` (or a new `extractStrongReference`) tag/return only strong-ID references for fingerprint purposes, OR add a `isStrongReference(ref)` check in `fingerprint`. Keep `extractReference` for display unchanged if needed; fingerprint must key only on strong IDs.
- [ ] **Step 4 — Verify + Step 5 — Commit:** `fix(dedupe): only strong txn-id references bypass the time window`.

### End of Phase 1 — orchestrator: full `npx jest`, `npx tsc -b`, Fable re-review of the Phase-1 diff, fix findings.

---

# PHASE 1 REMEDIATION (from Fable review of Phase-1 diff, 2026-09-13)

**Root principle:** a message containing a genuine **completion verb** is a real transaction and must NOT be dropped by the soft gates (promo/pre-auth/reminder). Only *strong* spam (won/lottery/click-here/crypto/etc.) drops unconditionally. Every task below is TDD with BOTH drop and keep cases; run full `npx jest` + `npx tsc -b` after each; one commit each.

Define a shared `hasCompletionVerb(text)` in guards.ts. It must match at least:
`has/have/was/were + debited|credited|paid|sent|charged|received|deducted|reversed|withdrawn|deposited|transferred`; `you have paid|sent|received`; bare `debited|credited|withdrawn|deducted|deposited`; `payment (received|confirmed|successful)`; `successful|successfully|completed`; `thank you for your payment`; `cash[\s-]?out|cash[\s-]?in` with made/successful; `debit alert|credit alert`; `receipt`.

## Task R1: Completion-aware gating (CF1, CF2, CF3, CF4, CF11)
**Files:** `guards.ts`, `keywordClassifier.ts`. Test: `__tests__/autoLogging/guardsRemediation.test.ts`.
- Split spam into STRONG_SPAM (drop always) vs SOFT_PROMO (drop only when `!hasCompletionVerb`). Move `congratulations|congrats` and `offer|reward|discount` to SOFT. Remove bare `/\bfree\b/i` from promo entirely (keep `free\s+(gift|data|airtime|bundle|transfers?)`, `\d+\s?(mb|gb)\s+(free|bonus|data|bundle)`, `enjoy…bonus`, `unlimited`, `t&cs`, `promo|promotion`).
- `isSpam(text) = STRONG_SPAM.some || (SOFT_PROMO.some && !hasCompletionVerb(text))`. `isPromo` = same soft rule.
- `isPreAuthPrompt(text) = (FUTURE_DEBIT_RE.test(text) || PREAUTH_RE.test(text)) && !hasCompletionVerb(text)`. Fix the dead `authoriz|authoris` branch → `authoriz(?:e|ed|ing|ation)?\b|authoris(?:e|ed|ing|ation)?\b`; ADD `enter\s+your\s+(pin|otp|passcode|password)` and `\bto\s+(confirm|approve|authoriz)`. (Completion incl. `debit alert` prevents "did not authorize" footers from dropping.)
- `isBillReminder(text) = REMINDER_RE.test(text) && !hasCompletionVerb(text)`.
- `keywordClassifier.classifyEvent`: use `isImplausibleAmount(amount)` (rejects ≤0) instead of only `> MAX` (CF11).
- **DROP tests:** `"Recharge GHS 10 and get 500MB free! T&Cs apply"`; `"Transfer money with MoMo and enjoy GHS 5 bonus"`; `"Use OTP 483920 to authorize payment of GHS 750 to KOFI. Do not share"`; `"Enter your PIN to confirm payment of GHS 100.00 to KOFI ELECTRONICS"`; `"Reminder: your ECG bill of GHS 320 is due on 05/05. Pay to avoid disconnection"`; `"You have been charged GHS 0.00 for this service"` (via fallback → not a save).
- **KEEP tests (must still parse):** `"You have received GHS 200.00 from KOFI. Ref 99887766. Enjoy free transfers all weekend on MoMo"` (income 200); `"Your account has been debited with GHS 150.00 at SHOPRITE. For complaints call our toll free line 0800422422"` (expense 150); `"Congratulations! You have received GHS 5.00 cashback from MTN MoMo"` (income 5); `"Your DSTV subscription payment of GHS 300.00 was successful. GHS 300.00 will be debited automatically next month"` (expense 300); `"Thank you for your payment of GHS 320.00 for account 12345. Your next bill is due on 05 Oct"` (expense 320); `"Debit Alert: GHS 45.00 at MELCOM ACCRA. If you did not authorize this transaction, call…"` (expense 45). Commit `fix(parser): completion-verb aware spam/pre-auth/reminder gating`.

## Task R2: Reversal sign + transfer guard (CF5)
**Files:** `providers/helpers.ts` (`buildTransfer`), `providers/generic.ts` (`genericRefund`). Test: extend `templateGating.test.ts`.
- Add `if (isReversalDebit(input.text)) return null;` to `buildTransfer` (a reversed transfer is not a fresh outflow).
- In `genericRefund.parse`: if the body indicates an outflow direction (`deducted from your|debited from your|reversed from your`), build a DEBIT (expense) instead of credit; else credit as today.
- DROP/RECLASSIFY tests: `"Your transfer of GHS 50.00 to KOFI MENSAH has been reversed. Ref 123456"` → not an expense (null or refund income, not `transfer→expense`); `"Reversal successful. GHS 50.00 has been deducted from your wallet and returned to KOFI. Ref 12345"` → expense/outflow 50. KEEP: `"Refund of GHS 50.00 has been credited to your account"` → income 50. Commit `fix(parser): guard transfer reversals and correct clawback direction`.

## Task R3: Sentence-scoped balance detection (CF6, CF7)
**Files:** `normalize.ts` (`looksLikeBalance`). Test: extend `amountSelection.test.ts`.
- Replace the fixed 40-char backward / 70-char-with-digit-guard forward windows with **sentence-scoped** detection: for a candidate at `index`, take the enclosing sentence (from the previous `[.!?]` up to the next `[.!?]`) and flag as balance if `BALANCE_HINT_RE` appears in that sentence. Do not use a raw `\d` disqualifier.
- KEEP-null tests: `"Your deposit was successful. GHS 1,250.00 is your available balance. Dial *170# for more"` → `extractAmount` null (balance-only); `"Your wallet balance after this cash out transaction is GHS 900.00"` → null (or, if part of a debit, the debit amount, never 900). KEEP real: `"Debit Alert: GHS 45.00 at Melcom on 2026-04-23. New Bal: GHS 200.00"` → 45. Commit `fix(parser): sentence-scoped balance detection`.

## Task R4: Abbreviation-safe merchant boundary (CF8)
**Files:** `normalize.ts` (`cleanCandidate`). Test: extend `merchant.test.ts`.
- Only cut at a sentence boundary when the token before the `.` is ≥3 letters (so `ST.`, `K.O.` survive). KEEP: `"…to ST. JOHN PHARMACY. Thank you"` → `"ST. JOHN PHARMACY"`; `"…to K.O. VENTURES on…"` → `"K.O. VENTURES"`; still cut `"…to VANTHELMA VENTURES. Current Balance…"` → `"VANTHELMA VENTURES"`. Commit `fix(parser): abbreviation-safe merchant sentence stop`.

## Task R5: Strong reference by source, not shape (CF9)
**Files:** `normalize.ts` (add `extractStrongReference`), `dedupe/fingerprint.ts`. Test: extend `fingerprint.test.ts`.
- Add `extractStrongReference(rawText)` running only the txn-id/ref/receipt/token REFERENCE_PATTERNS (EXCLUDING the narration/remark/memo/particulars/description pattern). `fingerprint` uses the time-independent `"r"` path only when `extractStrongReference(draft.rawText)` is non-null (keyed on that value), else time-bucket.
- Tests: `"Narration: RENT2026"` two months apart → DIFFERENT fingerprints; `"Txn ID: 80855322501"` two months apart → SAME; existing `Ref: ABC123`/`TX9988` strong cases still time-independent. Commit `fix(dedupe): strong reference by extraction source, not shape`.

## Task R6: Confidence gate on replace paths (CF10)
**Files:** `ingestion/saveDraft.ts` (`planSaveDraft`). Test: extend `saveDraft.test.ts`.
- Compute `lowConfidence`/`mustReview` and, in BOTH replace branches (rawHistory upgrade ~53-62 and dedupe `shouldReplace` ~87-97), when `mustReview` is true do NOT auto-replace — return `{outcome:"drop", fingerprint}` (keep the existing transaction; never auto-write a below-threshold entry).
- Test: default settings; a 0.5-confidence draft that would replace a 0.4 stored fingerprint → `outcome:"drop"` (not "replace"); a 0.9-confidence draft still replaces. Commit `fix(autolog): do not auto-replace with below-threshold drafts`.

### End of Remediation — orchestrator: full jest, tsc, Fable re-review of remediation diff before proceeding to Phase 2.

## REMEDIATION ROUND 2 (Fable review of remediation diff, N1-N4)
All CF1-CF11 confirmed fixed; these are NEW regressions from the remediation. TDD, one commit, both drop+keep cases; full jest + tsc after.

- **N1 (HIGH) balance over-suppression** — `normalize.ts` balance detection: flag as balance ONLY the amount candidate nearest each BALANCE_HINT occurrence (not every candidate in the sentence). Rewrite: after collecting+sorting candidates, for each balance-hint match index, mark the single nearest candidate (within ~40 chars) as suspectedBalance. KEEP-primary tests: `"Debit GHS50.00 Acc:1234 Desc:POS PURCHASE Bal:GHS900.00"` → 50; `"You have received GHS 200.00 from KOFI, your new balance is GHS 450.00"` → income 200; `"GHS 50.00 debited, balance GHS 900"` → 50. KEEP-null: `"Your deposit was successful. GHS 1,250.00 is your available balance. Dial *170#"` → null; `"Your wallet balance after this cash out transaction is GHS 900.00"` → null. KEEP: `"Debit Alert: GHS 45.00 at Melcom on 2026-04-23. New Bal: GHS 200.00"` → 45.
- **N2 (HIGH) completion list gaps** — `guards.ts` COMPLETION_RE: add `payment\s+made` and `\b(?:sent|paid|transferred)\b[^.!?]{0,30}\bto\b`. KEEP tests: `"Payment made for GHS 50.00 to SHOP. Get 10% discount on your next purchase"` → expense 50; `"Sent GHS 50.00 to Ama. Enjoy unlimited data offers this weekend"` → expense 50; `"Payment made for GHS 320.00 to ECG. Your next bill is due on 05 Nov"` → expense 320. STILL-DROP (verify not broken): OTP authorize prompt, enter-PIN prompt, pure promo without completion.
- **N3 (MED/HIGH) strong-ref shape** — `normalize.ts` extractStrongReference (or fingerprint): require the cleaned strong reference to contain a digit AND no internal whitespace. Test: `"Salary credited. Ref: SALARY PAYMENT"` two months apart → DIFFERENT fingerprints; `"Payment. Txn ID: 80855322501"` → SAME; existing ABC123/TX9988 still strong.
- **N4 (MED) history poisoning on R6 drop** — `saveDraft.ts`: the two mustReview replace→drop branches must NOT record raw history. Return `{ outcome: "drop" }` WITHOUT `fingerprint` (persistHistoryEntry early-returns when `!plan.fingerprint`), so the existing fingerprint→txId link is preserved. Test: after a low-confidence draft drops a would-be replace, the prior rawHistory entry (with its txId) is unchanged / a later high-confidence draft can still replace.

### End of Round 2 — orchestrator: full jest, tsc, Fable spot-check, then Phase 2.

## REMEDIATION ROUND 3 (final Fable review of full branch, C-1..C-6)
TDD, one commit each, both wrong/keep cases; full jest + tsc after each.

- **C-1 (HIGH) balance-label adjacency** — `normalize.ts markBalanceCandidates`: balance labels precede their value ("Bal: GHS X"), but an amount immediately before the label wins the current distance metric. Fix: for each hint, mark the nearest candidate AFTER the hint (candStart ≥ hintEnd) within a window; only if none exists after, mark the nearest candidate BEFORE (within the sentence). Tests: `"Debit Amt: GHS500.00 Bal: GHS1,200.00 Ref: 123456"` → amount 500; `parseEvent(GCB,"Acct XX1234 debited with GHS500.00 Avail Bal: GHS1,200.00 Ref: 4567890")` → expense 500 (not null, not 1200); `"Sent GHS 50.00 Bal GHS 60.00"` → 50. KEEP: `"GHS 1,250.00 is your available balance. Dial *170#"` → null; `"wallet balance after this cash out transaction is GHS 900.00"` → null; `"…GHS 45.00 at Melcom on 2026-04-23. New Bal: GHS 200.00"` → 45; all existing amountSelection/parser cases.
- **C-2 (HIGH) null/dead sender mapping** — `resolveBusiness.ts` (+ `saveDraft.ts`, `ResolveResult`): (a) mapping with `businessId === null` ("Unassigned") → return `{ ignore: true }`; `planSaveDraft` returns `{ outcome:"drop" }` (no business, no history write). (b) mapping whose `businessId` is set but not in `businesses` (deleted) → recreate the business ONCE and return a `newMapping` that repairs the mapping (overwrite), so it isn't recreated per-event. (c) no mapping → unchanged (create + append). Tests (routing/resolve): null-mapping → ignore/drop, no newBusiness; dead-businessId → newBusiness + newMapping(repair) once, second call reuses; valid mapping unchanged.
- **C-3 (MED) reminder "sent to your email"** — `guards.ts`: don't count `sent/paid/transferred … to your (e-?mail|phone|inbox|number|sms|line|statement)` as a completion verb (add a negative lookahead; remove bare `sent` from the been-X alt so "has been sent to your email" no longer completes). Tests: `"Your ECG bill for GHS 120.00 has been sent to your email. Kindly pay before 30 Sept…"` → null/reminder-drop; KEEP `"GHS 50.00 sent to Ama"` → outflow; `"salary has been credited"` → completion/kept.
- **C-4 (MED) bare reversal flips sign** — `guards.ts isReversalDebit` + `generic.ts genericRefund.bodyMatch`: require completed-reversal phrasing (`has been reversed|been reversed|reversal successful|successfully reversed|reversed successfully`), not the bare noun. Tests: `parseEvent(MTN,"Cash Out Made for GHS 300.00 to AGT KOJO. Fee charged: GHS 3.00. If you did not initiate this, call 100 to request a reversal.")` → expense 300 (not income); KEEP `"Payment of GHS 50.00 to VENDOR has been reversed"` → income/refund; clawback `"Reversal successful. GHS 50.00 has been deducted from your wallet…"` → expense 50.
- **C-5 (MED) title-only fallback** — `engine.ts` + `keywordClassifier.classifyEvent`: pass the composed (title+body) text into the keyword fallback for notifications. Test: notification `title:"Credit alert: GHS 500.00 salary received", body:""`, unknown package → income 500; SMS unchanged.
- **C-6 (MED) dead toggle** — `src/screens/…/AutoLogSettingsScreen.tsx`: remove the `reviewLowConfidenceOnly` Switch row (behavior no longer reads it). Leave the settings field/type in place. No test (UI); verify tsc.

### End of Round 3 — orchestrator: full jest, tsc, final security/fresh-eyes, Fable confirm.

---

# PHASE 2 — Medium

## Task P2.1: Number & currency boundary fixes (F5, F6)
**Files:** `normalize.ts` (`NUMBER_BODY`, PREFIX/SUFFIX regexes). Test: extend `parser.test.ts`/`amountSelection.test.ts`.
- [ ] DROP false positives: `"Buy the GHS 5 500MB bundle now"` → amount 5 (not 5500); `"Approved. ID: XKUSD500TZ"` → no amount / not USD 500. KEEP: `"USD 12,345.00"` → 12345; `"GHS 1 000.00"` (space-thousands with decimal) — decide: prefer treating explicit `,` as thousands and a space only when followed by a 3-digit group AND a decimal or currency boundary. Implement by requiring a non-`MB|GB|KB` unit boundary after the number, and adding word boundaries around `CODE_GROUP`. Add tests for both, commit `fix(parser): tighten number/currency token boundaries`.

## Task P2.2: Sum all fee candidates (F7)
**Files:** `normalize.ts` (`extractAmount` fee selection ~85). Test: `parser.test.ts`.
- [ ] `"Sent GHS 100.00 to Kofi. Fee: GHS 0.50. E-levy: GHS 1.00"` → `{amount:100, fee:1.5}`. Sum all same-currency `suspectedFee` candidates. Also remove/adjust the fee-split spec's "first fee only" known-limitation note. Commit `fix(parser): sum all fee/tax candidates`.

## Task P2.3: Income/expense tie-break toward income when received/credited (F14)
**Files:** `keywordClassifier.ts` (`classify`). Test: `parser.test.ts`.
- [ ] `"A payment of GHS 50 was received into your account"` → income. Give `received|credited|deposit` a stronger weight, or when income and expense hits tie and an income-strong token is present, choose income. KEEP existing debit cases. Commit `fix(parser): break income/expense ties toward received/credited`.

## Task P2.4: Dedupe requires same type (F17)
**Files:** `dedupe/match.ts` (+ `saveDraft.ts` candidate building must pass `type`). Test: `dedupe.test.ts`.
- [ ] Add `type` to `DedupeCandidate`; in `findDuplicate` skip candidates whose type differs from `draft.type`. Update `planSaveDraft` candidate construction (saveDraft.ts ~72-83) to include `type: tx.type`. Test: income 100 + expense 100 within 2 min do NOT merge; a true duplicate (same type) still merges. Commit `fix(dedupe): require matching transaction type`.

## Task P2.5: Phone sender normalization (F18)
**Files:** `routing/normalizeSender.ts`. Test: `__tests__/autoLogging/routing.test.ts` (create or extend).
- [ ] Strip spaces/hyphens/parens before the `PHONE_NUMBER_RE` test so `"+233 24 123 4567"` and `"+233241234567"` yield the SAME key. KEEP alphanumeric-sender behavior. Commit `fix(routing): normalize phone senders regardless of spacing`.

### End of Phase 2 — orchestrator: full jest, tsc, Fable re-review of Phase-2 diff.

---

# PHASE 3 — Low & cleanup

## Task P3.1: Lowercase merchant capture (F19)
`normalize.ts` MERCHANT_PATTERNS allow a lowercase first char (but still exclude stop-words/digits). Test `"... to kofi mensah."` → `"kofi mensah"`. KEEP existing. Commit `fix(parser): capture lowercase counterparties`.

## Task P3.2: Use notification title (F21)
`engine.parseEvent` — when `event.source === "notification"` and `event.title` is present, parse against `title + " " + body` (title first) so truncated bodies still yield the amount. Add a test with amount only in title. Commit `feat(parser): consider notification title text`.

## Task P3.3: Don't treat OTP-ish tokens as references (F22)
`normalize.ts` `extractReference` `token` pattern — require the captured token to be non-numeric-only or contain letters, so `"Your token 483920123 expires"` yields no reference. Test it. Commit `fix(parser): ignore numeric-only token codes as references`.

## Task P3.4: Remove dead code (F20)
Delete `parser/type.ts` (`inferType`) and its test file if the test only covers dead code (verify no production import first via grep); remove `normalizeCedisTokens` (normalize.ts) and `dedupeKey` (dedupe/hash.ts) if grep confirms zero production callers. Commit `chore(parser): remove dead inferType/normalizeCedisTokens/dedupeKey`.

## Task P3.5: Plausible fixes (P1–P4 in audit)
- resolveBusiness: don't overwrite a user mapping whose `businessId` is explicitly `null` (only append when no mapping exists for the sender). Test in `resolve.test.ts`.
- `banks.ts` `/\b(access|cal)\b/`: tighten to avoid claiming unrelated senders (e.g. require bank-name context or anchor).
- resolveBusiness business-id: use the injected `idGenerator`/uuid instead of `now.getTime().toString()` to avoid same-ms collisions.
- (Sender spoofing is an inherent limit — document only.)
Commit `fix(routing): guard null mappings, tighten bank sender match, unique business ids`.

### End of Phase 3 — orchestrator: full jest, tsc, security scan, fresh-eyes read, final Fable review of the whole `fix/parser-hardening` diff, fix anything, report.
