import { RawEvent } from "../../../types";
import { fnv1a } from "../../dedupe/textHash";
import { INBOX_ID_RE, MAX_BODY_CHARS, MAX_SENDER_CHARS } from "./constants";

const MINUTE_MS = 60 * 1000;

// Minute-bucketed so one SMS that trips two automations (e.g. "GHS" and "GH¢") hashes once.
export function inboxRawHash(sender: string | undefined, body: string, timestamp: number): string {
    const bucket = Math.floor(timestamp / MINUTE_MS);
    return `ios-${fnv1a(`sms|${sender ?? ""}|${body}|${bucket}`)}`;
}

export function parseInboxEntry(text: string): RawEvent | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== "object") return null;
    const raw = parsed as Record<string, unknown>;

    if (typeof raw.id !== "string" || !INBOX_ID_RE.test(raw.id)) return null;
    if (typeof raw.body !== "string") return null;
    const body = raw.body.trim().slice(0, MAX_BODY_CHARS);
    if (!body) return null;
    if (typeof raw.timestamp !== "number" || !Number.isFinite(raw.timestamp)) return null;

    const senderText = typeof raw.sender === "string" ? raw.sender.trim().slice(0, MAX_SENDER_CHARS) : "";
    const sender = senderText || undefined;

    return {
        id: raw.id,
        source: "sms",
        via: "shortcut",
        sender,
        body,
        timestamp: raw.timestamp,
        rawHash: inboxRawHash(sender, body, raw.timestamp),
    };
}
