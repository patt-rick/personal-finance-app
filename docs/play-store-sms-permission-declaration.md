# Play Console — SMS Permission Declaration (v2, post-rejection)

Answers for the Permissions Declaration form for `READ_SMS` / `RECEIVE_SMS`. Rewritten after the August 2026 rejection: the original declaration selected **"SMS-based financial transactions (OTP account verification / fraud detection)"**, which is for apps that conduct or verify transactions over SMS. Expense Tracker does neither. The correct permitted use is **"SMS-based money management"** — Google's policy describes it as "apps that track and manage budget", with `READ_SMS` and `RECEIVE_SMS` both eligible.

## Use case selection (the dropdown)

**Selected permitted use:** SMS-based money management

Do NOT select "SMS-based financial transactions" — that is the OTP/UPI/fraud-detection use case and was the cause of the rejection ("your in-app experience does not match the core functionality for your declared use case").

## Which permissions is the app using?

- `READ_SMS`
- `RECEIVE_SMS`
- Notification Listener access (`BIND_NOTIFICATION_LISTENER_SERVICE`) — granted by the user through Android's Notification Access settings; not part of the SMS permission group but disclosed here for completeness.

## What core feature uses these permissions?

Automatic Expense Logging — the app's flagship capture feature. Expense Tracker reads incoming financial SMS (bank alerts, mobile-money transaction messages from providers such as MTN MoMo, Telecel Cash, AirtelTigo, Ecobank, GCB, Fidelity, Absa, Stanbic) and turns them into expense and income entries in the user's cashbooks, replacing manual entry. This is money management / budget tracking in the exact sense of the permitted use case: the SMS content is used solely to keep the user's budget and expense records up to date.

## Where the feature appears (prominence)

- **Store listing:** featured in the short description ("Auto-log expenses from bank & MoMo SMS") and as the first feature section of the full description; shown in an early screenshot.
- **In-app:** introduced in the first-run dashboard tour, promoted on the dashboard until enabled, and configurable under Settings → Automatic Logging. The user explicitly enables it through an onboarding screen that explains each permission before the runtime request.
- **Demo video:** [link to unlisted YouTube video — see play-resubmission-plan.md for the recording script]

## How the data is used

- SMS text is parsed **on-device** to extract amount, merchant, and transaction type.
- Parsed entries are saved to the user's chosen cashbook or held in a Review Queue for user confirmation.
- The captured text is stored locally alongside each transaction so the user can verify the parse.
- Only messages from user-allowlisted financial senders are processed; other SMS are ignored.
- **No server-side processing occurs.** Expense Tracker has no backend and makes no network calls with SMS content.

## Is the data shared off-device?

No. SMS and notification content never leaves the device. The app has no backend, no analytics SDKs, and no third-party SDKs that receive SMS data. Data leaves the device only if the user explicitly exports a local backup file.

## Does the app use a Default SMS Handler?

No. Expense Tracker does not set itself as the default SMS app. It listens to the `SMS_RECEIVED` broadcast alongside the user's existing SMS app.

## Alternatives considered

Manual entry defeats the purpose of automatic capture. Bank APIs / open-banking aggregators do not exist for the mobile-money providers our users rely on (MTN MoMo, Telecel Cash, AirtelTigo); SMS is the only machine-readable record of these transactions. The Notification Listener alone misses SMS that the user's messaging app truncates or groups. On-device SMS parsing with a per-sender allowlist is the most private workable option for this user base.

## Security

- All captured content is stored locally, inside the app's private storage directory.
- The native event queue is stored in `Context.filesDir` (app-private, non-world-readable).
- Toggles and allowlists are stored in app-private `SharedPreferences` and `AsyncStorage`.
- No third-party SDKs receive SMS or notification data.

## Revocability

Users can:
- Turn off Automatic Logging at any time from Settings.
- Remove individual senders / apps from the allowlist.
- Revoke `READ_SMS` and Notification Access from Android system settings; the app detects revocation on next foreground and shows a recovery banner.
