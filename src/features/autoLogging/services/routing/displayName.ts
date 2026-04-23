function titleCaseWord(word: string): string {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function deriveDisplayName(source: "sms" | "notification", rawId: string): string {
    const trimmed = rawId.trim();
    if (!trimmed) return "Unknown";

    if (source === "notification") {
        const parts = trimmed.split(".");
        const meaningful = parts.length >= 3 ? parts.slice(-2) : parts;
        return meaningful.map(titleCaseWord).join(" ");
    }

    if (/^\+?\d+$/.test(trimmed)) return trimmed;

    return trimmed.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}
