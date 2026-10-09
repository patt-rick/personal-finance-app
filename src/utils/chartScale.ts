const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];

/** Smallest "round" number (1, 1.5, 2 … 10 × a power of ten) at or above `value`, for chart axis tops. */
export function niceCeil(value: number): number {
    if (!(value > 0)) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const step = NICE_STEPS.find((s) => s * magnitude >= value - 1e-9) ?? 10;
    return Math.max(1, step * magnitude);
}

const trim = (n: number) => (Math.round(n * 10) / 10).toString();

/** `₵12.4k` style amounts for tight chart labels. */
export function compactMoney(value: number, symbol: string): string {
    const abs = Math.abs(value);
    const body =
        abs >= 999_950 ? `${trim(abs / 1_000_000)}m` : abs >= 999.5 ? `${trim(abs / 1000)}k` : `${Math.round(abs)}`;
    return `${value < 0 ? "-" : ""}${symbol}${body}`;
}
