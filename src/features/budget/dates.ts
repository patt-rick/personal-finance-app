const pad = (n: number) => String(n).padStart(2, "0");

export const toLocalISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseLocalISODate = (s: string): Date => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
};

/** Transaction dates are full ISO instants, except recurring entries which store a bare local "YYYY-MM-DD". */
export const parseTxDate = (s: string): Date => (s.length === 10 ? parseLocalISODate(s) : new Date(s));

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const calendarDaysBetween = (a: Date, b: Date): number =>
    Math.round(
        (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
            86_400_000,
    );
