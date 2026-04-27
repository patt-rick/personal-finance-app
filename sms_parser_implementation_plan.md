# SMS / Notification Parser Rewrite — Provider-Template Engine

## Why this rewrite

The current parser at `src/features/autoLogging/services/parser/*` is a single broad pipeline that runs over every event:

- a flat keyword set gates whether a message is financial (`FINANCIAL_KEYWORDS` in `parse.ts`),
- amount is matched with one prefix/suffix regex,
- type is inferred by counting hits of three keyword arrays,
- merchant is plucked with three "at|to|from <Capitalized>" regexes,
- category is mapped from a hard-coded Ghana-only keyword list,
- confidence is a fixed weighted sum.

That is fine as a v0 but it is brittle: it can't tell apart a real bank debit alert from a marketing message that says "spend less", it loses obvious signals like a transaction reference, it can't disambiguate "payment received" vs "you sent", and the category map only fires for a small fixed set of Ghana merchants. It also has no per-provider awareness — every message goes through the same regex regardless of whether the sender is MTN MoMo, Ecobank, or DSTV.

This rewrite replaces only the parsing + classification + dedupe layers. It does **not** introduce SQLite, does **not** replace the native bridge, and does **not** change the `Transaction` shape. The Android Kotlin capture layer (`SmsReceiver`, `NotificationListener`, `AutoLogQueue`, `AutoLogModule`) and the foreground drain wiring in `App.tsx` already work and are kept as-is.

---

## Hard constraints (from this app's existing architecture)

These are the rails. The new design has to fit inside them.

1. **Storage stays AsyncStorage.** All persistence lives behind `src/utils/storage.ts` keys. No SQLite, no native DB, no remote sync. SQLite is *not* worth the migration cost for a local-only finance app.
2. **`Transaction` shape is fixed.** `id, description, amount, date, type ("income" | "expense"), businessId, category, source, sourceApp, rawText, autoLogged, confidence, reviewStatus`. Bills and subscriptions collapse to `type: "expense"` (we can keep a richer internal label but the persisted type is one of two values).
3. **Currency lives on `Business`, not `Transaction`.** When the parser reports a currency it influences (a) which cashbook the message is routed to / created in, and (b) display. It never gets stored on the transaction itself.
4. **Cashbook routing is by sender identity.** `services/routing/resolveBusiness.ts` maps a normalized sender key → `Business`. The new parser must keep emitting `senderKey` and `senderDisplay` on the draft.
5. **Categories come from `loadCategories()`.** The classifier may only emit names that exist in the user's category list (or fall back to "Other Income" / "Other Expense").
6. **Native event ingestion is done.** `SmsReceiver` + `NotificationListener` push `RawEvent`s into a JSON file queue (`autolog_queue.json`, max 500 entries). JS drains via `autoLogNative.drainQueue()` on app foreground / live event. Do not rebuild this.
7. **Notifications are a first-class source, not just SMS.** `RawEvent.source` is `"sms" | "notification"`. The provider-template engine has to handle both — for example MTN MoMo events arrive over SMS *and* via the MoMo app's notifications, and the dedupe layer has to collapse those.
8. **No new heavy deps.** Stay on jest + ts-jest + AsyncStorage. No new ORMs, no MMKV, no LRU libs.
9. **Theme + UI rules.** No hardcoded colors. Keep files under ~500 lines excluding imports.

---

## Goals

1. **Higher precision.** Provider-specific templates beat a generic pipeline on real-world Ghana mobile-money + bank messages.
2. **Higher recall via fallback.** When no template matches, a keyword classifier still produces a low-confidence draft instead of dropping the event.
3. **Stronger dedupe.** Use the transaction reference / receipt id when present. Currently we only match on `amount + merchant + ±2-min timestamp`, which lets near-duplicates from SMS and notification slip through if either side fails to extract a merchant.
4. **Robust income vs expense.** Resolve the "you sent / sent to you" / "credited / debited" / "received from / paid to" ambiguities deterministically.
5. **Bills and subscriptions surface in insights** even though they save as `expense`. Internal label is preserved on the draft so a future analytics pass can treat them differently.
6. **No regression.** Manual entry, recurring, budgets, debts, and the existing `AutoLogSettingsScreen` flow continue to behave identically.

---

## What gets replaced vs kept

### Kept as-is

- `android/.../autolog/*.kt` — capture, queue, bridge.
- `services/ingestion/nativeBridge.ts` — JS wrapper.
- `services/ingestion/drainNativeQueue.ts` — outer pipeline (it just orchestrates `parse → plan → save`).
- `services/ingestion/applyPlan.ts` + `saveDraft.ts` — cashbook routing and persistence are good.
- `services/routing/*` — sender key normalization, aliases, display names, business resolution.
- `services/persistence/*` — settings, stats, sender mappings, review queue.
- `services/filter/isAllowedEvent.ts` — package / sender allowlist.
- `services/permissions/android.ts` — runtime permissions.
- `App.tsx` drain wiring (`runDrain`, AppState listener, live `subscribe`).
- `AutoLogSettingsScreen.tsx` and the rest of the settings UI.
- The `Transaction`, `Business`, `ParsedDraft`, `RawEvent`, `ReviewItem`, `SenderMapping`, `AutoLogSettings`, `AutoLogStats` types (with the additive change in §Types below).

### Replaced

- `services/parser/parse.ts`, `amount.ts`, `merchant.ts`, `type.ts`, `categorize.ts`, `confidence.ts` — torn down and rebuilt as a provider-template engine + a normalization layer + a keyword-fallback classifier.
- `services/dedupe/hash.ts`, `match.ts` — replaced with a fingerprint that includes the transaction reference and a wider `RawEventHistory` lookup, not just the most recent transactions.

### Added

- `services/parser/normalize.ts` — text + sender + amount normalization helpers.
- `services/parser/providers/` — one file per provider template (MTN MoMo, Telecel Cash, AirtelTigo, Ecobank, GCB, Fidelity, Absa Ghana, Stanbic, ECG, DSTV/GOtv, Netflix, Spotify, plus generic-bank and generic-payment fallbacks).
- `services/parser/registry.ts` — sorted-by-priority registry of templates.
- `services/parser/engine.ts` — runs templates against a `RawEvent`, falls back to `keywordClassifier`.
- `services/parser/keywordClassifier.ts` — last-resort low-confidence parser; replaces what `parse.ts` does today.
- `services/dedupe/fingerprint.ts` — composite fingerprint (sender, amount, currency, reference, time bucket).
- `services/persistence/rawEvents.ts` — small AsyncStorage-backed history of recently-seen `{ rawHash, fingerprint, parsedSummary }` entries (capped, ring-buffered) so dedupe can work even when the matched transaction is old.
- Fixture-driven Jest tests for every provider.

---

## Types — additive only

Extend `src/features/autoLogging/types/index.ts`. **Do not** introduce a separate `ParsedSms` type as the upstream plan suggests; we already have `ParsedDraft` and the rest of the pipeline depends on it.

```ts
// existing
export interface ParsedDraft {
  amount: number;
  currencyCode: string | null;
  merchant: string | null;
  type: "expense" | "income" | "transfer";   // persisted type — unchanged
  category: string;
  description: string;
  occurredAt: string;
  confidence: number;
  source: "sms" | "notification";
  sourceApp?: string;
  senderKey: string;
  senderDisplay: string;
  rawText: string;

  // added
  reference?: string;          // transaction id / receipt no, when the message gives one
  semanticType?: SemanticType; // richer label for analytics (bill / subscription / refund / transfer)
  providerId?: string;         // which template produced this (e.g. "mtn-momo-debit")
}

export type SemanticType =
  | "expense"
  | "income"
  | "transfer"
  | "bill"
  | "subscription"
  | "refund";
```

`Transaction.type` keeps mapping `transfer | bill | subscription | refund(expense) → "expense"` and `refund(income) → "income"` exactly as `applyPlan` already does. The `semanticType` rides along on `ParsedDraft` so the review queue UI and a future analytics pass can read it; we don't need to persist it on `Transaction` for MVP.

---

## Phase 1 — Normalization layer

`services/parser/normalize.ts`

Pure functions, no I/O, fully unit-testable.

```ts
normalizeText(text: string): string
  // collapse whitespace, strip zero-width chars, normalize curly quotes,
  // normalize currency tokens (GH₵ / Ghc / GHS / cedis -> "GHS"),
  // keep original casing for downstream merchant capture

lowerKey(text: string): string
  // lowercased + whitespace-collapsed copy used only for keyword/regex matching

extractAmount(text: string): { amount: number; currencyCode: string | null } | null
  // upgraded version of today's amount.ts:
  //   - tolerates "GHS 1,234.56", "1,234.56 GHS", "GH¢ 45.00", "Ghc45", "$1.2k" (k/m suffix scaled)
  //   - rejects amounts that look like account numbers (>= 10 digits, no decimal, no separator)
  //   - prefers the LAST amount in the message when multiple are present and one of them is a balance
  //     ("Bal: GHS 200" should not be picked over "Debited GHS 45")

extractReference(text: string): string | null
  // matches: "TxnID: ABC123", "Reference: 0123456789", "Ref. 1234567",
  //          "Receipt No 9988", "Trans ID: 0099XYZ", "Token 12345678"

extractMerchant(text: string, hint?: string): string | null
  // existing patterns + "paid to <X>", "purchase at <X>", "from <X> to you",
  // strips trailing "on YYYY-MM-DD", "via Bank", "Ref ...", and bank-fee tails.

normalizeSender(source, rawId): string         // already exists — keep
normalizeMerchantKey(merchant: string|null): string  // for fingerprint only
```

These replace the current `amount.ts` and `merchant.ts`.

---

## Phase 2 — Provider templates

`services/parser/providers/<provider>.ts`

Contract:

```ts
export interface ProviderTemplate {
  id: string;                      // "mtn-momo-debit", "ecobank-credit", ...
  priority: number;                // higher wins; ties broken by registration order
  senderMatch: RegExp;             // matched against normalized sender / packageName
  bodyMatch: RegExp[];             // ALL must match the lowercased body
  parse(input: ParseInput): ParseOutput | null;
}

export interface ParseInput {
  event: RawEvent;
  text: string;        // normalized
  lower: string;       // lowercased copy for matching
  senderKey: string;   // already aliased + normalized
}

export interface ParseOutput {
  amount: number;
  currencyCode: string | null;
  merchant: string | null;
  reference?: string;
  type: ParsedDraft["type"];
  semanticType: SemanticType;
  occurredAt: number;       // ms epoch
  baseConfidence: number;   // 0..1; engine layers further signals on top
}
```

### Initial provider set (priority order, highest first)

1. `mtn-momo-debit` / `mtn-momo-credit` — sender matches `mtn`, body has "debited" / "received from" / "transferred to". MoMo messages always carry a "TxnID" — extract it as `reference`.
2. `telecel-cash-debit` / `telecel-cash-credit`.
3. `airteltigo-money-debit` / `airteltigo-money-credit`.
4. `ecobank-debit` / `ecobank-credit` — body has "Debit Alert" / "Credit Alert" + "Acct" + amount.
5. `gcb-debit` / `gcb-credit`.
6. `fidelity-debit` / `fidelity-credit`.
7. `absa-ghana-debit` / `absa-ghana-credit`.
8. `stanbic-debit` / `stanbic-credit`.
9. `ecg-bill` — `semanticType: "bill"`, `type: "expense"`. Captures "Bill amount" and due date.
10. `gwc-bill` (Ghana Water).
11. `dstv-gotv-subscription` — `semanticType: "subscription"`.
12. `netflix-subscription`, `spotify-subscription` (notifications).
13. `mobile-airtime-debit` — airtime / data bundle purchase.
14. `generic-bank-debit` / `generic-bank-credit` — last-resort bank-shaped templates that match "Debit Alert" / "Credit Alert" / "Your account ... debited" without a specific bank.
15. `generic-payment-received` — for messages like "You have received GHS 500 from <name>".

Each template's `parse` is short: do its specific regexes against `text`, fall through to `extractAmount` / `extractReference` / `extractMerchant` from the normalize layer for shared work.

### Accuracy rules baked into the templates

Adopted from the upstream plan but enforced at the template level so they don't conflict with each other:

- "payment received", "credited", "received from" → income, unless the same message also has explicit outgoing context ("paid to", "transferred to") within the same clause — in that case confidence drops and the message goes to review.
- "debited", "withdrawn", "paid to", "purchase at", "spent" → expense.
- "transferred to" → transfer (saved as expense, but `semanticType: "transfer"` so analytics can exclude it from spend).
- "bill due", "bill amount" → bill.
- "subscription renewed", "auto-renewal" → subscription.
- "reversed", "refund of" → refund (income side).
- Conflicting signals in the same message → return null from the template; the engine then either tries a lower-priority template or the keyword classifier with reduced confidence.

---

## Phase 3 — Engine

`services/parser/engine.ts`

```ts
parseEvent(event: RawEvent, categories: Category[]): ParsedDraft | null
```

Steps:

1. Normalize text + lower copy.
2. Resolve `senderKey` (existing `normalizeSender` + `applyAliases`).
3. Iterate templates ordered by priority. First template whose `senderMatch` and all `bodyMatch` patterns hit gets to call `parse()`.
4. On a successful `ParseOutput`, build a `ParsedDraft`:
   - `category` ← run `categorize(merchant, text, type, categories)` — same module as today, kept under `services/parser/categorize.ts`. Slightly extended to consider the `semanticType` ("bill" → Utilities, "subscription" → Utilities) when merchant is null.
   - `confidence` ← combine `baseConfidence` with `hasReference` and `hasMerchant` boosts; the existing `scoreConfidence` is reused but takes the new inputs.
   - `description` ← merchant or a derived label ("ECG bill", "DSTV subscription").
5. If no template matched, run `keywordClassifier(event, text, lower)` as a fallback. It returns a `ParsedDraft` with capped `confidence ≤ 0.5` so the review-queue path catches it.
6. Catch all errors per template — a broken regex must never crash the drain.

### `keywordClassifier`

Effectively today's `parse.ts` logic, kept as the fallback so we don't lose recall while the template set is being grown. Move the existing `FINANCIAL_KEYWORDS` / `SPAM_KEYWORDS` / `INCOME_PATTERNS` / `EXPENSE_PATTERNS` / `TRANSFER_PATTERNS` arrays here intact.

---

## Phase 4 — Dedupe upgrade

### Fingerprint

`services/dedupe/fingerprint.ts`

```ts
fingerprint(draft: ParsedDraft): string
  // composed parts, joined by "|":
  //   senderKey
  //   currencyCode ?? "?"
  //   amount.toFixed(2)
  //   reference ?? ""                       // strongest signal when present
  //   normalizeMerchantKey(merchant)
  //   floor(occurredAtMs / (2 * 60 * 1000)) // 2-min bucket; ignored when reference is present
```

When a `reference` is present, the fingerprint becomes time-independent — the same MoMo TxnID arriving twice (once via SMS, once via the MoMo app's notification) is *always* a duplicate, no matter the gap.

### Lookup history

`services/persistence/rawEvents.ts` — AsyncStorage key `STORAGE_KEYS.AUTO_LOG_RAW_HISTORY`, schema:

```ts
type RawHistoryEntry = {
  rawHash: string;       // already produced by the native side
  fingerprint: string;   // produced after parsing
  txId: string | null;   // null if the event was queued for review or dropped
  occurredAt: number;
  confidence: number;
};
```

Capped at ~2000 entries (FIFO trim). Indexed in memory after a single read on each drain — small footprint, fast lookup.

### Match flow

`services/dedupe/match.ts` (replaces today's):

1. Compute draft fingerprint.
2. Look up against `RawHistoryEntry[]`. Match if:
   - `rawHash` already seen → drop.
   - exact `fingerprint` match → drop, unless new draft has higher confidence than the existing entry, in which case `replace`.
3. Fall back to today's amount + merchant + ±2-min check against recent `Transaction[]` to catch the case where the history entry was lost (e.g. user reset stats / cleared data).

`saveDraft.ts` then writes the new `RawHistoryEntry` regardless of outcome (`save | replace | review | drop`) so future events can dedupe against it.

---

## Phase 5 — Wiring into the existing drain

`services/ingestion/drainNativeQueue.ts` does **not** change shape. Only its `runParse` dependency switches from the old `parse` to the new `parseEvent` from `services/parser/engine.ts`. The injection-friendly signature (`DrainDeps.runParse`) means existing tests that stub `runParse` keep passing.

`saveDraft.ts` gains a single line: append a `RawHistoryEntry` after the plan resolves. Plan calculation itself is unchanged.

`AutoLogStats` gains two delta fields tracked in the drain loop:
- `templatesMatched` (how many drafts came from a real template, vs the keyword fallback)
- `referencesCaptured` (how many drafts had a reference id)

Both are additive on `AutoLogStats`; UI in `AutoLogStatsCard.tsx` doesn't have to render them yet, but they're useful for tuning.

---

## Phase 6 — Tests

Jest, no React Native runtime needed for any of the parser code (all pure TS). Existing test scaffold under `__tests__/autoLogging/` is reused.

- `__tests__/autoLogging/normalize.test.ts` — every helper in `normalize.ts`.
- `__tests__/autoLogging/providers/<provider>.test.ts` — one fixture file per template, using real-shaped sample messages. ~10 fixtures per provider, including:
  - canonical debit/credit
  - SMS-vs-notification variants where both exist
  - amount with thousand separator
  - amount preceded by a balance line (must not pick balance)
  - missing reference
  - present reference
  - lowercase / mixed-case sender
  - obvious negatives ("MTN promo: win 1M GHS!" → no match)
- `__tests__/autoLogging/engine.test.ts` — priority ordering, fallback to keyword classifier, error containment.
- `__tests__/autoLogging/dedupe.test.ts` — already exists; extend for fingerprint + raw history + reference-based collapse across SMS + notification.
- `__tests__/autoLogging/parser.test.ts` — keep as a thin smoke test that exercises end-to-end `parseEvent` on a couple of representative messages.

Coverage target: every template has at least one positive and one negative fixture. We do **not** chase the ">95% on 100 fixtures" target from the upstream plan as a hard gate — it incentivizes fixture stuffing. Aim for ~10 high-signal fixtures per template, then stop.

---

## Phase 7 — Migration / rollout

The change is internal. No data migration is required:

- `Transaction` shape is unchanged.
- `ParsedDraft` gains optional fields; older items in the review queue keep validating.
- `AutoLogStats` gains optional counters that default to 0 in `EMPTY_STATS`.
- `STORAGE_KEYS.AUTO_LOG_RAW_HISTORY` is brand new — first read returns `[]`, no migration needed.

Rollout steps:

1. Land Phase 1 + Phase 6 normalize tests in one PR. No behavior change yet.
2. Land Phase 2 + Phase 3 with the keyword classifier path enabled (so behavior is at worst no-worse-than-today). Provider templates start producing high-confidence drafts immediately for matching messages.
3. Land Phase 4 dedupe upgrade. Watch the `dedupeHits` stat and the review queue volume for two app sessions.
4. Land Phase 5 stats and any UI surfacing in `AutoLogStatsCard`.
5. Trim the keyword classifier weight as templates cover more providers — its cap of `confidence ≤ 0.5` already routes its results to the review queue when `reviewLowConfidenceOnly` is on.

---

## Non-goals (deferred, intentionally)

- SQLite, MMKV, or any new persistence backend.
- Background fetch / TaskManager — drain on foreground is sufficient for AsyncStorage-only state.
- iOS parity — needs a different capture strategy and is already deferred elsewhere.
- Server-side sync, OCR, bank API integrations.
- Auto-creating new categories from messages — the classifier may only emit names from the user's existing category list.
- A "merchant learning" loop from user edits in the review queue — useful but a separate piece of work.

---

## Success criteria

1. For each provider template, ≥90% precision and ≥80% recall on the fixture set for that provider.
2. End-to-end: same MoMo transaction arriving via both SMS and the MoMo app notification produces exactly one `Transaction` row.
3. Drain time on a 200-event queue stays under ~250ms on a mid-range Android device (templates compiled once, no per-event allocations beyond the draft).
4. No new crashes attributable to the parser layer in dev for one week of dogfooding.
5. The existing `AutoLogSettingsScreen`, `ReviewQueueScreen`, `SenderMappingsScreen` flows behave identically — no visible regression.
