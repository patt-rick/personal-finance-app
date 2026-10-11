import {
    daysElapsed,
    daysInPeriod,
    daysLeft,
    formatPeriodLabel,
    inPeriod,
    nextPeriod,
    periodName,
    periodRange,
    previousPeriod,
    recentPeriods,
} from "../../src/features/budget/periods";

describe("periodRange", () => {
    it("starts weeks on Monday, including when today is Sunday", () => {
        const sunday = new Date(2026, 9, 11, 15);
        const r = periodRange("weekly", sunday);
        expect(r.key).toBe("2026-10-05");
        expect(daysInPeriod(r)).toBe(7);
        expect(periodRange("weekly", new Date(2026, 9, 12)).key).toBe("2026-10-12");
    });

    it("covers whole months and years", () => {
        expect(daysInPeriod(periodRange("monthly", new Date(2028, 1, 10)))).toBe(29);
        expect(daysInPeriod(periodRange("yearly", new Date(2026, 5, 1)))).toBe(365);
        expect(periodRange("monthly", new Date(2026, 11, 31, 23, 59)).key).toBe("2026-12-01");
    });

    it("walks backwards and forwards", () => {
        const oct = periodRange("monthly", new Date(2026, 9, 11));
        expect(previousPeriod("monthly", oct).key).toBe("2026-09-01");
        expect(nextPeriod("monthly", oct).key).toBe("2026-11-01");
        expect(recentPeriods("monthly", new Date(2026, 9, 11), 6).map((r) => r.key)).toEqual([
            "2026-05-01",
            "2026-06-01",
            "2026-07-01",
            "2026-08-01",
            "2026-09-01",
            "2026-10-01",
        ]);
    });

    it("treats the end as exclusive", () => {
        const oct = periodRange("monthly", new Date(2026, 9, 11));
        expect(inPeriod(new Date(2026, 9, 31, 23, 59), oct)).toBe(true);
        expect(inPeriod(new Date(2026, 10, 1), oct)).toBe(false);
    });
});

describe("day counts", () => {
    const oct = periodRange("monthly", new Date(2026, 9, 1));

    it("counts today as elapsed and as left", () => {
        expect(daysElapsed(oct, new Date(2026, 9, 1, 8))).toBe(1);
        expect(daysLeft(oct, new Date(2026, 9, 1, 8))).toBe(31);
        expect(daysElapsed(oct, new Date(2026, 9, 31, 22))).toBe(31);
        expect(daysLeft(oct, new Date(2026, 9, 31, 22))).toBe(1);
    });

    it("clamps for closed periods", () => {
        expect(daysElapsed(oct, new Date(2027, 0, 1))).toBe(31);
        expect(daysLeft(oct, new Date(2027, 0, 1))).toBe(1);
    });
});

describe("labels", () => {
    it("formats each period", () => {
        expect(formatPeriodLabel("monthly", periodRange("monthly", new Date(2026, 9, 11)))).toBe("October 2026");
        expect(formatPeriodLabel("yearly", periodRange("yearly", new Date(2026, 9, 11)))).toBe("2026");
        expect(formatPeriodLabel("weekly", periodRange("weekly", new Date(2026, 9, 7)))).toBe("5–11 Oct");
        expect(formatPeriodLabel("weekly", periodRange("weekly", new Date(2026, 8, 30)))).toBe("28 Sep – 4 Oct");
    });

    it("names a period the way a sentence would", () => {
        expect(periodName("monthly", periodRange("monthly", new Date(2026, 7, 3)))).toBe("August");
        expect(periodName("weekly", periodRange("weekly", new Date(2026, 9, 7)))).toBe("5–11 Oct");
    });
});
