export function normalizeMerchant(merchant: string | null | undefined): string {
    return (merchant ?? "").toLowerCase().replace(/\s+/g, "");
}
