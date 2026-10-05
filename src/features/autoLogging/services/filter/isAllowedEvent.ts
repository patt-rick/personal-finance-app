import { AutoLogSettings, RawEvent } from "../../types";
import { normalizeSender } from "../routing/normalizeSender";
import { applyAliases } from "../routing/senderAliases";

function canonicalKey(source: "sms" | "notification", value: string): string {
    return applyAliases(normalizeSender(source, value));
}

const BLOCKED_NOTIFICATION_PACKAGES = new Set([
    "com.whatsapp",
    "com.whatsapp.w4b",
    "com.gbwhatsapp",
    "org.telegram.messenger",
    "com.facebook.orca",
    "com.facebook.katana",
    "org.thoughtcrime.securesms",
    "com.instagram.android",
    "com.snapchat.android",
    "com.discord",
    "com.slack",
]);

export function isAllowedEvent(event: RawEvent, settings: AutoLogSettings): boolean {
    if (event.source === "sms") {
        if (!settings.captureSms) return false;
        // The Shortcuts automation's keyword (or the user's paste) already did the filtering.
        if (event.via && !event.sender?.trim()) return true;
        if (settings.allowedSenders.length === 0) return true;
        const eventKey = canonicalKey("sms", event.sender ?? "");
        if (!eventKey) return false;
        return settings.allowedSenders.some((s) => canonicalKey("sms", s) === eventKey);
    }

    if (event.source === "notification") {
        if (!settings.captureNotifications) return false;
        if (BLOCKED_NOTIFICATION_PACKAGES.has((event.packageName ?? "").trim().toLowerCase())) return false;
        if (settings.allowedPackages.length === 0) return true;
        const eventKey = canonicalKey("notification", event.packageName ?? "");
        if (!eventKey) return false;
        return settings.allowedPackages.some((p) => canonicalKey("notification", p) === eventKey);
    }

    return false;
}
