# iOS SMS Auto-Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring SMS auto-logging to iOS via a user-created Shortcuts "When I receive a message" automation that hands each bank/MoMo SMS to an App Intents extension, plus a clipboard "Paste an SMS" fallback on both platforms.

**Architecture:** An App Intents **extension** (not the main app, so the RN host never boots per SMS) writes one JSON file per message into an App Group inbox. The JS side reads that inbox through `expo-file-system`'s `Paths.appleSharedContainers` (no custom main-app native module) and feeds the events into the existing `drainNativeQueue` → `parseEvent` → `saveDraft` pipeline, exactly like the Android Kotlin queue. A capture-enabled flag file in the group container lets the extension refuse to store anything while capture is off.

**Tech Stack:** Expo SDK 54, `@bacons/apple-targets` 5.0.0 (`app-intent` target type), Swift/AppIntents (iOS 17+), `expo-file-system` (new API), `expo-clipboard`, Jest (ts-jest, node env).

**Constraints / known limits (from research, 2026-10-05):**
- No macOS here: Swift is unverifiable locally. Keep it tiny; verify by EAS build + TestFlight. `npx expo prebuild -p ios --no-install` can be run on Windows to verify Xcode project generation.
- Message automations can't filter alphanumeric senders by Sender → users filter by "Message Contains" (e.g. `GHS`).
- Sender is only available if the user binds `Shortcut Input › Sender` to the intent's Sender parameter. Missing sender must still work (falls back to sender label `SMS`).
- Extension deployment target is hard-coded to 17.0 by apple-targets' app-intent configuration list — matches "Run Immediately" availability (iOS 17+).
- Shared-shortcut (iCloud link) is out of scope: it must be created on a device. The setup guide walks users through adding our action directly.

---

## File Structure

| File | Responsibility |
|---|---|
| `targets/autolog-intent/expo-target.config.js` | apple-targets config: `app-intent` type, bundle id suffix, App Group entitlement |
| `targets/autolog-intent/LogSmsTransactionIntent.swift` | `AppIntent` with `message` + optional `sender` params, `@main AppIntentsExtension` |
| `targets/autolog-intent/AutoLogInbox.swift` | Writes inbox JSON files + last-capture stamp; honours enabled flag |
| `plugins/withIosAutoLogTargetVersion.js` | Syncs extension MARKETING_VERSION / CURRENT_PROJECT_VERSION with the app |
| `app.json` | App Group entitlement, apple-targets plugin, version-sync plugin |
| `src/features/autoLogging/services/ingestion/iosInbox/constants.ts` | App Group id, dir/file names, limits |
| `src/features/autoLogging/services/ingestion/iosInbox/parseInboxEntry.ts` | Pure: JSON text → `RawEvent` (validated) + rawHash |
| `src/features/autoLogging/services/ingestion/iosInbox/inboxStore.ts` | FS glue: list/read/delete inbox files, enabled flag, last-capture |
| `src/features/autoLogging/services/ingestion/nativeBridge.ts` | Route `drainQueue`/`clearQueue`/`setCaptureSms`/`isAvailable` to the iOS inbox on iOS |
| `src/features/autoLogging/types/index.ts` | `RawEvent.via?: "shortcut" \| "paste"` |
| `src/features/autoLogging/services/filter/isAllowedEvent.ts` | Sender-less shortcut/paste events bypass the sender allowlist |
| `src/features/autoLogging/services/parser/engine.ts` | Sender-less shortcut/paste events use sender label `SMS` |
| `src/features/autoLogging/services/ingestion/pasteIngest.ts` | Clipboard text → parse → save, bypassing capture toggles |
| `src/features/autoLogging/screens/IosShortcutSetupScreen.tsx` | Step-by-step Shortcuts guide + Open Shortcuts + last-capture health |
| `src/features/autoLogging/components/PasteSmsRow.tsx` | "Paste an SMS" row + result dialog |
| `src/features/autoLogging/screens/AutoLogSettingsScreen.tsx` | iOS variant: SMS toggle (no permission), hide Notifications/Allowed Apps, setup row, paste row |
| `src/features/autoLogging/components/PrivacyModal.tsx` | iOS copy |
| `src/screens/SettingsScreen.tsx`, `src/components/dashboard/AutoLogPromoCard.tsx`, `src/screens/DashboardScreen.tsx` | Re-enable entry points on iOS with iOS copy |
| `App.tsx` | Drain on foreground on iOS too |
| `docs/privacypolicy.{md,html}` | Describe iOS Shortcuts capture |

---

### Task 1: Types + pure inbox entry parser (TDD)

**Files:** Modify `types/index.ts`; Create `iosInbox/constants.ts`, `iosInbox/parseInboxEntry.ts`; Test `__tests__/autoLogging/iosInbox.test.ts`

- [ ] Add `via?: "shortcut" | "paste";` to `RawEvent`.
- [ ] constants.ts:
```ts
export const AUTOLOG_APP_GROUP = "group.com.patrickackom.financetracker";
export const INBOX_ROOT_DIR = "autolog";
export const INBOX_DIR = "inbox";
export const ENABLED_FLAG_FILE = "enabled";
export const LAST_CAPTURE_FILE = "last-capture";
export const MAX_BODY_CHARS = 4000;
export const MAX_SENDER_CHARS = 64;
export const INBOX_FILE_RE = /^[A-Za-z0-9-]{8,64}\.json$/;
```
- [ ] Failing tests: valid entry → RawEvent {source "sms", via "shortcut", trimmed body, sender trimmed or undefined when blank, timestamp}; rejects non-JSON, non-object, missing/blank body, non-finite timestamp, bad id; truncates body to 4000 and sender to 64; same sender+body within the same minute → same rawHash (two automations firing); different body → different rawHash.
- [ ] Implement `parseInboxEntry(text: string): RawEvent | null` and `inboxRawHash(sender, body, timestamp)` (`"ios|" + sender + "|" + body + "|" + minuteBucket`, FNV-1a 32-bit hex — deterministic, sync, no dependency). Id must match `/^[A-Za-z0-9-]{8,64}$/`.
- [ ] Run `npx jest __tests__/autoLogging/iosInbox.test.ts` → PASS. Commit.

### Task 2: Filter + engine handle sender-less shortcut/paste events (TDD)

**Files:** Modify `filter/isAllowedEvent.ts`, `parser/engine.ts`; Test extend `__tests__/autoLogging/filter.test.ts`, `engine.test.ts`

- [ ] Failing tests: (filter) sms `via:"shortcut"` without sender + non-empty `allowedSenders` → allowed; with sender not on allowlist → rejected; `captureSms:false` → rejected. (engine) `via:"shortcut"`, no sender, body `"You have paid GHS 45.00 to Uber. TxnID: ABC123"` → draft with `senderDisplay "SMS"`, `senderKey "sms"`; Android event without sender unchanged (`senderDisplay "Unknown"`).
- [ ] Implement: export `UNKNOWN_SMS_SENDER = "SMS"` from `routing/normalizeSender.ts`; in engine `const rawSenderId = event.source === "sms" ? (event.sender || (event.via ? UNKNOWN_SMS_SENDER : "")) : event.packageName ?? "";` In filter, after the `captureSms` check: `if (!event.sender?.trim() && event.via) return true;`
- [ ] Run filter/engine/parser suites → PASS. Commit.

### Task 3: Inbox store (FS glue) + bridge routing

**Files:** Create `iosInbox/inboxStore.ts`; Modify `nativeBridge.ts`; Test `__tests__/autoLogging/iosInboxStore.test.ts` (mock `expo-file-system` with an in-memory fake + `react-native` Platform `ios`)

- [ ] inboxStore API (all swallow errors, never throw to UI):
  - `getInboxRoot(): Directory | null` → `Paths.appleSharedContainers[AUTOLOG_APP_GROUP]` / `autolog`.
  - `isInboxAvailable(): boolean` (iOS && container present).
  - `readInbox(): Promise<RawEvent[]>` → list `inbox/*.json` matching `INBOX_FILE_RE`, `await file.text()`, `parseInboxEntry`; unparseable files are deleted; results sorted by timestamp; **event id = file stem** (so clear can't target arbitrary paths).
  - `clearInbox(ids)`: delete `inbox/<id>.json` only for ids matching the id regex.
  - `setInboxCaptureEnabled(enabled)`: create/delete `autolog/enabled`.
  - `getLastCaptureAt(): Promise<number | null>`: read `autolog/last-capture` (ms epoch).
- [ ] Tests: reads valid files and skips/deletes junk; ignores non-.json temp files; clear deletes only named files and rejects `../x`; enabled flag create/delete; unavailable container → `[]`/false.
- [ ] nativeBridge: `isAvailable()` → iOS: `isInboxAvailable()`; `drainQueue` → iOS: `readInbox()`; `clearQueue` → iOS: `clearInbox`; `setCaptureSms` → iOS: `setInboxCaptureEnabled`; `setEnabled(false)` → iOS: `setInboxCaptureEnabled(false)`; add `getLastCaptureAt()` (Android: null). Other Android-only methods keep returning defaults on iOS.
- [ ] Run suite. Commit.

### Task 4: Paste-an-SMS ingestion (TDD)

**Files:** Create `services/ingestion/pasteIngest.ts`; Test `__tests__/autoLogging/pasteIngest.test.ts`

- [ ] `ingestPastedText(text, deps?)` → `{ outcome: "saved" | "review" | "duplicate" | "not-financial" | "empty"; draft?: ParsedDraft }`. Builds `RawEvent {source:"sms", via:"paste", id:"paste-"+now, body: trimmed ≤4000, timestamp: now, rawHash: inboxRawHash(undefined, body, now)}`; does **not** check `enabled`/`captureSms` (explicit user action); parse with `parseEvent` + categories; save with `saveDraft`; bump stats (`capturedSms`, `autoSaved`/`queuedForReview`/`parseFailures`/`dedupeHits`). Deps injectable like `DrainDeps`.
- [ ] Tests: financial text with captureSms off → saved; promo/chat text → not-financial; blank → empty; plan drop → duplicate; review plan → review.
- [ ] Commit.

### Task 5: App Intents extension + native config

**Files:** Create `targets/autolog-intent/{expo-target.config.js,LogSmsTransactionIntent.swift,AutoLogInbox.swift}`, `plugins/withIosAutoLogTargetVersion.js`; Modify `app.json`, `package.json` (`npx expo install @bacons/apple-targets expo-clipboard` — project uses npm lockfile)

- [ ] expo-target.config.js:
```js
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
    type: "app-intent",
    name: "AutoLogIntent",
    displayName: "Expense Tracker SMS",
    bundleIdentifier: ".autologintent",
    deploymentTarget: "17.0",
    entitlements: {
        "com.apple.security.application-groups":
            config.ios.entitlements["com.apple.security.application-groups"],
    },
});
```
- [ ] LogSmsTransactionIntent.swift:
```swift
import AppIntents

struct LogSmsTransactionIntent: AppIntent {
    static let title: LocalizedStringResource = "Log SMS Transaction"
    static let description = IntentDescription("Sends a bank or mobile money SMS to Expense Tracker so it can be logged.")
    static let openAppWhenRun = false

    @Parameter(title: "Message") var message: String
    @Parameter(title: "Sender") var sender: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$message) from \(\.$sender)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        .result(value: AutoLogInbox.save(body: message, sender: sender))
    }
}

@main
struct AutoLogIntentExtension: AppIntentsExtension {}
```
- [ ] AutoLogInbox.swift: resolve group container; if `autolog/enabled` missing → return "SMS logging is off…"; trim body (≤4000) / sender (≤64); skip if inbox has ≥500 files; write `{"v":1,"id","sender","body","timestamp"}` to `inbox/.<id>.tmp` then move to `inbox/<id>.json`; write `last-capture` (ms); return "Sent to Expense Tracker".
- [ ] app.json: `ios.entitlements["com.apple.security.application-groups"] = ["group.com.patrickackom.financetracker"]`; plugins add `"@bacons/apple-targets"` and `"./plugins/withIosAutoLogTargetVersion"` (sets the AutoLogIntent target's `MARKETING_VERSION` = `config.version`, `CURRENT_PROJECT_VERSION` = `config.ios.buildNumber ?? "1"` via `withXcodeProject`).
- [ ] Verify: `npx expo prebuild -p ios --no-install` in a scratch copy (or repo, `ios/` is gitignored, delete after) → pbxproj contains AutoLogIntent target, app-intents extension point, group entitlement in both targets; versions synced. Commit generated `targets/autolog-intent/Info.plist` if produced. Android untouched (`git status android/` clean).

### Task 6: iOS UI

**Files:** Create `screens/IosShortcutSetupScreen.tsx`, `components/PasteSmsRow.tsx`; Modify `AutoLogSettingsScreen.tsx`, `PrivacyModal.tsx`, `SettingsScreen.tsx`, `AutoLogPromoCard.tsx`, `DashboardScreen.tsx`, `App.tsx` (use frontend-design skill; theme tokens only, no hardcoded colors)

- [ ] AutoLogSettingsScreen (iOS): `alertCaptureUnavailable` → iOS wording when `!isAvailable()` ("needs the App Store/TestFlight build"); SMS toggle needs no permission, subtitle "Forwarded by a Shortcuts automation"; after enabling → migrate currency, `setCaptureSms(true)`, open setup guide; hide Notifications toggle and Allowed Apps on iOS; new "iPhone setup" NavRow (subtitle = last capture "Last SMS 2h ago" / "Not received yet"); reconcile effect runs on iOS for `setCaptureSms`. `PasteSmsRow` on both platforms. File is 620 lines → move `NavRow`/`CurrencyRow`/`SectionLabel` into `components/AutoLogRows.tsx` to keep it under ~500.
- [ ] IosShortcutSetupScreen: numbered steps — Shortcuts → Automation → New → Message → Message Contains `GHS` → Run Immediately → New Blank Automation → Add Action → search "Expense Tracker" → "Log SMS Transaction" → Message = Shortcut Input → Sender = Shortcut Input › Sender → Done; tip to add a second automation for `GH¢`; "Open Shortcuts" (`Linking.openURL("shortcuts://")`); health line; note about Screen Unknown Senders if nothing arrives.
- [ ] PrivacyModal: platform-specific bullets.
- [ ] Re-enable entry points on iOS with iOS copy: Settings row subtitle ("Capture bank & MoMo SMS"), promo card + dashboard tour step copy mentioning the quick Shortcuts setup.
- [ ] App.tsx: drain guard → `!autoLogNative.isAvailable()` only (live subscribe stays harmless on iOS).
- [ ] Commit.

### Task 7: Docs + verification

- [ ] Privacy policy: replace "available on Android only" with an iOS paragraph (Shortcuts automation forwards matching SMS text; processed on device; remove automation to stop).
- [ ] `npx tsc -b`, `npx jest`, secrets scan, Android regression (`git diff android/` empty), fresh-eyes review, Fable review.
