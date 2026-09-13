const PHONE_NUMBER_RE = /^\+?\d{7,}$/;

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
