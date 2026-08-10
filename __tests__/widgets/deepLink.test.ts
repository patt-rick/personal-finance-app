import { parseQuickAddLink, buildQuickAddLink } from "../../src/features/widgets/services/deepLink";

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

    it("buildQuickAddLink builds the expected URL", () => {
        expect(buildQuickAddLink("b1")).toBe("financetracker://quick-add?businessId=b1");
        expect(buildQuickAddLink()).toBe("financetracker://quick-add");
    });

    it("buildQuickAddLink round-trips through parseQuickAddLink", () => {
        expect(parseQuickAddLink(buildQuickAddLink("b1"))).toEqual({ businessId: "b1" });
        expect(parseQuickAddLink(buildQuickAddLink())).toEqual({ businessId: null });
    });

    it("parses without the URL constructor (RN-safe): extra slashes and encoded id", () => {
        expect(parseQuickAddLink("financetracker:///quick-add")).toEqual({ businessId: null });
        expect(parseQuickAddLink("financetracker://quick-add?businessId=a%20b")).toEqual({ businessId: "a b" });
    });
});
