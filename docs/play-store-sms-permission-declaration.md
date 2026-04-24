# Play Console — SMS Permission Declaration

Answers to the Permissions Declaration form for `READ_SMS` / `RECEIVE_SMS` and the Notification Listener access used by Finance Tracker's Automatic Logging feature.

## Core functionality

**Which permission(s) is your app using?**
- `READ_SMS`
- `RECEIVE_SMS`
- `BIND_NOTIFICATION_LISTENER_SERVICE` (declared in manifest; granted by the user through Android's Notification Access settings)

**What feature in your app uses these permissions?**
Automatic Logging, an opt-in feature that suggests expense entries by parsing financial SMS messages (e.g. bank alerts, mobile-money transactions) and posted notifications from banking / wallet apps on the user's device.

**Core use case**
Financial management — specifically, automatic transaction capture and expense tracking. The app is an offline personal finance tracker. SMS and notification capture replaces manual entry for transactions that already arrive on the user's device via SMS or notifications from banks and mobile-money providers.

## User-facing description

"Finance Tracker can read your incoming bank and mobile-money SMS messages and notifications to suggest new expense entries automatically. Nothing leaves your device — parsing happens locally and you choose which senders and apps to read from."

## Is the use prominently featured in your app?

Yes. Automatic Logging appears as a first-class feature in Settings → Features, is off by default, and is explicitly enabled by the user through an onboarding screen that explains the permission and requests runtime consent.

## How the data is used

- Text is parsed on-device to extract amount, merchant, and transaction type.
- Parsed suggestions are either saved to the user's chosen cashbook or queued for user review.
- The original captured text is stored locally alongside each transaction so the user can verify the parse.
- **No server-side processing occurs.** Finance Tracker does not operate any backend that receives SMS or notification content.

## Is the data shared off-device?

No. Finance Tracker does not transmit SMS or notification content to any server. The app has no backend. User data stays on the device unless the user explicitly exports a backup to local storage.

## Does the app use a Default SMS Handler?

No. Finance Tracker does **not** set itself as the default SMS app. It uses the `SMS_RECEIVED` broadcast alongside the user's existing SMS app.

## Alternatives considered

We considered asking users to copy-paste messages or forward them to a parser, but that defeats the purpose of automation. We also considered using OCR or bank API integrations, which either require camera/storage permissions with a similar privacy profile or are unavailable for the mobile-money providers our target users rely on (MTN MoMo, Vodafone Cash, etc.). Reading SMS and notifications on-device, with an explicit per-sender allowlist, is the most private option for this user base.

## Security

- All captured content is stored locally, inside the app's private storage directory.
- The native event queue is stored in `Context.filesDir` (app-private, non-world-readable).
- Toggles and allowlists are stored in app-private `SharedPreferences` and `AsyncStorage`.
- No third-party SDKs receive SMS or notification data.

## Revocability

Users can:
- Turn off Automatic Logging at any time from the Settings screen.
- Remove individual senders / apps from the allowlist.
- Revoke `READ_SMS` and Notification Access from Android's system settings. The app detects revocation on next foreground and surfaces a recovery banner.
