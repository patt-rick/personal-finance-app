import { computeCashbookBalance } from "../../src/utils/cashbookBalance";
import { getCategoryBreakdown } from "../../src/utils/reportCalculations";
import { FEES_CATEGORY_LABEL } from "../../src/utils/transactionAmount";
import { Transaction } from "../../src/types";

const tx = (o: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(), description: "x", amount: 0, date: "2026-09-10",
  type: "expense", businessId: "b1", ...o,
});

it("balance counts fee as outflow", () => {
  const list = [tx({ type: "income", amount: 100 }), tx({ type: "expense", amount: 40, fee: 2 })];
  expect(computeCashbookBalance(list, "b1")).toBe(58); // 100 - (40+2)
});

it("old rows without fee are unchanged", () => {
  expect(computeCashbookBalance([tx({ type: "expense", amount: 42 })], "b1")).toBe(-42);
});

it("category breakdown adds a Fees & Taxes slice summing to gross", () => {
  const list = [tx({ category: "Food", amount: 50, fee: 2 }), tx({ category: "Food", amount: 30 })];
  const b = getCategoryBreakdown(list, new Date("2026-09-01"), new Date("2026-09-30"), "expense");
  const food = b.find((c) => c.name === "Food")!;
  const fees = b.find((c) => c.name === FEES_CATEGORY_LABEL)!;
  expect(food.amount).toBe(80);   // principal only
  expect(fees.amount).toBe(2);    // synthetic slice
  expect(food.amount + fees.amount).toBe(82); // == gross total
});
