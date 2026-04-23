import { loadCategories } from "../../../../utils/storage";
import { AutoLogSettings, RawEvent } from "../../types";
import { parse } from "../parser/parse";
import { isAllowedEvent } from "../filter/isAllowedEvent";
import { saveDraft } from "./applyPlan";

const SAMPLE_EVENTS: RawEvent[] = [
    {
        id: "seed-1",
        source: "sms",
        sender: "MTN",
        body: "Debit Alert: GHS 45.00 paid at Melcom on 23-Apr-2026. Ref:123456",
        timestamp: Date.now(),
        rawHash: "seed-1",
    },
    {
        id: "seed-2",
        source: "sms",
        sender: "VodafoneGH",
        body: "You have received GHS 500.00 from John Doe. Balance: GHS 1,234.00",
        timestamp: Date.now() - 60_000,
        rawHash: "seed-2",
    },
    {
        id: "seed-3",
        source: "notification",
        packageName: "com.mtn.momo",
        title: "MoMo",
        body: "Paid GHS 30.00 to Uber for transport",
        timestamp: Date.now() - 120_000,
        rawHash: "seed-3",
    },
    {
        id: "seed-4",
        source: "sms",
        sender: "GCB",
        body: "USD 12.50 charged at Shell Filling Station",
        timestamp: Date.now() - 180_000,
        rawHash: "seed-4",
    },
];

export async function seedSampleEvents(settings: AutoLogSettings): Promise<{ attempted: number; saved: number; queued: number; filtered: number; dropped: number }> {
    const categories = await loadCategories();
    let saved = 0;
    let queued = 0;
    let filtered = 0;
    let dropped = 0;

    for (const event of SAMPLE_EVENTS) {
        if (!isAllowedEvent(event, settings)) {
            filtered++;
            continue;
        }
        const draft = parse(event, categories);
        if (!draft) {
            dropped++;
            continue;
        }
        const plan = await saveDraft(draft, settings);
        if (plan.outcome === "save" || plan.outcome === "replace") saved++;
        else if (plan.outcome === "review") queued++;
        else dropped++;
    }

    return { attempted: SAMPLE_EVENTS.length, saved, queued, filtered, dropped };
}
