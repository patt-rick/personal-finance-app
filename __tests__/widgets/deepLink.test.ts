import { parseQuickAddLink } from "../../src/features/widgets/services/deepLink";

describe("parseQuickAddLink", () => {
    it("extracts businessId from a well-formed quick-add link", () => {
        expect(parseQuickAddLink("financetracker://quick-add?businessId=b1")).toEqual({
            businessId: "b1",
        });
    });

    it("returns businessId null when the param is absent", () => {
        expect(parseQuickAddLink("financetracker://quick-add")).toEqual({ businessId: null });
    });

    it("returns null for a non quick-add link", () => {
        expect(parseQuickAddLink("financetracker://settings")).toBeNull();
    });

    it("returns null for undefined or malformed input", () => {
        expect(parseQuickAddLink(undefined)).toBeNull();
        expect(parseQuickAddLink("not a url")).toBeNull();
    });
});
