// Must match app.json ios.entitlements and targets/autolog-intent/AutoLogInbox.swift.
export const AUTOLOG_APP_GROUP = "group.com.patrickackom.financetracker";
export const INBOX_ROOT_DIR = "autolog";
export const INBOX_DIR = "inbox";
export const ENABLED_FLAG_FILE = "enabled";
export const LAST_CAPTURE_FILE = "last-capture";

export const MAX_BODY_CHARS = 4000;
export const MAX_SENDER_CHARS = 64;

export const INBOX_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
export const INBOX_FILE_RE = /^[A-Za-z0-9-]{8,64}\.json$/;
