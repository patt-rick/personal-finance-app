import {
    addDays,
    calendarDaysBetween,
    parseLocalISODate,
    parseTxDate,
    toLocalISODate,
} from "../../src/features/budget/dates";

describe("dates", () => {
    it("round-trips local ISO dates without a UTC shift", () => {
        const d = parseLocalISODate("2026-03-01");
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(2);
        expect(d.getDate()).toBe(1);
        expect(toLocalISODate(d)).toBe("2026-03-01");
    });

    it("reads bare recurring dates as local days and full instants as instants", () => {
        expect(parseTxDate("2026-10-01").getDate()).toBe(1);
        expect(parseTxDate("2026-10-01").getHours()).toBe(0);
        const instant = "2026-10-01T10:00:00.000Z";
        expect(parseTxDate(instant).getTime()).toBe(Date.parse(instant));
    });

    it("counts calendar days, not milliseconds", () => {
        expect(calendarDaysBetween(new Date(2026, 2, 28, 23, 0), new Date(2026, 2, 30, 1, 0))).toBe(2);
        expect(calendarDaysBetween(new Date(2026, 0, 1), new Date(2027, 0, 1))).toBe(365);
    });

    it("adds days across month ends", () => {
        expect(toLocalISODate(addDays(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
    });
});
