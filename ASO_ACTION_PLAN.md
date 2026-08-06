# ASO Action Plan — Finance Tracker

Source: `audit.pdf` (April 2026, by Joshua — ASO & Mobile Growth Specialist).

This document tracks every audit item that lives **outside the codebase** — Google Play Console metadata, visual assets, and marketing actions. The one code item (In-App Review API) has already been implemented; see "Code Changes Already Made" at the bottom of this file.

> **The audit is incomplete.** It was prepared from publicly available info on the current Play Store listing, so it missed features that exist in the app but aren't currently promoted. The biggest gaps are **automatic expense logging from SMS + financial app notifications** (Android), and **Nigerian Naira (NGN) support**. These need to be woven into the new title, short description, and long description — see **§6. Features the audit didn't reference** for the full list and updated copy recommendations.

---

## 1. Install the new dependency

The in-app review code uses `expo-store-review`, which is not yet installed. Add it with the Expo CLI so the SDK 54-compatible version is picked automatically:

```bash
npx expo install expo-store-review
```

Then run a normal install with your preferred manager (`pnpm install` or `yarn install` — never `npm`, per project conventions).

After install, the in-app review prompt will activate automatically on Android/iOS production builds. Until then, the code is a graceful no-op — `require("expo-store-review")` fails inside a try/catch and nothing crashes.

---

## 2. Google Play Console — Store Listing (Week 1)

All of these are edits in **Play Console → Main store listing**. They go live within ~24 hours, no new app version needed.

### 2.1 Title (HIGH)

> ⚠️ **Correction:** the audit assumed a 50-char title limit; Google Play's limit has been **30 characters** since 2021. The §6 title variants also exceed 30 and need rework before use. Machine-verified copies of all three fields live in `store-assets/play-listing.txt`.

| Field | Value |
|---|---|
| Current | `Finance Tracker` |
| New | `Expense Tracker: Budget No Ads` |
| Length | 30 / 30 chars |

### 2.2 Short description (HIGH)

| Field | Value |
|---|---|
| New | `Expenses & budgets, offline. Free forever. No ads, no account, no subscription.` |
| Length | 79 / 80 chars (the audit's original draft measured 84 — over the limit) |

### 2.3 Long description (HIGH)

**Replace the opening paragraph.** Lead with the differentiator, not generic benefit copy.

New opening:

> The only completely free offline expense tracker with no ads, no account, no subscription — ever. Your money data stays on your phone, always.

**Restructure ordering:** move the `YOUR DATA, YOUR CONTROL` section to become the *first* feature section after the opening.

**Remove the raw keyword dump at the bottom** (`finance tracker, expense tracker, budget app...`). Integrate those keywords naturally into existing sentences instead. Google penalises raw tag dumps.

**Keywords to weave naturally into the body:**

- `cashbook app` — into the Multiple Cashbooks section
- `recurring expense tracker` — into the Recurring Transactions section
- `offline expense tracker`, `budget app no ads`, `money manager no account` — into the privacy/offline section
- `GHS budget app`, `multi currency expense app` — into a new sentence about currency support
- `debt tracker between friends` — into the Debt Tracker section

**Strengthen the CTA at the end:**

> Download Finance Tracker today and turn money management into a habit you'll actually enjoy. Free forever. No credit card, no account, no surprises.

**Rewrite the Playful Reminders feature description:**

> Daily reminders that actually make you smile — a rotating mix of funny, motivational, gentle, and serious messages.

> ⚠️ **Copy accuracy note (checked against the code):** the app does **not** have a user-facing tone selector — `scheduleReminders()` picks a random message across all tones. Never phrase this as "pick a tone" unless that feature gets built.

### 2.3.1 Full ready-to-paste long description

```
THE ONLY COMPLETELY FREE EXPENSE TRACKER — NO ADS, NO ACCOUNT, NO SUBSCRIPTION, EVER.

Your money data stays on your phone. Always. Finance Tracker is a beautifully crafted offline expense tracker and budget app for people who are tired of paywalled finance apps — the ones that hide basic features behind a subscription, fill your screen with ads, or demand an account and a cloud sync you never wanted.

Free forever. No credit card. No account. No tracking. No surprises.

YOUR DATA, YOUR CONTROL
• 100% offline — nothing leaves your phone
• No account, no sign-up, no email required
• No ads, no tracking, no analytics SDKs
• Backup and restore from a file you keep
• Export any cashbook as CSV any time you want

MULTIPLE CASHBOOKS — ONE APP, EVERY AREA OF YOUR LIFE
Most expense tracker and budget apps lock you into a single wallet. Finance Tracker gives you separate cashbooks for personal spending, side hustles, a small business, savings goals — anything you want to keep apart. Each cashbook has its own currency, its own categories, and its own running balance. A real cashbook app, not a single-budget tool with a "tag" workaround.

FIVE CURRENCIES, NO COMPROMISES
GHS, NGN, USD, EUR and GBP — each cashbook holds its own, and you can change a cashbook's currency any time. Built for freelancers, migrants, students, and small businesses managing money across more than one currency. The Ghana budget app and the Naira (₦) expense tracker that the big finance apps still don't take seriously.

AUTOMATIC EXPENSE LOGGING (ANDROID)
Let your phone do the typing. Finance Tracker can read your bank SMS and mobile money notifications — MTN MoMo, Telecel Cash, AirtelTigo, Ecobank, GCB, Fidelity, Absa, Stanbic, ECG, DSTV, Netflix, Spotify and more — and turn them into transactions automatically. Routed to the right cashbook. Deduplicated across SMS and app notifications. Held in a Review Queue when the parser isn't sure. Everything runs on your phone, nothing is ever uploaded, and the feature is off by default until you turn it on.

SMART DASHBOARD
Your complete financial picture in one screen. Net balance, income vs expense, weekly growth, top categories, recent activity — all grouped by currency, all animated, all clean. See exactly where your money went without scrolling through a dozen tabs.

BUDGETS THAT ACTUALLY WORK
Set weekly or monthly limits per category. A gentle nudge appears the moment you cross a limit — no popups, no nag screens, just a quick heads-up. See exactly where you overspend with category breakdowns and donut charts.

RECURRING TRANSACTIONS
Salary, rent, subscriptions, recurring bills — set them once and they log themselves on schedule. A genuine recurring expense tracker built into the app, not a buried add-on.

DEBT TRACKER — TO THE PENNY
Track what you owe and what you're owed. Per-person, per-currency, with full partial-payment history. A simple debt tracker between friends, family, and clients — no awkward conversations, no missed paybacks.

BANK-LEVEL SECURITY
Your PIN is encrypted inside your device's secure enclave. Biometric unlock uses fingerprint or Face ID through the system API — your biometric never leaves your phone. The app locks automatically when you switch away.

REMINDERS THAT ACTUALLY MAKE YOU SMILE
Daily reminders in a rotating mix of tones — funny, motivational, gentle, and serious. Sometimes a laugh, sometimes a push, always a nudge to keep your money story up to date.

GUIDED ONBOARDING
A real onboarding tour walks you through every screen in under a minute. Personal finance apps shouldn't need a tutorial — and after Finance Tracker, yours won't.

LIGHT, DARK, OR AUTOMATIC THEME
Easy on the eyes, day and night.

PERFECT FOR
• Freelancers tracking income across currencies
• Small business owners running multiple cashbooks
• Couples and families splitting expenses
• Privacy-focused users who refuse to hand their money data to a cloud finance app
• Anyone tired of "free" apps that aren't actually free

DOWNLOAD FINANCE TRACKER TODAY
Turn money management into a habit you'll actually enjoy. Free forever. No credit card, no account, no surprises.
```

Notes on this draft:
- Opens with the audit's strongest hook (free, no ads, no account, no subscription) — not with a generic "take control of your money" line.
- No raw keyword dump at the end. Keywords integrated naturally throughout: `expense tracker`, `budget app`, `offline expense tracker`, `cashbook app`, `money manager no account`, `multi currency expense app`, `Ghana budget app`, `Naira expense tracker`, `recurring expense tracker`, `debt tracker between friends`, `freelancer expense tracker`.
- Adds the two big audit-missed features: **Automatic Expense Logging** (with named providers — high relevance, low competition keywords) and **NGN currency support** (opens the Nigerian market).
- Audit-required rewrites included: stronger Playful Reminders copy, strengthened closing CTA, restructured opening, kept the audit-praised "Perfect for" section.
- Under Play Store's 4,000-character limit with room to spare.

### 2.4 GHS / NGN / multi-currency callout

The audit only lists USD, GHS, EUR, GBP. **The app also supports Nigerian Naira (NGN).** Update the description opening to:

> Supports GHS, NGN, USD, EUR and GBP across separate cashbooks — built for freelancers, small businesses, and anyone managing money in more than one currency.

This single change opens the Nigerian market — currently the largest mobile app market in West Africa — alongside Ghana.

### 2.5 Automatic logging feature callout (NEW — audit missed this entirely)

The app has **automatic expense logging from SMS and financial app notifications** on Android, fully on-device. This is one of the most powerful differentiators in the entire listing and the audit didn't see it. Add a dedicated section near the top of the long description:

> **AUTOMATIC LOGGING (ANDROID)**
> Let your phone do the typing. Finance Tracker can read bank SMS and mobile money notifications (MTN MoMo, Telecel Cash, AirtelTigo, Ecobank, GCB, Fidelity, Absa, Stanbic, ECG, DSTV, Netflix, Spotify and more) and turn them into transactions automatically — routed to the right cashbook, deduplicated across SMS and app notifications, and held in a Review Queue when the parser isn't sure. All of it runs on your phone. Nothing is uploaded, nothing is read in the cloud, and the feature is **off by default** until you opt in.

This unlocks two further keyword clusters that competitors don't target:
- `automatic expense tracker`, `auto expense logger`, `auto log expenses`
- `MoMo expense tracker`, `mobile money tracker Ghana`, `MTN MoMo budget app`

---

## 3. Visual Assets (Week 2)

These are all created in a design tool (Figma, Canva, etc.) and uploaded to Play Console → Main store listing.

### 3.1 Feature Graphic (HIGH)

**Specs:** 1024 × 500 px, JPG or 24-bit PNG, no alpha.

**Content:** App name + the three differentiators stacked: `Free Forever · No Ads · No Account`.

### 3.2 Screenshot framework — 8 frames with benefit overlays (HIGH)

Each frame needs a bold benefit headline overlayed on top of the UI capture.

| # | Type | Headline |
|---|---|---|
| 1 | Trust Hook | `Free Forever. No Ads. No Account. No Subscription.` |
| 2 | Dashboard | `Your Complete Financial Picture` |
| 3 | Multiple Cashbooks | `Separate Cashbooks for Every Area of Your Life` |
| 4 | Multi-Currency | `Manage USD, GHS, EUR & GBP — All in One App` |
| 5 | Budgets & Reports | `Set Budgets. See Exactly Where You Overspend.` |
| 6 | Debt Tracker | `Track What You Owe and What You're Owed — to the Penny` |
| 7 | Security & Privacy | `Bank-Level Security. 100% Offline. Nothing Leaves Your Phone.` |
| 8 | Automatic Logging | `Your Phone Logs Expenses For You` (show Auto-Logging settings / Review Queue — replaces the tone-selector frame; that UI doesn't exist) |

**Specs (Google Play):** at least 2 screenshots, max 8. Min dimension 320 px, max 3840 px. 16:9 or 9:16 aspect for phone.

### 3.3 App icon (LOW)

Optional A/B test: try a variant that signals privacy/no-ads (e.g. shield + chart symbol). Keep the current icon as the control.

### 3.4 Demo video (LOW)

30–45 seconds, raw phone screen recording of the guided onboarding tour → first transaction → dashboard. Upload to YouTube unlisted, then add the URL in Play Console → Store listing → Promo video. Authenticity > polish.

---

## 4. Ratings & Reviews (Week 3)

### 4.1 In-App Review API — DONE in code

Already wired up — see "Code Changes Already Made" below. After `pnpm install` and the next Play Store build, the prompt will appear:
- After the user's 3rd manual transaction
- After completing the dashboard onboarding tour

### 4.2 Personal network push

Goal: cross Google's display threshold (~10 reviews) within the first week of the listing update.

- Send the Play Store link to friends, colleagues, and the Ghana / West Africa dev community
- Ask for honest reviews — do not coach the content
- Track via Play Console → Reviews

### 4.3 Respond to every review

- Reply to all reviews within 24 hours, especially the first 20
- Personal, warm responses ("I built this because I had the same problem you did")
- Sets the precedent that this is a developer who cares

---

## 5. Niche Keyword Expansion (Week 4)

After Week 1–3 changes are live and indexed, layer in long-tail keywords. These all go in the long description body, integrated naturally — not as a dump:

- `cashbook manager`, `separate wallet tracker`
- `automatic recurring bills app`, `subscription tracker no account`
- `easy to use finance app`, `finance app for beginners`, `personal finance app easy setup`
- `budget app Ghana`, `GHS expense tracker`, `cedis budget manager`
- `budget app Nigeria`, `naira expense tracker`, `NGN budget app`
- `auto expense tracker`, `auto log expenses`, `SMS expense tracker`
- `MTN MoMo expense tracker`, `mobile money budget app`, `mobile money tracker Ghana`

### 5.1 Localised West Africa listing (LOW)

In Play Console → Store listing → Manage translations, add an English (United Kingdom) or English (Nigeria/Ghana if available) localisation. Mention GHS and NGN prominently in the opening. Reference mobile money (MTN MoMo, Telecel Cash) explicitly — the automatic logging feature already supports them.

---

## 6. Features the audit didn't reference

The audit was prepared from publicly available info on the current Play Store listing only. These features exist in the app today but the audit could not see them, so its recommended copy is missing them. Each one strengthens the listing and most are differentiators the closest competitors (Finly, Simple Offline Budget, Pocket Clear) do not have.

| Feature | Where in the app | ASO opportunity |
|---|---|---|
| **Automatic expense logging (SMS + notifications)** | Settings → Features → Automatic Logging. Native Android `SmsReceiver` + `NotificationListenerService` → on-device parser → cashbook routing → Review Queue. Off by default. | Headline-tier differentiator. None of the named competitors have this. Add the dedicated §2.5 block to the long description; mention "automatic logging" in the title once core keywords are locked in. |
| **Per-provider parser templates** | `src/features/autoLogging/services/parser/providers/`. Templates for MTN MoMo, Telecel Cash, AirtelTigo, Ecobank, GCB, Fidelity, Absa, Stanbic, ECG, DSTV/GOtv, Netflix, Spotify. | Name the specific providers in the description. Searches like "MTN MoMo tracker" and "Ecobank expense tracker" are very low competition and high relevance. |
| **Sender → Cashbook routing + mappings UI** | `SenderMappingsScreen`. Users can merge senders into one cashbook or redirect them. | Reinforces the "Multiple Cashbooks" headline — captures the use case "one cashbook per bank / per service". |
| **Review Queue for low-confidence captures** | `ReviewQueueScreen`. Low-confidence parses land here instead of polluting the cashbook. | Trust signal — explicitly mention "you review uncertain captures before they're saved" in the privacy section. |
| **Nigerian Naira (NGN) support** | `_helpers.ts`, `CreateCashbookModal`, `DebtEntryModal`, parser normaliser. Currency picker shows ₦. | Adds the largest mobile market in West Africa. Update every "USD, GHS, EUR, GBP" reference to "USD, GHS, NGN, EUR, GBP". |
| **Cashbook currency editing after creation** | Cashbook detail sheet → Update currency. | Mention "change a cashbook's currency at any time" in the multi-currency section — answers a common Play review complaint about other apps. |
| **Light / Dark / System theme** | Settings → Appearance. | One line in the description body: "Light, dark, and automatic theme — easy on the eyes day and night." |
| **CSV export for backup** | `BusinessDetailView.exportToCSV`. | Mention "export any cashbook as CSV" — the audit's "YOUR DATA, YOUR CONTROL" section understates this. |
| **Encrypted PIN + biometric on-device** | `expo-secure-store`-backed PIN, `expo-local-authentication` for biometrics. App auto-locks on background. | The audit calls this "bank-level security" but doesn't say *how*. Specify "PIN is encrypted in the device secure enclave; biometric uses the system fingerprint/Face ID API." |
| **Budget warnings via Android Toast** | `checkBudgetWarning` in `BusinessDetailView`. Shows a Toast when a category goes over budget on Android. | Strengthens the Budgets screenshot caption: "Get gentle warnings the moment you cross a category limit — no popups, no alerts, just a quick toast." |
| **In-app updates** | `expo-in-app-updates` wired in `App.tsx`. | Trust signal worth one line: "Updates install seamlessly — never lose your data when upgrading." |

### Title revision to include automatic logging (post Week 1)

Once the Week 1 title (`Expense Tracker: Budget App, No Ads`) has bedded in for ~30 days, A/B test a follow-up that surfaces auto-logging:

| Variant | Title | Notes |
|---|---|---|
| A (current proposal) | `Expense Tracker: Budget App, No Ads` | Anchored on "no ads" — strongest current hook |
| B (after Week 1) | `Auto Expense Tracker: Budget, No Ads` | Adds the unique auto-logging hook in 36 chars |
| C (after Week 1) | `Cashbook: Auto Expense Tracker` | Owns the underused "cashbook" keyword + auto |

Only test B/C after Week 1's A is indexed and you have baseline conversion numbers.

### Short description revision (post Week 1)

After auto-logging is established in the description, swap the short description to surface it:

> Auto-log expenses from SMS & notifications. Offline, free forever, no ads.

(79 chars. Hits "auto-log", "expenses", "SMS", "notifications", "offline", "free", "no ads".)

---

## 7. Suggested 30-Day Roadmap

| Week | Focus | Key Actions |
|---|---|---|
| 1 | Metadata overhaul | New title, short description, restructured long description. Add Auto-Logging + NGN sections (§2.4–2.5). Remove keyword dump. All live within 24 hrs. |
| 2 | Visual rebuild | Feature Graphic. Benefit overlays on all 8 screenshots. Add Cashbooks + Auto-Logging frames (auto-logging replaced the tone-selector frame — that UI doesn't exist). |
| 3 | Review push | Ship code with in-app review prompt. Get 10+ reviews from personal network. Respond to all. |
| 4 | Niche keywords + auto title test | Layer cashbook, recurring, GHS, NGN, MoMo keywords. Add West Africa localisation. Begin A/B test of title variant B (auto-logging hook) per §6. |

---

## Code Changes Already Made

The in-app review prompt is the only audit item that required code. Implemented across these files:

| File | Change |
|---|---|
| `src/utils/storeReview.ts` | New utility — wraps `expo-store-review` with eligibility gating (3-transaction threshold, 90-day throttle, one-shot prompt) and silent fallback when the native module isn't available. |
| `src/components/TourOverlay.tsx` | Added optional `onComplete` callback fired only when the user reaches the final step (not when they skip). |
| `src/screens/DashboardScreen.tsx` | Dashboard tour's `onComplete` triggers `maybeRequestReview({ kind: "tour_completed" })`. |
| `src/screens/BusinessDetailView.tsx` | After a new (non-edited, non-recurring, non-autologged) transaction is saved, calls `maybeRequestReview({ kind: "transaction", totalTransactions: manualCount })`. |

### Behaviour summary

- The prompt is requested at most once per ~90 days, and only on production iOS/Android builds.
- Eligibility: either (a) user has saved at least 3 manual transactions, or (b) user completed the dashboard onboarding tour by tapping "Got it" on the final step.
- If `expo-store-review` is not installed (Expo Go, web, dev), the call is a no-op — nothing crashes.
- Google Play and Apple both throttle the underlying native API; our state is a secondary safety net.

### Manual QA checklist (after `pnpm install` + production build)

- [ ] Fresh install → add 3 transactions → prompt appears once after the 3rd
- [ ] Fresh install → complete dashboard tour → prompt appears once after "Got it"
- [ ] Adding a 4th, 5th, 6th transaction does **not** re-prompt (state persists in AsyncStorage)
- [ ] Editing an existing transaction does **not** trigger the prompt
- [ ] Recurring-generated and auto-logged (SMS/notification) transactions are **not** counted toward the 3-transaction threshold
- [ ] Skipping the tour (tapping "Skip" or backdrop) does **not** trigger the prompt
