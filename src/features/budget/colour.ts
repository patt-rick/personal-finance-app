export interface BudgetPalette {
    income: string;
    gold: string;
    expense: string;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}` as `#${string}`;

/** Green until 20 points before the warn threshold, gold at it, red at the limit and beyond. */
export function budgetColour(sharePct: number, warnAt: number, palette: BudgetPalette): `#${string}` {
    const stops: [number, string][] = [
        [0, palette.income],
        [warnAt - 20, palette.income],
        [warnAt, palette.gold],
        [100, palette.expense],
    ];
    const p = Math.min(Math.max(sharePct, 0), 100);
    for (let i = 1; i < stops.length; i++) {
        const [x1, c1] = stops[i];
        if (p <= x1) {
            const [x0, c0] = stops[i - 1];
            const t = x1 === x0 ? 1 : (p - x0) / (x1 - x0);
            const a = rgb(c0);
            const b = rgb(c1);
            return toHex(a.map((v, k) => v + (b[k] - v) * t));
        }
    }
    return toHex(rgb(palette.expense));
}
