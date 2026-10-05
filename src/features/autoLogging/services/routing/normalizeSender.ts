import { RawEvent } from "../../types";
import { inferSenderFromBody } from "./inferSender";

const PHONE_NUMBER_RE = /^\+?\d{7,}$/;

// Sender label for iOS Shortcuts/pasted SMS whose sender was not provided.
export const UNKNOWN_SMS_SENDER = "SMS";

export function rawSenderIdOf(event: RawEvent): string {
    if (event.source !== "sms") return event.packageName ?? "";
    const explicit = event.sender?.trim();
    if (explicit || !event.via) return explicit ?? "";
    return inferSenderFromBody(event.body) ?? UNKNOWN_SMS_SENDER;
}

export function normalizeSender(source: "sms" | "notification", rawId: string): string {
    const trimmed = rawId.trim();
    if (!trimmed) return "";

    if (source === "notification") {
        return trimmed.toLowerCase();
    }

    const phoneCandidate = trimmed.replace(/[\s\-().]/g, "");
    if (PHONE_NUMBER_RE.test(phoneCandidate)) {
        return "p" + phoneCandidate.replace(/\D/g, "");
    }

    return trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
}
