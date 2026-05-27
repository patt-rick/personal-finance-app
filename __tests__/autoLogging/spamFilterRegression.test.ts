import { Category } from "../../src/types";
import { RawEvent } from "../../src/features/autoLogging/types";
import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";

const CATEGORIES: Category[] = [
    { id: "1", name: "Salary", type: "income", isDefault: true },
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "15", name: "Other Expense", type: "expense", isDefault: true },
];

function ev(sender: string, body: string): RawEvent {
    return {
        id: "id",
        source: "sms",
        sender,
        body,
        timestamp: Date.parse("2026-04-23T10:00:00Z"),
        rawHash: "h",
    };
}

describe("regression — spam SMS must not be parsed as transactions", () => {
    it("crypto airdrop / paid-testing scam is rejected", () => {
        const body =
            "Possible-$5 update! All you gotta do is drop your X username and Sol address. " +
            "You'll get a link to test the app once it's live. And you'l get paid $5 for testing it. " +
            "Get in now before it's too late!";
        expect(parseEvent(ev("UNKNOWN", body), CATEGORIES)).toBeNull();
    });

    it("'get paid' promotional copy alone is rejected", () => {
        const body = "Get paid $50 today by joining our beta. Click here to sign up!";
        expect(parseEvent(ev("PROMO", body), CATEGORIES)).toBeNull();
    });

    it("classic congratulations / promo / claim spam is rejected", () => {
        const body = "Congratulations! You won a promo reward of GHS 1000. Click here to claim now!";
        expect(parseEvent(ev("UNKNOWN", body), CATEGORIES)).toBeNull();
    });

    it("crypto giveaway with wallet address is rejected", () => {
        const body = "Free $100 airdrop! Send your sol address to claim. Limited slots, get in now!";
        expect(parseEvent(ev("UNKNOWN", body), CATEGORIES)).toBeNull();
    });

    it("paid for testing the app is rejected even without other spam markers", () => {
        const body = "Hey - get paid for testing the app, just drop your wallet address and you'll get $20.";
        expect(parseEvent(ev("UNKNOWN", body), CATEGORIES)).toBeNull();
    });

    it("macro / market hype with absurd amount is rejected", () => {
        const body =
            "FED WILL INJECT $6,576,000,000.00 INTO THE MARKETS TOMORROW AT 9 AM ET, " +
            "RIGHT BEFORE THE MARKET OPEN! KEVIN WARSH IS OFFICIALLY CONTINUING T-BILL " +
            "PURCHASES AND TURNING THE MONEY PRINTER BACK ON! GIGA BULLISH FOR MARKETS! " +
            "https://x.com/DefWimar/status/2059366309201055969";
        expect(parseEvent(ev("UNKNOWN", body), CATEGORIES)).toBeNull();
    });

    it("market hype without spam-word match is still rejected due to absurd amount", () => {
        const body = "We purchased securities worth $5,000,000,000.00 this quarter.";
        expect(parseEvent(ev("UNKNOWN", body), CATEGORIES)).toBeNull();
    });

    it("bullish / money-printer hype copy is rejected even at plausible amounts", () => {
        const body = "Bullish! Money printer go brrr — $250 incoming, transfer to your account.";
        expect(parseEvent(ev("UNKNOWN", body), CATEGORIES)).toBeNull();
    });

    it("legitimate debit alert from an unknown sender still parses", () => {
        const draft = parseEvent(
            ev("RANDOM-NEW", "Your account has been debited GHS 25 at Melcom"),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.amount).toBe(25);
        expect(draft!.type).toBe("expense");
    });

    it("legitimate 'you have paid' from an unknown sender still parses", () => {
        const draft = parseEvent(
            ev("RANDOM-NEW", "You have paid GHS 30 to Uber. Ref ABC1234"),
            CATEGORIES,
        );
        expect(draft).not.toBeNull();
        expect(draft!.amount).toBe(30);
        expect(draft!.type).toBe("expense");
    });
});
