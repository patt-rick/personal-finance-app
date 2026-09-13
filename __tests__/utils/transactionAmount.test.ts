import { grossAmount, FEES_CATEGORY_LABEL } from "../../src/utils/transactionAmount";

describe("grossAmount", () => {
  it("returns amount when fee is undefined (backward compatible)", () => {
    expect(grossAmount({ amount: 100 })).toBe(100);
  });
  it("adds fee to amount", () => {
    expect(grossAmount({ amount: 100, fee: 2.5 })).toBe(102.5);
  });
  it("treats fee 0 as no fee", () => {
    expect(grossAmount({ amount: 100, fee: 0 })).toBe(100);
  });
  it("exposes the fees category label", () => {
    expect(FEES_CATEGORY_LABEL).toBe("Fees & Taxes");
  });
});
