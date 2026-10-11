import { reportCurrencies } from "../../src/utils/reportCurrency";
import { Business, Transaction } from "../../src/types";

const biz = (id: string, currency?: string): Business => ({ id, name: id, createdAt: "2026-01-01", currency });
let seq = 0;
const tx = (businessId: string): Transaction => ({
    id: `t${seq++}`,
    description: "x",
    amount: 1,
    date: "2026-10-05T10:00:00.000Z",
    type: "expense",
    businessId,
});

describe("reportCurrencies", () => {
    it("lists the busiest currency first, with its cashbooks", () => {
        const list = reportCurrencies(
            [biz("dollar", "USD"), biz("a", "GHS"), biz("b", "GHS")],
            [tx("a"), tx("b"), tx("dollar")],
        );
        expect(list).toEqual([
            { code: "GHS", cashbooks: ["a", "b"] },
            { code: "USD", cashbooks: ["dollar"] },
        ]);
    });

    it("puts a currency with transactions ahead of one with more but empty cashbooks", () => {
        const list = reportCurrencies([biz("u1", "USD"), biz("u2", "USD"), biz("g", "GHS")], [tx("g")]);
        expect(list.map((c) => c.code)).toEqual(["GHS", "USD"]);
    });

    it("breaks an activity tie by cashbook count, and treats a missing currency as USD", () => {
        const list = reportCurrencies([biz("x"), biz("y", "USD"), biz("g", "GHS")], []);
        expect(list).toEqual([
            { code: "USD", cashbooks: ["x", "y"] },
            { code: "GHS", cashbooks: ["g"] },
        ]);
    });

    it("ignores transactions whose cashbook no longer exists", () => {
        expect(reportCurrencies([biz("g", "GHS")], [tx("gone"), tx("gone")])).toEqual([
            { code: "GHS", cashbooks: ["g"] },
        ]);
    });
});
