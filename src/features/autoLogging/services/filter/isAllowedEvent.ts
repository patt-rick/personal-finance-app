import { AutoLogSettings, RawEvent } from "../../types";
import { normalizeSender } from "../routing/normalizeSender";
import { applyAliases } from "../routing/senderAliases";

function canonicalKey(source: "sms" | "notification", value: string): string {
    return applyAliases(normalizeSender(source, value));
}

export function isAllowedEvent(event: RawEvent, settings: AutoLogSettings): boolean {
    if (event.source === "sms") {
        if (!settings.captureSms) return false;
        if (settings.allowedSenders.length === 0) return true;
        const eventKey = canonicalKey("sms", event.sender ?? "");
        if (!eventKey) return false;
        return settings.allowedSenders.some((s) => canonicalKey("sms", s) === eventKey);
    }

    if (event.source === "notification") {
        if (!settings.captureNotifications) return false;
        if (settings.allowedPackages.length === 0) return true;
        const eventKey = canonicalKey("notification", event.packageName ?? "");
        if (!eventKey) return false;
        return settings.allowedPackages.some((p) => canonicalKey("notification", p) === eventKey);
    }

    return false;
}
