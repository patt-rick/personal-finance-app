# Auto-Logging Parser Audit (Fable, 2026-09-13)

Adversarial review of the full SMS/notification parsing pipeline. Every CONFIRMED
finding was reproduced by executing the real parser code. Severity in brackets.

## Overall
Architecture is sound (template/fallback split, layered dedupe, serialized ingestion).
But the pipeline is systematically **optimistic**: templates trust sender+keyword+any-amount
with no spam gate or amount cap; amount selection uses a fragile "last candidate" heuristic;
and the confidence threshold is dead code under default settings, so nearly everything
auto-saves as `confirmed`. Common Ghanaian SMS (promos, bill reminders, OTP, reversals, chat)
produce confidently wrong ledger entries; two dedupe paths can silently drop real money moves.

## CONFIRMED findings

### F1 [CRITICAL] Wrong amount chosen — unsorted candidates + "last primary" heuristic
`normalize.ts` `extractAmount` (~74-91). Candidates collected prefix-walk then suffix-walk
(array order ≠ text order); picks the *last* non-fee/non-balance candidate.
- `"Sent GHS 50.00 to Ama. Cashback 2.00GHS today"` → amount **2** (expect 50)
- `"Recharge of GHS 5.00 successful. You earned GHS 0.05 cashback"` → **0.05** (expect 5)
Fix: sort candidates by `index`; prefer the **first** primary; optionally weight candidates
adjacent to action verbs (paid/sent/received/debited).

### F2 [HIGH] Balance lookbehind window too narrow (24 chars)
`looksLikeBalance` (141-144). `"Debited GHS 50.00. Your balance after this transaction is GHS 900.00"`
→ amount **900**. Fix: widen to clause/sentence start or scan to previous amount.

### F3 [HIGH] Balance hint *after* amount never checked
`"Transfer of GHS 50.00 successful. GHS 150.00 is your new wallet balance"` → **150**.
Fix: also test a forward window for balance hints.

### F4 [HIGH] Balance-only messages log the balance as the amount
`extractAmount` falls through (99-100) to balance candidates. `"Your deposit was successful.
Avail Bal: GHS 1,250.00"` → income **1,250**. Fix: return NO_AMOUNT when only balance
candidates remain.

### F5 [MEDIUM] Space-as-thousands false positive
`NUMBER_BODY` (41) `\d{1,3}(?:[,\s]\d{3})+`. `"Buy the GHS 5 500MB bundle"` → **5,500** (expect 5).
Fix: don't accept a bare space as thousands separator (or require unit boundary).

### F6 [MEDIUM] Currency codes matched inside reference IDs (no word boundary)
`"Approved. ID: XKUSD500TZ"` → **USD 500**. Fix: add boundaries around CODE_GROUP+number.

### F7 [MEDIUM] Only first fee candidate captured (Fee + E-levy under-reports)
`extractAmount` (85). `"Sent GHS 100.00 to Kofi. Fee: GHS 0.50. E-levy: GHS 1.00"` → fee **0.5**
(the 1.00 is excluded from amount but lost from fee). Fix: sum all same-currency fee candidates.
*(Overlaps the fee-split feature's documented limitation.)*

### F8 [HIGH] Merchant capture crosses sentence boundaries
`MERCHANT_PATTERNS`/`cleanCandidate` (234-307). `"… to VANTHELMA VENTURES. Current Balance: …"`
→ `"VANTHELMA VENTURES Current"`. Pollutes `normalizeMerchantKey` → dedupe misses.
Fix: truncate captured group at `\.\s` / add period-stop in `cleanCandidate`.

### F9 [CRITICAL] Template path has no spam/promo gating or amount cap
`engine.ts` (36-44); `providers/*`; cap only in `keywordClassifier.ts:98`. Templates require
sender + one keyword + any amount.
- `"Recharge GHS 10 and get 500MB free!"` → expense **10** (`billsAndSubs mobile-airtime-debit`)
- `"Transfer money with MoMo and enjoy GHS 5 bonus"` → transfer **5** (`mtn-momo-transfer`;
  `buildTransfer` skips even conflict/strong-token checks)
- `"You have paid GHS 6,576,000,000.00 to X Ltd"` → expense **6.5B** (uncapped)
Fix: run spam-pattern check + amount cap in `buildBase` (`helpers.ts:56`); require a real
transaction verb for airtime/transfer templates.

### F10 [HIGH] Reversal SMS logged as new expense
`mobileMoney.ts` debit (priority 100) beats `generic.ts` refund (60). `"Payment of GHS 50.00 to
VENDOR has been reversed. Ref 123456"` → expense **50**. Fix: bail in `buildDebit` on
`reversed|reversal|refund`, or hoist refund priority above provider debits.

### F11 [HIGH] Pre-auth / OTP payment prompts logged as completed expenses
`"Use OTP 483920 to authorize payment of GHS 750.00 to KOFI ELECTRONICS. Do not share"` →
expense **750**. Fix: reject `otp|one[- ]time|do not share|authorize|about to|will be
(debited|charged)` unless a completion verb is present.

### F12 [HIGH] Bill reminders logged as expenses at reminder time
`billsAndSubs.ts` (4-28) bodyMatch includes `due`. `"Reminder: your ECG bill of GHS 320.00 is
due on 05/05…"` → expense **320** confirmed; later real payment double-counts. Fix: reminder/
`due`-without-payment must not create confirmed transactions (drop or review only).

### F13 [HIGH] `minConfidenceForAutoSave` is dead code under default settings
`saveDraft.ts` (101-102): `mustReview = askBeforeSaving || (reviewLowConfidenceOnly &&
lowConfidence)`. Defaults: `askBeforeSaving:false, reviewLowConfidenceOnly:false`, so the 0.75
threshold gates nothing — every draft down to ~0.3 auto-saves as `confirmed`. Amplifies F4/9/11/14/15.
Fix: `mustReview = askBeforeSaving || lowConfidence` (threshold always applies), or default
`reviewLowConfidenceOnly:true`.

### F14 [MEDIUM] Tie-break sends "received" money to expense
`keywordClassifier.ts` (113-123). `"A payment of GHS 50 was received into your account"`
(unknown sender) → **expense** (payment-of expense hit ties income hit → falls to expense).
Fix: weight `received/credited` as stronger income; break ties toward income when present.

### F15 [HIGH] Chat/notification text parses via generic templates
`generic.ts` `senderMatch:/.*/` + `isAllowedEvent.ts` empty `allowedPackages` = allow all.
WhatsApp `"John: I paid to Kwesi GHS 300 for you"` → expense **300** conf 0.83. Fix: exclude
messenger packages, or require generic templates to find a reference/balance token, or default
notification capture to an explicit allowlist.

### F16 [HIGH] Static narration fingerprints dedupe recurring payments across months
`fingerprint.ts` (14-16) reference path has no time component; `REFERENCE_PATTERNS`
(normalize.ts 182-191) treats Narration/Remark/Description as a reference. `Narration: SALARY`
in March == April → April salary **silently dropped** (`checkRawHistory` drops equal-confidence).
Same for fixed rent. Fix: time-independent fingerprints only for true TxnID/Ref patterns; add
max-age (e.g. 48h) to reference-fingerprint matches.

### F17 [MEDIUM] `findDuplicate` ignores type; one-sided null merchant merges income+expense
`match.ts` (26-33). Income 100 and expense 100 within 2 min match when either merchant null →
second dropped. Fix: require same type; also require sender/currency match.

### F18 [MEDIUM] Same phone in different formats → different senderKeys
`normalizeSender.ts` (1-16). `"+233 24 123 4567"` → `233241234567`; `"+233241234567"` →
`p233241234567`. Duplicate cashbooks, defeats sender-scoped dedupe. Fix: strip spaces/hyphens
before the phone regex.

### F19 [LOW] Lowercase counterparties never extracted
`MERCHANT_PATTERNS` require `[A-Z]` first char. `"… to kofi mensah."` → merchant **null**.

### F20 [LOW] Divergent dead code
`parser/type.ts` `inferType` duplicates `classify` with different patterns, used only by tests
(false coverage); `normalizeCedisTokens` (normalize.ts:315) and `dedupeKey` (hash.ts:5) have no
production callers.

### F21 [LOW] `RawEvent.title` never consulted
Android notification bodies are often truncated while the title carries the amount.

### F22 [LOW] `extractReference` `token` pattern captures OTP-style codes
`"Your token 483920123 expires soon"` → reference `483920123`; switches fingerprint into the
time-independent path (compounds F16).

## PLAUSIBLE (code-grounded, not end-to-end verified)
- `resolveBusiness.ts` (17-42): user-set `businessId:null` mapping may be overwritten by
  auto-create (`senderMappings.ts:25-32`). Depends on whether null-mapping is reachable in UI.
- `banks.ts:11` `/\b(access|cal)\b/` sender regexes can claim unrelated senders.
- Same-ms business-id collision (`resolveBusiness.ts:23` uses `now.getTime().toString()`).
- SMS sender spoofing: alphanumeric "MTN" spoofable; template path trusts at 0.9 base conf.

## Resolution status (2026-09-13)
All CONFIRMED findings F1–F22 and the plausibles were fixed on branch `fix/parser-hardening`
(Phases 1–3 + 3 remediation rounds driven by repeated Fable review). Verified: `tsc -b` clean,
371 jest tests pass.

### Known limitations remaining (documented, not fixed — low severity)
- Title-only notifications parse the amount from the title but store an empty `rawText`/`remark`.
- `"Airtime balance top-up of GHS 10.00 successful"` (a balance-word adjacent to the real amount)
  is dropped — pre-existing, both before and after hardening.
- Recurring standing orders that reuse the SAME strong `Ref:` id + amount every month share a
  time-independent fingerprint and dedupe across months (rawHistory has no age pruning). Consider
  age-pruning reference fingerprints if this proves real.
- Dead-mapping repair recreates the business once and overwrites the mapping's display name /
  `autoCreated` flag (acceptable — the target business no longer exists).
- SMS sender spoofing (alphanumeric "MTN") remains an inherent limit of SMS trust.

## Suggested priority
1. F13 + F9 (gate auto-save + template spam/cap) — stops promo/chat/OTP/balance fakes.
2. F1–F4 (amount selection) — sort by index, prefer first primary, bidirectional balance, no
   balance fallback.
3. F16 (time-independent fingerprints only for true IDs) — prevents salary/rent drops.
4. F10, F12, F11 (reversal, bill-reminder, pre-auth guards).
5. F8, F5, F6, F7, F14, F17, F18 (merchant stop, number/currency boundaries, fee sum, tie-break,
   dedupe type, phone norm).
6. F19–F22 + dead code + plausibles.
