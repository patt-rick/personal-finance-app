# Automatic Expense Logging — Tailored Plan for Finance Tracker

## Objective

Add an Android-first automatic expense logging feature to **Finance Tracker** (Expo SDK 54, React Native 0.81, TypeScript, AsyncStorage, cashbook-centric). The feature captures transaction SMS and financial app notifications, parses them into structured entries, prevents duplicates, categorizes them against the app's existing category system, saves them through the current storage layer (`saveTransactions`), and fits into the existing Settings → Features flow with zero regression to manual entry.

---

## How This Maps To The Existing App

This plan is written against the app exactly as it exists today. Key architectural facts it respects:

1. **Every transaction belongs to a `Business` (cashbook).** `Transaction.businessId` is required. Instead of forcing the user to pick a single "default" cashbook, the auto-logger **routes by sender identity**: SMS sender ID (e.g. "MTN", "VodafoneGH", "GCB") and notification package name (e.g. "com.mtn.momo") map to a cashbook. If a matching cashbook exists, we append to it; if not, we **auto-create one** (with a user-editable display name) and append there.
2. **Currency lives on the cashbook, not the transaction.** Parsing must support multiple currency codes (GHS, USD, EUR, GBP, etc.). When a new cashbook is auto-created, its `currency` is set from the currency detected in the first message that created it, falling back to the user's app-level default currency (new setting).
3. **Storage is AsyncStorage-only** (keys in `src/utils/storage.ts`). No SQLite, no backend, no sync. New state is persisted by calling the existing `saveTransactions(transactions)` helper.
4. **State is prop-drilled from `App.tsx`.** There is no Redux/Zustand. UI refresh after a background save happens via the existing `refreshData` callback wired through `onRefresh` / `onDataImported`. New background-written transactions must trigger the same refresh path on next app foreground.
5. **Categories are a fixed shared list** in `DEFAULT_CATEGORIES` (plus any user additions stored under `@categories`). Auto-mapping must emit one of these names — not invent new ones.
6. **Settings screen has a standard pattern** (section → `groupCard` → `row` with a lucide icon in a tinted `iconCircle`). Sub-screens are rendered conditionally inside `SettingsScreen` and dismissed with `BackHandler`. The new screens (Auto-Log Settings, Review Queue) must follow this exact pattern.
7. **No hardcoded colors.** Everything comes from `useTheme()` / theme tokens. This is a durable project rule.
8. **File size budget ~500 lines, excluding imports.** Split components and utilities accordingly.
9. **Android already prebuilt.** `android/` exists in the repo with native `app/` module, so we add Kotlin sources directly — `expo prebuild` is not needed.
10. **Package manager.** Project has `package-lock.json`; per project rules, prefer `pnpm`/`bun`/`yarn`. Use whichever lockfile the user already tracks; do not introduce a new one.

---

## Success Criteria

1. User can enable automatic logging from **Settings → Features → Automatic Logging**.
2. Captured messages are routed to a cashbook by **sender ID / package name**. Existing cashbook with a matching sender mapping → appended. No match → new cashbook created automatically with a sensible display name.
3. User can view, rename, and remap sender → cashbook mappings (e.g. merge "MTN" and "MTN-GH" into one cashbook, or redirect "GCB" into an existing "Personal" cashbook).
4. Captures SMS and notifications while the app is backgrounded or closed (Android).
5. Parses into the existing `Transaction` shape (plus a small additive metadata set) and saves through `saveTransactions`.
6. Duplicate entries (same event arriving via SMS _and_ notification, or repeated broadcasts) are collapsed into one.
7. Low-confidence entries land in a **Review Queue** instead of the cashbook.
8. Manual entry, recurring transactions, budgets, debts, and reports continue to behave identically.
9. Feature is **off by default**, behind a toggle, and respects the app's existing PIN/biometric lock on sensitive flows.
10. Android Play Store disclosure for SMS permissions is produced as part of rollout.

---

## Product Scope

### MVP

1. Android-only automatic logging.
2. SMS capture (BroadcastReceiver).
3. Notification capture (NotificationListenerService).
4. Background → foreground handoff that persists captured events even when the JS layer is not running.
5. Parser that emits `Transaction` (+ metadata).
6. **Sender-based cashbook routing** with auto-create and a user-editable mapping table.
7. App-level default currency setting (used when creating a new cashbook from a message that has no currency hint).
8. Duplicate detection across SMS + notification sources.
9. Category auto-mapping to the app's existing category list.
10. Settings UI (enable/disable, source toggles, sender-mapping manager, allowed-apps picker, review behavior).
11. Permissions + onboarding flow.
12. Review Queue screen.

### Deferred

1. Merchant-learning from user edits.
2. Rule-based overrides ("always log Uber to Transportation in Personal cashbook").
3. Insights / auto-log metrics dashboard.
4. Budget-alert integration (notify when an auto-logged expense breaches budget).
5. iOS parity (requires a different capture strategy; intentionally out of scope for MVP).
6. Receipt OCR.
7. Bank API integrations.

---

## Integration Rules

1. **Reuse** the `Transaction` type; only extend with optional metadata fields.
2. **Reuse** `saveTransactions` from `src/utils/storage.ts` — do not introduce a parallel store for live entries.
3. **Reuse** the category list from `loadCategories()`.
4. **Reuse** the `Business` + currency selection model — do not introduce a currency field on `Transaction`.
5. **Reuse** `useTheme()` tokens; no hardcoded colors anywhere in new UI.
6. **Reuse** the Settings sub-screen pattern (conditional render + `BackHandler`) instead of adding a new navigator.
7. **Reuse** `expo-notifications` (already a dep) for any user-facing "new auto-logged" notifications; keep behavior consistent with existing `scheduleReminders` in `src/utils/notifications.ts`.
8. **Reuse** `expo-secure-store` for any sensitive toggle state (e.g., the raw allowed-apps list is fine in AsyncStorage, but encryption keys — if introduced — go in SecureStore).
9. **Keep manual entry untouched** — `TransactionEntryModal` and its flows do not change.
10. **Feature-flag** the entire subsystem behind a single `autoLogEnabled` stored setting; the native services must no-op when it is off.

---

## Tech Approach

- Expo SDK 54, RN 0.81, TypeScript (existing).
- Kotlin native modules inside `android/app/src/main/java/...` alongside the existing MainApplication/MainActivity.
- `BroadcastReceiver` for incoming SMS.
- `NotificationListenerService` for posted notifications.
- A small **event queue** (MMKV _or_ a simple JSON file in app internal storage) that the native layer writes into even when JS is cold. The JS layer drains it on next foreground. This avoids the "JS bridge not alive" problem for background events.
- `DeviceEventEmitter` (RN) for live events while the app is foregrounded.
- AsyncStorage for settings; SecureStore only if we add encryption for the raw-text field.
- `expo-dev-client` custom build is required; Expo Go cannot host these native modules. Shipping flow: EAS build (dev client for QA, production for store).

---

## New Modules — Directory Layout

```
src/
  features/
    autoLogging/
      components/
        AutoLogToggleRow.tsx
        AllowedAppsSelector.tsx
        SenderMappingRow.tsx
        SenderMappingEditor.tsx
        ReviewItemCard.tsx
      hooks/
        useAutoLogSettings.ts
        useAutoLogQueue.ts
        useSenderMappings.ts
      services/
        ingestion/
          drainNativeQueue.ts        // pulls native events into JS
          nativeBridge.ts            // wraps NativeModules
          saveDraft.ts               // draft → transaction + sender routing
        routing/
          normalizeSender.ts         // sender / package → senderKey
          senderAliases.ts           // seed alias table
          resolveBusiness.ts         // mapping lookup + auto-create
        parser/
          amount.ts                  // regex + currency-code detection
          merchant.ts                // "at X", "to X", "from X"
          type.ts                    // expense/income/transfer
          categorize.ts              // map to existing categories
          confidence.ts              // 0..1 scoring
          parse.ts                   // orchestrator
        dedupe/
          hash.ts                    // normalized hash of amount+merchant+window
          match.ts                   // find near-duplicate in recent txns
        permissions/
          android.ts                 // request + check SMS / notification access
        persistence/
          settings.ts                // AsyncStorage: @autolog_settings
          reviewQueue.ts             // AsyncStorage: @autolog_review_queue
          senderMappings.ts          // AsyncStorage: @autolog_sender_mappings
      screens/
        AutoLogSettingsScreen.tsx
        SenderMappingsScreen.tsx
        ReviewQueueScreen.tsx
        AutoLogOnboardingScreen.tsx
      types/
        index.ts                     // RawEvent, ParsedDraft, SenderMapping, ReviewItem, AutoLogSettings
android/
  app/src/main/java/com/patrickackom/financetracker/autolog/
    SmsReceiver.kt
    NotificationListener.kt
    AutoLogQueue.kt                  // shared event queue (MMKV / file)
    AutoLogPackage.kt                // RN package registration
    AutoLogModule.kt                 // exposes: isEnabled, setEnabled, drainQueue, openNotificationAccess
```

Each file stays well under the 500-line budget; anything growing past that should be split further.

---

## Type Extensions

No breaking changes to `Transaction`. Add optional metadata, because existing transactions simply won't have them:

```ts
// src/types.ts
export interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: "income" | "expense";
    businessId: string;
    category?: string;
    subCategory?: string;
    paymentMode?: string;
    remark?: string;

    // NEW — optional, only set for auto-logged entries
    source?: "manual" | "recurring" | "sms" | "notification";
    sourceApp?: string; // e.g. "com.mtn.momo"
    rawText?: string; // original SMS body / notification text
    autoLogged?: boolean;
    confidence?: number; // 0..1
    reviewStatus?: "pending" | "confirmed" | "rejected";
}
```

New feature-local types live under `src/features/autoLogging/types/index.ts`:

```ts
export interface RawEvent {
    id: string; // generated at capture time
    source: "sms" | "notification";
    packageName?: string; // notifications only
    sender?: string; // sms only
    title?: string; // notifications only
    body: string;
    timestamp: number;
    rawHash: string; // for dedupe against already-drained events
}

export interface ParsedDraft {
    amount: number;
    currencyCode: string | null; // "GHS", "USD", ... or null when not detected
    merchant: string | null;
    type: "expense" | "income" | "transfer";
    category: string; // must match an existing Category.name
    description: string;
    occurredAt: string; // ISO
    confidence: number;
    source: "sms" | "notification";
    sourceApp?: string;
    senderKey: string; // normalized routing key (see Sender Routing)
    senderDisplay: string; // e.g. "MTN", "Vodafone Cash", "GCB Bank"
    rawText: string;
}

export interface SenderMapping {
    senderKey: string; // normalized, e.g. "mtn"
    displayName: string; // editable by user, e.g. "MTN MoMo"
    businessId: string | null; // null = unassigned (route still auto-creates)
    autoCreated: boolean; // true if the cashbook was created by the auto-logger
    sampleSenders: string[]; // original raw senders/packages seen (for debugging + UI)
    createdAt: string;
}

export interface ReviewItem {
    id: string;
    draft: ParsedDraft;
    businessId: string; // pre-resolved via sender routing
    createdAt: string;
}

export interface AutoLogSettings {
    enabled: boolean;
    captureSms: boolean;
    captureNotifications: boolean;
    defaultCurrency: string; // e.g. "GHS" — used when auto-creating a cashbook with no currency signal
    allowedPackages: string[]; // e.g. ["com.mtn.momo", "com.ghana.mobilemoney"]
    allowedSenders: string[]; // e.g. ["MTN", "VODAFONE", "GCB"] — allowlist for SMS capture
    reviewLowConfidenceOnly: boolean; // if false, review EVERY capture
    askBeforeSaving: boolean;
    minConfidenceForAutoSave: number; // 0..1, default 0.75
}
```

---

## Settings UI — Where It Lives

Add one row to the existing **Features** section of `SettingsScreen.tsx` (alongside Reports, Recurring Transactions, Debts & Loans):

- Icon: `Sparkles` or `Zap` (lucide), in a theme-token tinted `iconCircle`.
- Title: **"Automatic Logging"**.
- Sub: **"Capture expenses from SMS & notifications"**.
- Tapping it sets `showAutoLog = true` and renders `<AutoLogSettingsScreen onBack={...} />`, matching the existing pattern for `showReports`, `showRecurring`, `showDebts`.
- Register the BackHandler branch in the same `useFocusEffect` that handles the other sub-screens.
- Add the `showAutoLog` reset to the existing blur/cleanup `useFocusEffect`.

`AutoLogSettingsScreen` layout (same `groupCard` / `row` primitives as the rest of Settings):

- **Status card** — big toggle; shows current state + next step if permissions missing.
- **Capture Sources** — SMS toggle, Notifications toggle.
- **Default Currency** — tap to open a picker (GHS / USD / EUR / GBP, extensible). Used only when auto-creating a new cashbook for a sender that has no currency hint in the first message.
- **Sender Mappings** — navigates into `SenderMappingsScreen` which lists every `SenderMapping` we've seen, what cashbook it routes to, and a sample sender. Each row opens an editor allowing: rename display, route to an existing cashbook (picker of existing `Business[]`), route to a new cashbook (auto-create), disable this sender (blocks future capture from it).
- **Allowed Apps / Senders** — picker listing packages + SMS senders captured so far, with manual add. Used as an allowlist so noisy unrelated apps are never read.
- **Review Behavior** — "Review all" vs. "Review low confidence only" vs. "Silent auto-save". Minimum-confidence slider (0.5 – 0.95, default 0.75).
- **Review Queue** row — navigates into `ReviewQueueScreen`, badge count on the right.
- **Privacy** — short explainer + link to privacy policy changes.

---

## Sender Routing (The Core Of This Feature)

Every incoming event is tagged with a `senderKey` and routed to a cashbook using the following pipeline. This is a pure function of `(RawEvent, SenderMapping[], Business[])` → `{ businessId, newBusiness?, newMapping? }`, which makes it trivial to unit test.

### Step 1 — Normalize to `senderKey`

- **SMS** — strip non-alphanumerics, lowercase, strip country suffixes: `"MTN-GH"` → `"mtn"`, `"VodafoneCash"` → `"vodafonecash"`, `"+233241234567"` → `"p233241234567"` (we keep the `p` prefix so a random phone number never collides with an alphanumeric sender).
- **Notification** — use the package name as-is (already canonical), lowercase: `"com.mtn.momo"` → `"com.mtn.momo"`.
- Known-alias table collapses common variants to one key: `{ "mtnmobilemoney": "mtn", "mtnmomo": "mtn", "momo": "mtn", "com.mtn.momo": "mtn" }`. The table is seeded with a short Ghana-focused list and extended by the user via the Sender Mappings screen.

### Step 2 — Look up `SenderMapping`

- If `senderKey` exists in `@autolog_sender_mappings`, use its `businessId`. Done.
- If not, fall through to Step 3.

### Step 3 — Create mapping + cashbook

- Pick a display name from `senderDisplay`: use the user-friendly form derived from the original sender ID (title-case alphanumerics) or the package's app label if available via native.
- Create a new `Business` with:
    - `id`: `generateId()`
    - `name`: the display name (e.g. "MTN MoMo").
    - `createdAt`: `new Date().toISOString()`.
    - `currency`: the currency detected in the first message's text if present, else `settings.defaultCurrency`.
- Append to businesses via the same safe load → merge → save pattern used for transactions.
- Append a new `SenderMapping` row: `{ senderKey, displayName, businessId, autoCreated: true, sampleSenders: [rawSender], createdAt }`.

### Step 4 — Append to routed cashbook

- Standard transaction append through `saveTransactions`, with `businessId` set to the routed business.

### Currency mismatch inside an existing cashbook

If a later message arrives for a mapped sender but parses a currency that differs from the cashbook's currency, do **not** convert. Route the parsed draft to the Review Queue with a visible "currency mismatch" flag; user can pick (a) move this one into a different cashbook, (b) change the cashbook's currency, or (c) reject the entry.

### Editing and merging mappings

- Renaming a display also renames the underlying cashbook (only if `autoCreated === true` to avoid clobbering user-renamed cashbooks).
- "Redirect to existing cashbook" simply updates the mapping's `businessId`. The previously auto-created cashbook is **not** deleted automatically — we offer a "Delete empty cashbook" action only when it has zero transactions.
- "Merge" = update mapping A's `businessId` to point at mapping B's cashbook, with the same "delete empty source" prompt.

---

## Permissions Flow (Android)

On first enable, push the user through `AutoLogOnboardingScreen`:

1. Explain what is captured and what stays on the device.
2. Request `READ_SMS` / `RECEIVE_SMS` (runtime).
3. Prompt to grant **Notification Access** via `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` (cannot be runtime-granted).
4. Request `POST_NOTIFICATIONS` (Android 13+) — only if the feature will post its own "new auto-logged" notifications.
5. Let the user select allowed apps.
6. Confirm enabled.

If any required permission is revoked later, flip `enabled` to `false` on next foreground and surface a recovery banner on the Auto-Log Settings screen.

Android manifest additions (in `android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.READ_SMS"/>
<uses-permission android:name="android.permission.RECEIVE_SMS"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"/>

<receiver android:name=".autolog.SmsReceiver" android:exported="true"
          android:permission="android.permission.BROADCAST_SMS">
  <intent-filter android:priority="999">
    <action android:name="android.provider.Telephony.SMS_RECEIVED"/>
  </intent-filter>
</receiver>

<service android:name=".autolog.NotificationListener"
         android:label="Finance Tracker Auto-Log"
         android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
         android:exported="false">
  <intent-filter>
    <action android:name="android.service.notification.NotificationListenerService"/>
  </intent-filter>
</service>
```

---

## Native → JS Event Flow

1. `SmsReceiver` / `NotificationListener` fire on system broadcast.
2. The native component checks `AutoLogModule.isEnabled()` (reads from shared prefs) and the allowed-apps list. If disabled or not allowed, return immediately.
3. Writes a `RawEvent` into `AutoLogQueue` (file or MMKV in app-internal storage).
4. If the RN bridge is alive, also emit `DeviceEventEmitter.emit("AutoLog:RawEvent", payload)`.
5. JS layer, on app foreground or on live event, calls `drainNativeQueue()` → hands each `RawEvent` to the parser pipeline → persists results (confirmed → `saveTransactions`; pending → `@autolog_review_queue`).
6. JS then calls `AutoLogModule.clearQueue(drainedIds)`.

Foreground trigger: subscribe to `AppState` inside the existing `App.tsx` `useEffect` (there is already an `AppState` listener for the lock-screen). On transition to `active`, call `drainNativeQueue()` and then `refreshData()`.

---

## Parsing Pipeline

Input: `RawEvent`. Output: `ParsedDraft | null` (null when the text is clearly non-financial).

Stages (pure functions, each one unit-testable):

1. **Financial detection** — keyword scoring with two lexicons:
    - Expense: `debit, paid, sent, charged, purchase, withdrawal, bought, deducted, spent`.
    - Income: `credit, received, refund, deposit, salary, payout`.
    - Reject if score < threshold, OR if spam keywords dominate: `won, promo, offer, reward, discount, congratulations, lottery`.
2. **Amount extraction** — regex over common shapes, currency-code aware:
    - `/(?:GHS|GH₵|₵|USD|US\$|\$|EUR|€|GBP|£)\s*([\d,]+(?:\.\d{1,2})?)/i`
    - `/([\d,]+(?:\.\d{1,2})?)\s*(?:GHS|GH₵|USD|EUR|GBP)/i`
    - Fallback bare number only when a financial keyword is adjacent.
3. **Currency resolution** — if detected currency ≠ the default cashbook's currency, mark the item low confidence and route it to Review. Do not silently convert.
4. **Merchant / counterparty** — lightweight patterns: `at X`, `to X`, `from X`, `@ X`. Strip trailing punctuation, collapse whitespace.
5. **Type inference** — expense vs. income from lexicon; `transfer` when keywords indicate peer-to-peer without settlement info.
6. **Category mapping** — merchant-keyword lookup table (loaded at feature init) against `loadCategories()`. Examples using _existing_ category names only:
    - Uber / Bolt / Yango → `Transportation`
    - Shell / Goil / Total / Shell → `Transportation`
    - KFC / Papaye / Chicken Republic → `Food`
    - Melcom / Shoprite / Palace → (fallback `Other Expense` — there is no "Shopping" default category, and we must NOT invent one)
    - ECG / Ghana Water / Vodafone / MTN postpaid → `Utilities`
    - Fallback → `Other Expense` or `Other Income`.
7. **Confidence score** — sum of weighted signals (financial keyword present, amount parsed cleanly, currency matches cashbook, merchant extracted, category mapped). Normalized to 0..1.

Return object: `ParsedDraft`.

---

## Converting A Draft Into A Transaction

```ts
// in src/features/autoLogging/services/ingestion/saveDraft.ts
async function saveDraft(draft: ParsedDraft, settings: AutoLogSettings) {
    // 1. Resolve (or auto-create) the cashbook via sender routing.
    const { businessId, newBusiness, newMapping } = await resolveBusiness(draft, settings);

    // 2. If we had to create a cashbook or mapping, persist those first
    //    using the same safe load-merge-save pattern as transactions.
    if (newBusiness) {
        const businesses = await loadBusinesses();
        await saveBusinesses([...businesses, newBusiness]);
    }
    if (newMapping) {
        await appendSenderMapping(newMapping);
    }

    // 3. Build the transaction.
    const tx: Transaction = {
        id: generateId(),
        description: draft.merchant ?? (draft.type === "income" ? "Auto income" : "Auto expense"),
        amount: draft.amount,
        date: draft.occurredAt,
        type: draft.type === "transfer" ? "expense" : draft.type,
        businessId,
        category: draft.category,
        remark: draft.rawText.slice(0, 280),
        source: draft.source,
        sourceApp: draft.sourceApp ?? draft.senderDisplay,
        rawText: draft.rawText,
        autoLogged: true,
        confidence: draft.confidence,
        reviewStatus: "confirmed",
    };

    // 4. Route to transactions or review queue.
    if (draft.confidence >= settings.minConfidenceForAutoSave && !settings.askBeforeSaving) {
        const existing = await loadTransactions();
        await saveTransactions([...existing, tx]);
    } else {
        await appendReviewItem({
            id: tx.id,
            draft,
            businessId,
            createdAt: new Date().toISOString(),
        });
    }
}
```

**Important**: `saveTransactions` and `saveBusinesses` both replace the whole array. To avoid clobbering writes from the active UI, every append path must `load…()` immediately before and call `save…()` with the merged result. Do this inside a simple in-JS async mutex (keyed separately for transactions, businesses, mappings, and review queue).

---

## Duplicate Detection

Prevent double logging when the same payment arrives via SMS + bank app notification.

- Compute a `dedupeKey` = `amount|normalized_merchant|rounded_timestamp_to_2min`.
- Before appending, scan the last 24h of transactions (both confirmed and pending review) for a matching key.
- On match: keep the higher-confidence entry; merge `rawText` by concatenation; do not create a second row.
- Also dedupe inside the raw-event queue via `RawEvent.rawHash` so the same broadcast retried by Android doesn't double-write.

---

## Review Queue Screen

`ReviewQueueScreen` is the sub-screen reached from Auto-Log Settings. Layout follows the existing Debts / Recurring screens:

- Header + back button that mirrors `SecuritySettingsScreen`.
- List of `ReviewItemCard`s, each showing:
    - Amount + currency symbol (via `getCurrencySymbol(defaultBusiness.currency)`).
    - Detected merchant / category.
    - Small "SMS" or "Notification" source chip using theme tokens.
    - Raw text preview (truncated) in `textSecondary`.
- Tap a card → inline editor (amount, category from the existing picker, merchant/description) and two actions:
    - **Confirm** — moves it into transactions via `saveTransactions`; removes from queue.
    - **Reject** — removes from queue and records the merchant + text into a simple `@autolog_rejects` list to downweight similar events in future.
- Empty state: friendly illustration + "Nothing to review" copy.

Add a small pending-count badge on the Settings "Review Queue" row, and optionally on the Dashboard (deferred — not MVP).

---

## Transactions List Integration

- No schema-breaking changes to `TransactionItem` or `CashbookDetailSheet`.
- When `tx.autoLogged === true`, show a small "Auto" chip using theme tokens (e.g. `theme.colors.incomeBg` / `theme.colors.primary`). Do this inside `TransactionItem.tsx` using an optional render block — keep diffs minimal per the "only change what's asked" project rule.
- `TransactionDetailModal` can show `rawText` under "Source details" when present.

---

## Error & Recovery Handling

| Failure                       | Behavior                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| SMS permission denied         | `enabled=false`, settings screen shows a recovery banner with "Grant permission" button.                                            |
| Notification access revoked   | Same as above; detected on foreground.                                                                                              |
| Parse failure                 | Event is discarded (not saved), incrementing a local counter used only for telemetry toggles; nothing surfaces to the user.         |
| Duplicate conflict            | Silently collapsed per the dedupe rules.                                                                                            |
| AsyncStorage write failure    | Retry once; if still failing, leave the event in the native queue so it's re-drained next foreground. Never crash the capture path. |
| OS kills the listener service | User re-enable path is a single "Re-enable" tap on the Settings screen.                                                             |

---

## Privacy & Compliance

1. **Local only** — raw SMS / notification text never leaves the device.
2. **Explicit copy** in onboarding describing exactly which fields are read.
3. **Raw text** in `Transaction.rawText` is opt-in at the settings level; a "Store original message text" toggle (default **on**, user can switch off to drop `rawText`).
4. **Play Store disclosure** — prepare the SMS permission declaration form. Primary use: financial management (allowed). Secondary use: none. No server upload.
5. **Privacy Policy update** — add a short section covering SMS/notification capture.
6. **Export/Import compatibility** — `exportAllData` in `src/utils/storage.ts` already serializes all transactions; the new optional metadata fields will round-trip through JSON with no migration needed. Verify `importAllData` still succeeds on a backup produced before the feature existed (it will — the fields are all optional).

---

## Rollout

1. **Dev client** — gate new screens behind `__DEV__` or a remote config flag while shaking out parsing on real Ghanaian / US SMS payloads.
2. **Internal test track** (Play Console) — 5–10 devices, at least 2 Android versions.
3. **Closed beta** — 50–100 users, monitor crash-free rate and parse success.
4. **Staged rollout** — 10% → 50% → 100% over two weeks, pausing on crash spikes.
5. **Versioning** — bump `app.json` version, ship a changelog entry describing the new permission.

---

## Metrics (Local Only, Shown In Settings)

Because this app has no backend, "metrics" means a local counters object stored under `@autolog_stats` and displayed only to the user (or in a dev-only overlay). Track:

1. Events captured per source.
2. Auto-saved vs. review count.
3. Manual correction rate on review.
4. Dedupe hit count.
5. Parse-failure count.

No network telemetry is added in MVP.

---

## Testing

The project has no Jest config today, so any test setup is new work. Keep it minimal and focused:

- **Install** `jest` + `@types/jest` + `ts-jest` (or react-native-testing-library only if we test components).
- **Unit** — parser stages (amount, merchant, type, category, confidence) and dedupe. These are pure functions and give the biggest return per test.
- **Integration** — `drainNativeQueue` with a mocked `AutoLogModule`, asserting it calls `saveTransactions` with the expected merged array and writes leftovers to review queue.
- **Regression** — one snapshot of `TransactionItem` with and without `autoLogged` to catch accidental layout drift.
- **Manual QA matrix** — real devices on Android 10 / 13 / 14; MTN MoMo, Vodafone Cash, and at least one local bank.

No backend tests exist and none are added. The CLAUDE.md TDD rule targets backend work; this is a client-only feature so tests follow the "write after" approach.

---

## Pre-Completion Checks (per project rules)

Before calling this feature done, run the existing project checklist from `CLAUDE.md`:

1. `npx tsc -b` — zero type errors in new code.
2. Scan for hardcoded secrets, keys, tokens — there should be none; nothing server-side here.
3. Scan for `hardcoded colors` — all new UI uses `useTheme()` tokens.
4. Input validation at two boundaries:
    - User input in Auto-Log Settings (minimum confidence must be 0–1; default cashbook must exist).
    - Native event payloads (cap `body` / `title` / `rawText` lengths; reject malformed JSON from the native queue).
5. Permissions audit — the app only asks for SMS and notification listener, documented and justified.
6. Read new code with fresh eyes for subtle bugs (race conditions around drain + manual save is the main risk — ensure the async mutex is actually there).

---

## Claude Code Implementation Instructions

1. Do **not** begin implementing until explicitly asked. This file is a plan.
2. When asked to implement, land the work in the 8 commits listed in the next section, in order.
3. Reuse existing theme tokens, category list, and `Business` model verbatim.
4. Do not modify `TransactionEntryModal`, recurring transactions, budgets, or debts unless strictly required.
5. Feature must be off by default for existing users.

---

## Commit-By-Commit Breakdown

Each commit is small, reviewable on its own, and leaves the app in a working state. Every commit runs `npx tsc -b` green before merging.

### Commit 1 — Types & persistence scaffolding (invisible)

**Goal:** introduce types and AsyncStorage-backed persistence primitives, without touching any UI.

Created:

- `src/features/autoLogging/types/index.ts` — `RawEvent`, `ParsedDraft`, `SenderMapping`, `ReviewItem`, `AutoLogSettings`.
- `src/features/autoLogging/services/persistence/settings.ts` — `loadAutoLogSettings()`, `saveAutoLogSettings()`, default settings (enabled=false).
- `src/features/autoLogging/services/persistence/senderMappings.ts` — `loadSenderMappings()`, `saveSenderMappings()`, `appendSenderMapping()`.
- `src/features/autoLogging/services/persistence/reviewQueue.ts` — `loadReviewQueue()`, `saveReviewQueue()`, `appendReviewItem()`, `removeReviewItem()`.

Modified:

- `src/types.ts` — add optional fields to `Transaction`: `source`, `sourceApp`, `rawText`, `autoLogged`, `confidence`, `reviewStatus`.
- `src/utils/storage.ts` — add new storage keys (`@autolog_settings`, `@autolog_sender_mappings`, `@autolog_review_queue`) to the existing `STORAGE_KEYS` constant. Extend `AppBackup.data` to round-trip sender mappings and review queue through export/import. Bump `AppBackup.version` to `3` and handle v2 backups gracefully on import.

Tests: none yet (no logic).

---

### Commit 2 — Sender routing (pure logic, no UI)

**Goal:** implement sender normalization, mapping lookup, and cashbook auto-create as pure testable functions.

Created:

- `src/features/autoLogging/services/routing/normalizeSender.ts` — `normalizeSender(source, rawId)` → `senderKey`.
- `src/features/autoLogging/services/routing/senderAliases.ts` — seed alias table (`mtnmomo` → `mtn`, `com.mtn.momo` → `mtn`, etc.) + `applyAliases(senderKey)`.
- `src/features/autoLogging/services/routing/resolveBusiness.ts` — `resolveBusiness(draft, settings, businesses, mappings, now?)` → `{ businessId, newBusiness?, newMapping? }`.
- `src/features/autoLogging/services/routing/displayName.ts` — derive friendly display from raw sender / package name.

Tests: deferred to Commit 3 where Jest is installed and configured. Routing is pure so all five cases (variant collapse, existing mapping hit, auto-create path, currency fallback, phone vs alphanumeric) are covered there.

Modified: nothing else.

---

### Commit 3 — Parser pipeline (pure logic, no UI)

**Goal:** convert a `RawEvent` + `senderKey/senderDisplay` context into a `ParsedDraft`.

Created:

- `src/features/autoLogging/services/parser/amount.ts` — regex for `GHS|USD|EUR|GBP|$|€|£|₵` prefixes and suffixes.
- `src/features/autoLogging/services/parser/merchant.ts` — `at X`, `to X`, `from X`, `@ X`.
- `src/features/autoLogging/services/parser/type.ts` — expense / income / transfer heuristics.
- `src/features/autoLogging/services/parser/categorize.ts` — merchant-keyword lookup against the app's existing categories.
- `src/features/autoLogging/services/parser/confidence.ts` — weighted 0..1 score.
- `src/features/autoLogging/services/parser/parse.ts` — orchestrator returning `ParsedDraft | null`.
- `src/features/autoLogging/services/dedupe/hash.ts` — `dedupeKey(amount, merchant, timestamp)`.
- `src/features/autoLogging/services/dedupe/match.ts` — find near-duplicates in the last 24h of transactions + review queue.
- Tests under `__tests__/autoLogging/parser.test.ts` covering the main lexicons, multi-currency (GHS / USD / EUR) cases, spam rejection, and dedupe hits.
- Tests under `__tests__/autoLogging/routing.test.ts` (deferred from Commit 2) covering variant collapse, existing-mapping hit, auto-create path, currency fallback, phone-vs-alphanumeric disambiguation.

Dev dependency added: `jest`, `@types/jest`, `ts-jest` (or reuse if already present) — minimal config.

Modified: `package.json` — add `test` script + jest config block.

---

### Commit 4 — Settings UI & Sender Mappings screen (still no capture)

**Goal:** users can browse, toggle, and edit — but since capture is not wired yet, nothing populates.

Created:

- `src/features/autoLogging/hooks/useAutoLogSettings.ts` — load/save settings, provide update helpers.
- `src/features/autoLogging/hooks/useSenderMappings.ts` — load/save mappings, provide rename / remap / delete helpers.
- `src/features/autoLogging/components/AutoLogToggleRow.tsx` — themed toggle row.
- `src/features/autoLogging/components/SenderMappingRow.tsx` — list-item style.
- `src/features/autoLogging/components/SenderMappingEditor.tsx` — modal editor (rename, route to existing cashbook, disable).
- `src/features/autoLogging/components/AllowedAppsSelector.tsx` — sheet to pick apps + manually add senders.
- `src/features/autoLogging/screens/AutoLogSettingsScreen.tsx` — the new settings hub.
- `src/features/autoLogging/screens/SenderMappingsScreen.tsx` — list + editor host.

Modified:

- `src/screens/SettingsScreen.tsx` — add the new "Automatic Logging" row inside the **Features** section, plus `showAutoLog` state, cleanup `useFocusEffect`, and BackHandler branch matching the existing pattern.

Tests: a quick snapshot of `AutoLogSettingsScreen` default state. Nothing deeper.

---

### Commit 5 — Review Queue screen + manual seeding (still no capture)

**Goal:** the full post-capture UX is reviewable end-to-end via a dev-only "seed sample events" button, without any native code.

Created:

- `src/features/autoLogging/hooks/useAutoLogQueue.ts` — expose `reviewItems`, `confirm(id, edits)`, `reject(id)`.
- `src/features/autoLogging/components/ReviewItemCard.tsx` — card with source chip + inline editor trigger.
- `src/features/autoLogging/screens/ReviewQueueScreen.tsx` — list + confirm/reject flow.
- `src/features/autoLogging/services/ingestion/saveDraft.ts` — implements the `saveDraft` function from this plan, using the routing + parser + dedupe modules.
- `src/features/autoLogging/services/ingestion/devSeed.ts` — `__DEV__`-guarded helper that injects canned `RawEvent`s through the real pipeline, so QA can exercise routing and review without Android.

Modified:

- `src/features/autoLogging/screens/AutoLogSettingsScreen.tsx` — wire the "Review Queue" row to open `ReviewQueueScreen` and show pending count badge. Add a dev-only "Seed sample events" row guarded by `__DEV__`.

Tests: `__tests__/autoLogging/saveDraft.test.ts` — happy path (auto-save), low-confidence path (queue), dedupe path (collapse), new-cashbook path (auto-create fires).

---

### Commit 6 — Native Android capture (Kotlin + manifest)

**Goal:** actual SMS + notification capture on-device, gated entirely behind the `enabled` setting.

Created:

- `android/app/src/main/java/com/patrickackom/financetracker/autolog/SmsReceiver.kt`.
- `android/app/src/main/java/com/patrickackom/financetracker/autolog/NotificationListener.kt`.
- `android/app/src/main/java/com/patrickackom/financetracker/autolog/AutoLogQueue.kt` — shared event queue (file-backed JSON in app-internal storage).
- `android/app/src/main/java/com/patrickackom/financetracker/autolog/AutoLogModule.kt` — RN bridge exposing `isEnabled`, `setEnabled`, `setAllowedPackages`, `setAllowedSenders`, `drainQueue`, `clearQueue`, `openNotificationAccessSettings`, `getInstalledApps`.
- `android/app/src/main/java/com/patrickackom/financetracker/autolog/AutoLogPackage.kt`.
- `src/features/autoLogging/services/ingestion/nativeBridge.ts` — TypeScript wrapper around `NativeModules.AutoLogModule`.
- `src/features/autoLogging/services/permissions/android.ts` — request + check `READ_SMS`, `POST_NOTIFICATIONS`, notification-listener-access.
- `src/features/autoLogging/screens/AutoLogOnboardingScreen.tsx` — the permissions walkthrough.

Modified:

- `android/app/src/main/AndroidManifest.xml` — add permissions + receiver + service declarations.
- `android/app/src/main/java/com/patrickackom/financetracker/MainApplication.kt` (or `.java`) — register `AutoLogPackage`.
- `app.json` — no change needed (prebuilt android is already in the repo).
- `src/features/autoLogging/screens/AutoLogSettingsScreen.tsx` — the top toggle now drives `AutoLogModule.setEnabled()` and gates on permissions; replaces the dev-only placeholder from Commit 4.

Tests: manual-only (real device). Add `docs/android-autolog-qa.md` with the minimum matrix: Android 10/13/14, MTN / Vodafone / a bank SMS, plus the corresponding notifications.

---

### Commit 7 — Drain & foreground integration

**Goal:** hand events from native to JS cleanly, with no race conditions against the UI.

Created:

- `src/features/autoLogging/services/ingestion/drainNativeQueue.ts` — drains queue, parses each event, calls `saveDraft` for each, then clears the drained IDs in native.
- `src/features/autoLogging/services/ingestion/mutex.ts` — small keyed async mutex.

Modified:

- `App.tsx` — inside the existing `AppState` listener, call `drainNativeQueue()` on transition to `active`, followed by `refreshData()`. Also subscribe to `DeviceEventEmitter` for live events while foregrounded. Guard both with `Platform.OS === "android"` and the `enabled` setting.
- `src/features/autoLogging/services/ingestion/saveDraft.ts` — route all AsyncStorage writes through the mutex.
- `src/components/TransactionItem.tsx` — optional render of a small "Auto" chip when `tx.autoLogged === true`, using theme tokens.
- `src/components/TransactionDetailModal.tsx` — show `rawText`, `source`, `sourceApp`, `confidence` under a "Source details" block when present.

Tests: `__tests__/autoLogging/drain.test.ts` with a mocked `AutoLogModule`, asserting drain → parse → saveDraft → clearQueue order and that mutex serializes concurrent drains.

---

### Commit 8 — Polish, privacy, store disclosure

**Goal:** production-ready release checklist.

Created:

- `docs/privacy-policy-autolog.md` — copy block to merge into the public privacy policy.
- `docs/play-store-sms-permission-declaration.md` — text answers for the Play Console Permissions Declaration form.
- `docs/android-autolog-qa.md` — finalized QA matrix (from Commit 6).

Modified:

- `app.json` — version bump.
- `src/features/autoLogging/screens/AutoLogSettingsScreen.tsx` — "Privacy" row linking to the in-app privacy modal; local metrics display (`@autolog_stats`).
- `src/features/autoLogging/services/persistence/settings.ts` — add a one-time migration that sets `defaultCurrency` to the currency of the user's most-used cashbook at first enable.
- Fresh-eyes review pass across every new file (per the project's pre-completion checklist): no hardcoded colors, no secrets, inputs validated, raw-text capped, mutex present.

---

## Immediate Deliverables

1. Native SMS `BroadcastReceiver` + Kotlin module.
2. Native `NotificationListenerService` + Kotlin module.
3. Shared native event queue.
4. JS parser pipeline (amount, merchant, type, category, confidence, dedupe).
5. Sender routing (normalize + alias + resolve/auto-create).
6. Settings UI + Sender Mappings screen + allowed-apps picker + default-currency picker.
7. Review Queue screen.
8. `Transaction` type extension (optional metadata fields).
9. Android manifest + permissions onboarding.
10. Play Store SMS-permission disclosure copy.
11. Privacy policy update copy.
