import { Category } from "../../src/types";
import { RawEvent, SenderMapping } from "../../src/features/autoLogging/types";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";
import { categorize } from "../../src/features/autoLogging/services/parser/categorize";
import { stripTelcoBoilerplate } from "../../src/features/autoLogging/services/parser/guards";
import { resolveBusiness } from "../../src/features/autoLogging/services/routing/resolveBusiness";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";

const CATEGORIES: Category[] = [
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "6", name: "Food", type: "expense", isDefault: true },
    { id: "7", name: "Transportation", type: "expense", isDefault: true },
    { id: "8", name: "Housing", type: "expense", isDefault: true },
    { id: "9", name: "Utilities", type: "expense", isDefault: true },
    { id: "10", name: "Healthcare", type: "expense", isDefault: true },
    { id: "15", name: "Other Expense", type: "expense", isDefault: true },
];

const AD_TAIL =
    "Download the MoMo App for a Faster & Easier Experience. Click here: https://mtnmymomo.onelink.me/XJOt/MoMo";
const RECEIPT =
    "Payment for GHS852.00 to Broadband Bundle OVA.Current Balance: GHS 43.66. Transaction Id: 90688236273. Fee charged: GHS0.00,Tax Charged 0." +
    AD_TAIL;

function sms(sender: string, body: string): RawEvent {
    return {
        id: "e1",
        source: "sms",
        sender,
        body,
        timestamp: Date.parse("2026-10-02T10:00:00Z"),
        rawHash: "h1",
    };
}

describe("real MTN MoMo receipt with the app-download ad tail", () => {
    it("parses as a high-confidence MTN expense from the MobileMoney sender", () => {
        const draft = parseEvent(sms("MobileMoney", RECEIPT), CATEGORIES);
        expect(draft).not.toBeNull();
        expect(draft!.providerId).toBe("mtn-momo-debit");
        expect(draft!.senderKey).toBe("mtn");
        expect(draft!.type).toBe("expense");
        expect(draft!.amount).toBe(852);
        expect(draft!.currencyCode).toBe("GHS");
        expect(draft!.merchant).toBe("Broadband Bundle OVA");
        expect(draft!.reference).toBe("90688236273");
        expect(draft!.category).toBe("Utilities");
        expect(draft!.fee).toBeUndefined();
        expect(draft!.confidence).toBeGreaterThanOrEqual(DEFAULT_AUTO_LOG_SETTINGS.minConfidenceForAutoSave);
        expect(draft!.rawText).toBe(RECEIPT);
    });

    it("matches the MTN template when no amount has a space after the currency code", () => {
        const body = RECEIPT.replace("GHS 43.66", "GHS43.66");
        const draft = parseEvent(sms("MobileMoney", body), CATEGORIES);
        expect(draft?.providerId).toBe("mtn-momo-debit");
        expect(draft!.confidence).toBeGreaterThanOrEqual(DEFAULT_AUTO_LOG_SETTINGS.minConfidenceForAutoSave);
    });

    it("still strips the ad when a zero-width character hides inside 'Click here'", () => {
        const body = RECEIPT.replace("Click here", "Click\u200B here");
        expect(parseEvent(sms("MobileMoney", body), CATEGORIES)?.amount).toBe(852);
    });

    it("still parses through the fallback from an unknown sender, without a zero fee", () => {
        const draft = parseEvent(sms("+233244000000", RECEIPT), CATEGORIES);
        expect(draft?.amount).toBe(852);
        expect(draft?.type).toBe("expense");
        expect(draft?.fee).toBeUndefined();
    });
});

describe("stripTelcoBoilerplate", () => {
    it("removes MTN's own app-download sentence and link", () => {
        expect(stripTelcoBoilerplate(`Paid GHS 5 to Ama. ${AD_TAIL}`).trim()).toBe("Paid GHS 5 to Ama.");
    });

    it("strips an MTN link on http and on mtn.com.gh subdomains next to the ad sentence", () => {
        const ad = "Download the MoMo App for a Faster and Easier Experience.";
        expect(stripTelcoBoilerplate(`${ad} Click here: http://mtnmymomo.onelink.me/x`)).not.toMatch(/click here/i);
        expect(stripTelcoBoilerplate(`${ad} Click here https://momo.mtn.com.gh/app`)).not.toMatch(/click here/i);
    });

    it("leaves MTN's own promo links alone when the receipt ad sentence is absent", () => {
        const promo =
            "Yello! You have been credited with GHS 10.00 bonus airtime for using MoMo. Click here: https://promo.mtn.com.gh/bonus";
        expect(stripTelcoBoilerplate(promo)).toBe(promo);
        expect(parseEvent(sms("MTN", promo), CATEGORIES)).toBeNull();
    });

    it.each([
        "Click here: https://mtnmymomo.onelink.me.evil.com/x",
        "Click here: https://mtnmymomo.onelink.me@evil.com/x",
        "Click here: https://mtnmymomo.onelink.me:443@evil.com/x",
        "Click here: https://notmtn.com.gh/x",
        "Click here: https://bit.ly/mtn-momo",
    ])("keeps the 'click here' signal for a lookalike link: %s", (text) => {
        expect(stripTelcoBoilerplate(`Download the MoMo App for a Faster & Easier Experience. ${text}`)).toMatch(/click here/i);
    });

    it("does not strip scam wording placed inside a lookalike download sentence", () => {
        const scam =
            "You have received GHS 500. Download the MoMo App to claim now your free gift. Click here: https://mtnmymomo.onelink.me/x";
        expect(stripTelcoBoilerplate(scam)).toMatch(/claim now/i);
        expect(parseEvent(sms("MobileMoney", scam), CATEGORIES)).toBeNull();
    });

    it("still rejects spam that only borrows a real MTN link", () => {
        const scam = "Congratulations you won GHS 5000 in the MoMo lottery! Click here: https://mtnmymomo.onelink.me/x";
        expect(parseEvent(sms("MobileMoney", scam), CATEGORIES)).toBeNull();
    });
});

describe("categorize keyword matching", () => {
    const cat = (merchant: string, text: string) => categorize(merchant, text, "expense", CATEGORIES).category;

    it("does not read 'rent' inside 'Current Balance' as Housing", () => {
        expect(cat("Kofi Shop", "Payment for GHS 10 to Kofi Shop. Current Balance: GHS 5")).toBe("Other Expense");
    });

    it("does not read a 'Total:' line as Transportation", () => {
        expect(cat("Kofi Shop", "Payment of GHS 300 to Kofi Shop. Total: GHS 300")).toBe("Other Expense");
    });

    it("keeps whole-word, plural and brand keyword matches", () => {
        expect(cat("TotalEnergies Osu", "Paid GHS 200 to TotalEnergies Osu")).toBe("Transportation");
        expect(cat("Pizzaman", "Paid GHS 80 to Pizzaman")).toBe("Food");
        expect(cat("Star Oil Petroleum", "Paid GHS 300 to Star Oil Petroleum")).toBe("Transportation");
        expect(cat("Ernest Pharmacies", "Paid GHS 60 to Ernest Pharmacies")).toBe("Healthcare");
        expect(cat("Kasoa Restaurants", "Paid GHS 50 to Kasoa Restaurants")).toBe("Food");
        expect(cat("Uber", "Paid GHS 45 to Uber")).toBe("Transportation");
    });

    it("does not treat 'Internet Banking' transfers as Utilities", () => {
        expect(cat("Kofi Mensah", "Acct XX1234 debited with GHS500.00 via Internet Banking to Kofi Mensah")).toBe(
            "Other Expense",
        );
    });
});

describe("legacy sender mappings after aliasing MobileMoney to MTN", () => {
    const mapping = (senderKey: string, businessId: string | null): SenderMapping => ({
        senderKey,
        displayName: senderKey,
        businessId,
        autoCreated: true,
        sampleSenders: [senderKey],
        createdAt: "2026-09-01T00:00:00.000Z",
    });
    const smsDraft = parseEvent(sms("MobileMoney", RECEIPT), CATEGORIES)!;
    const notifDraft = { ...smsDraft, source: "notification" as const, senderDisplay: "Mtn Momo" };
    const books = [
        { id: "momo-book", name: "MobileMoney", createdAt: "2026-09-01T00:00:00.000Z" },
        { id: "mtn-book", name: "MTN", createdAt: "2026-09-01T00:00:00.000Z" },
    ];
    const route = (draft: typeof smsDraft, mappings: SenderMapping[]) =>
        resolveBusiness(draft, DEFAULT_AUTO_LOG_SETTINGS, books, mappings);

    it("routes MobileMoney SMS to the cashbook an existing 'mobilemoney' mapping points at", () => {
        expect(route(smsDraft, [mapping("mobilemoney", "momo-book")])).toEqual({ businessId: "momo-book" });
    });

    it("keeps MobileMoney SMS on its own mapping when an 'mtn' mapping also exists", () => {
        const mappings = [mapping("mobilemoney", "momo-book"), mapping("mtn", "mtn-book")];
        expect(route(smsDraft, mappings)).toEqual({ businessId: "momo-book" });
        expect(route(notifDraft, mappings)).toEqual({ businessId: "mtn-book" });
    });

    it("does not let an ignored 'mtn' mapping swallow MobileMoney SMS", () => {
        const mappings = [mapping("mobilemoney", "momo-book"), mapping("mtn", null)];
        expect(route(smsDraft, mappings)).toEqual({ businessId: "momo-book" });
        expect(route(notifDraft, mappings)).toEqual({ businessId: "", ignore: true });
    });

    it("falls back to the 'mtn' mapping when the old mapping's cashbook was deleted", () => {
        const mappings = [mapping("mobilemoney", "deleted-book"), mapping("mtn", "mtn-book")];
        expect(route(smsDraft, mappings)).toEqual({ businessId: "mtn-book" });
    });
});
