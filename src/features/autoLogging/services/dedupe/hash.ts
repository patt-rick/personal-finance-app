export function normalizeMerchant(merchant: string | null | undefined): string {
    return (merchant ?? "").toLowerCase().replace(/\s+/g, "");
}

export function dedupeKey(amount: number, merchant: string | null, timestampMs: number, bucketMs = 2 * 60 * 1000): string {
    const bucket = Math.floor(timestampMs / bucketMs);
    return `${amount.toFixed(2)}|${normalizeMerchant(merchant)}|${bucket}`;
}
