# Auto-Log Android QA Matrix

Manual QA checklist for the automatic expense logging feature. Run against a fresh install on each device.

## Devices

Test on at least one device from each row:

| Android | Representative devices | Notes |
| ------- | ---------------------- | ----- |
| 10 (API 29) | Samsung A10s, Pixel 3a | Oldest supported; no runtime `POST_NOTIFICATIONS`. |
| 13 (API 33) | Pixel 6a, Samsung A54 | Runtime `POST_NOTIFICATIONS` first required here. |
| 14+ (API 34) | Pixel 8, latest Samsung | Background broadcast restrictions tightest; verify receiver still fires. |

## Permission flow

1. Fresh install → Settings → Features → Automatic Logging → **On**.
2. Onboarding appears. Verify:
   - Step 1 requests `READ_SMS` + `RECEIVE_SMS`; deny once, retry, accept.
   - Step 2 opens `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`; flip the Finance Tracker toggle and return.
   - Step 3 (Android 13+) requests `POST_NOTIFICATIONS`; accept.
   - **Finish setup** becomes enabled only after every step is granted or skipped.
3. After finish, the top toggle shows **On** and capture source rows reflect whatever was granted.

## Capture — SMS

Send yourself these messages from another phone (or use `adb shell am broadcast -a android.provider.Telephony.SMS_RECEIVED ...` on emulator):

1. **MTN MoMo**: `You have sent GHS 50.00 to KOFI ASANTE. Current balance GHS 120.45. Fee GHS 0.75.`
2. **Vodafone Cash**: `Your account has been credited with GHS 200.00 from PAULINA. New balance GHS 310.`
3. **Bank alert**: `Debit alert: GHS 420.00 spent at SHELL FILLING STATION on 22-Apr. Bal GHS 1,230.`
4. **Spam** (should be ignored): `CONGRATULATIONS! You won GHS 1,000. Dial *123# to claim.`

Verify:
- Allowed senders list empty → all three financial messages enqueued; spam still dropped by parser.
- Allowed senders = ["MTN"] → only the MTN message is saved; others ignored.
- When app is backgrounded and the SMS arrives, open the app → captured entries appear after `drainNativeQueue` runs.

## Capture — Notifications

Post a notification from a test bank/MoMo app (or use the Notification Tester sample app):

1. Title: "MTN MoMo", Text: "Debit: GHS 20.00 at BOLT".
2. Title: "GCB", Text: "Credit of GHS 1,000.00 from PAYROLL".

Verify:
- With Notification Access OFF, nothing is captured → prompt the user to grant.
- With Notification Access ON and `allowedPackages` empty → both captured.
- With `allowedPackages = ["com.mtn.momo"]` → only the MoMo notification is captured.

## Review Queue

1. Send an ambiguous SMS: `Thanks for your payment`.
2. Open Review Queue — it should appear with low confidence.
3. Confirm → transaction appears in the routed cashbook.
4. Reject → removed from the queue; no transaction created.

## Dedupe

1. Trigger the same MoMo amount from both SMS and a matching notification within 2 minutes.
2. Only **one** auto-logged transaction should exist. Open it — `rawText` should contain both sources merged.

## Disable

1. Turn the top toggle OFF.
2. Send a new SMS → nothing is enqueued, nothing shows up after foreground.
3. Turn it back ON → onboarding appears again if permissions were revoked; otherwise just re-enables.

## Recovery

1. While enabled, revoke `READ_SMS` from system settings.
2. Return to the app. Foreground should flip `captureSms` off automatically (reconciliation effect) and the SMS toggle should show OFF.
3. Re-grant permission and re-enable SMS capture.

## Regression

Manual-entry, recurring transactions, budgets, debts, and reports must be unaffected. Spot-check each after a capture session.
