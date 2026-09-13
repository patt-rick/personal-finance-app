import { parseEvent } from "../../src/features/autoLogging/services/parser/engine";
import { RawEvent, AutoLogSettings } from "../../src/features/autoLogging/types";
import { planSaveDraft } from "../../src/features/autoLogging/services/ingestion/saveDraft";

const ev = (body: string): RawEvent => ({
  id: "1", source: "sms", sender: "GCB", body,
  timestamp: Date.now(), rawHash: "h",
});

describe("fee/tax split", () => {
  it("splits fee out of expense amount instead of folding", () => {
    const d = parseEvent(ev("Payment of GHS 100.00 to SHOPRITE. Fee GHS 2.50. Bal GHS 5"), []);
    expect(d).not.toBeNull();
    expect(d!.amount).toBe(100);
    expect(d!.fee).toBe(2.5);
  });
  it("detects the literal word 'tax'", () => {
    const d = parseEvent(ev("Debit GHS 50.00 at MTN. Tax GHS 1.00"), []);
    expect(d!.amount).toBe(50);
    expect(d!.fee).toBe(1);
  });
  it("does not set fee on income", () => {
    const d = parseEvent(ev("You have received GHS 200.00 from KOFI. Fee GHS 1.00"), []);
    expect(d!.type).toBe("income");
    expect(d!.fee).toBeUndefined();
  });
  it("leaves fee undefined when no fee present", () => {
    const d = parseEvent(ev("Payment of GHS 100.00 to SHOPRITE"), []);
    expect(d!.fee).toBeUndefined();
  });
});

const settings = {
  enabled: true, captureSms: true, captureNotifications: true, defaultCurrency: "GHS",
  allowedPackages: [], allowedSenders: [], reviewLowConfidenceOnly: false,
  askBeforeSaving: false, minConfidenceForAutoSave: 0, defaultCurrencyMigrated: true,
} as AutoLogSettings;

describe("fee save paths", () => {
  it("persists fee onto the auto-saved transaction", () => {
    const draft = parseEvent(ev("Payment of GHS 100.00 to SHOPRITE. Fee GHS 2.50"), [])!;
    const plan = planSaveDraft({ draft, settings, businesses: [], transactions: [], mappings: [] });
    expect(plan.transaction?.amount).toBe(100);
    expect(plan.transaction?.fee).toBe(2.5);
  });
});
