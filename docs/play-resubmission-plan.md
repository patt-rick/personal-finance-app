# Play Resubmission Plan — SMS Declaration Rejection (Aug 2026)

Google rejected v1.3.0 under "Permissions and APIs that Access Sensitive Information": the declared SMS use case (financial transactions / OTP verification) doesn't match the app, and neither the listing nor the in-app experience presented SMS capture as core functionality. Fix = redeclare as **SMS-based money management** + make the feature prominent everywhere a reviewer looks.

## 1. Play Console changes

1. **Policy → App content → SMS and Call Log permissions declaration:**
   - Change the permitted use to **"SMS-based money management"** (budget tracking apps). Do not re-select "SMS-based financial transactions".
   - Paste answers from `play-store-sms-permission-declaration.md`.
   - Attach the demo video link (see §3).
2. **Store listing:** upload the revised copy from `store-assets/play-listing.txt` (short description now leads with "Auto-log expenses from bank & MoMo SMS").
3. **Screenshots:** move the Automatic Logging screenshot (currently frame 8) to **frame 2 or 3** so it's visible without scrolling. Consider a caption overlay: "Logs MoMo & bank SMS automatically".
4. Resubmit the same artifact only if the in-app changes (§4) are included in the build — otherwise bump to a new build first. The reviewer installs the app; the tour step and dashboard promo need to be in the binary they see.

## 2. Why this use case fits

Google's permitted-uses table for SMS permissions includes:

> **SMS-based money management** — "For example, apps that track and manage budget." Eligible: READ_SMS, RECEIVE_SMS, RECEIVE_MMS, RECEIVE_WAP_PUSH. Subject to Google Play review and approval.

Expense Tracker parses financial SMS on-device to maintain the user's budget/expense records — the literal description of this use case.

## 3. Demo video (attach to the declaration)

Record an unlisted YouTube video, ~60–90 seconds, on a real device or emulator with a test SMS. Script:

1. Fresh install → first-run tour reaches the "Automatic Expense Logging" step (shows the feature is promoted in-app).
2. Dashboard promo card → tap → Auto-Log onboarding screen; show the permission explanation copy on screen.
3. Grant SMS permission (system dialog visible) and Notification Access.
4. Send a test MoMo/bank SMS to the device (e.g. via `adb emu sms send MobileMoney "Payment made for GHS 25.00 to KOFI STORES..."`).
5. Show the transaction appearing in the Review Queue / cashbook with parsed amount + merchant.
6. Show Settings → Automatic Logging: the off switch and sender allowlist (demonstrates control + revocability).
7. Optional: airplane-mode toggle or a line of narration stating parsing is fully on-device.

## 4. In-app prominence changes (code, this repo)

Goal: a reviewer who installs the app and pokes around for two minutes must encounter the feature. IMPLEMENTED (2026-08-07):

1. **First-run tour step (DashboardScreen.tsx):** 4th step "Automatic Expense Logging" added to the dashboard `TourOverlay`, Android-only, `Zap` icon.
2. **Dashboard promo card (`src/components/dashboard/AutoLogPromoCard.tsx`):** shown on the dashboard between the balance card and quick stats while capture is off; Android-only; dismissible (persisted under `@autolog_promo_dismissed`); "Set up" navigates to Settings with an `openAutoLog` param that lands directly on the Automatic Logging screen.
3. **Settings row copy:** unchanged, already present under Settings → Automatic Logging.

Note: `AutoLogOnboardingScreen.tsx` turned out to be unwired (dead code) — the real enable flow is the toggles on `AutoLogSettingsScreen`, so the promo routes there instead.

Both changes are additive UI; the permission flow itself (opt-in, runtime request with explanation) already complies and stays unchanged.

## 5. Fallback (if Option A is rejected again)

Drop `READ_SMS`/`RECEIVE_SMS` + `SmsReceiver.kt`, keep the `NotificationListener` path only (notification access is outside the SMS/Call Log restricted group; SMS-app notifications still carry message text and the dedupe layer already merges the two sources). Small change, fastest approval.
