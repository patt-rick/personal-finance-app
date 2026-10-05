jest.mock("../../src/utils/storage", () => ({
    loadCategories: jest.fn(async () => []),
}));

import { ParsedDraft, RawEvent } from "../../src/features/autoLogging/types";
import { DEFAULT_AUTO_LOG_SETTINGS } from "../../src/features/autoLogging/services/persistence/settings";
import { ingestPastedText, PasteDeps } from "../../src/features/autoLogging/services/ingestion/pasteIngest";
import { Plan } from "../../src/features/autoLogging/services/ingestion/saveDraft";

const MOMO = "Debit Alert: GHS 45.00 at Melcom on 2026-04-23";

function deps(outcome: Plan["outcome"] = "save", overrides: Partial<PasteDeps> = {}) {
    const saved: Array<{ draft: ParsedDraft; event: RawEvent }> = [];
    const stats: any[] = [];
    const d: PasteDeps = {
        loadSettings: async () => ({ ...DEFAULT_AUTO_LOG_SETTINGS }),
        loadCategories: async () => [],
        runSave: async (draft, _settings, event) => {
            saved.push({ draft, event });
            return { outcome };
        },
        writeStats: async (delta) => {
            stats.push(delta);
        },
        now: () => Date.parse("2026-10-05T10:00:00Z"),
        ...overrides,
    };
    return { d, saved, stats };
}

describe("ingestPastedText", () => {
    it("saves a financial SMS even when SMS capture is off", async () => {
        const { d, saved, stats } = deps("save");
        const result = await ingestPastedText(`  ${MOMO}  `, d);
        expect(result.outcome).toBe("saved");
        expect(result.draft?.amount).toBe(45);
        expect(saved).toHaveLength(1);
        expect(saved[0].event).toMatchObject({ source: "sms", via: "paste", body: MOMO });
        expect(stats[0]).toMatchObject({ capturedSms: 1, autoSaved: 1 });
    });

    it("gives a re-pasted message the same raw hash so history dedupe catches it", async () => {
        const first = deps("save");
        const second = deps("drop", { now: () => Date.parse("2026-10-05T18:00:00Z") });
        await ingestPastedText(MOMO, first.d);
        const result = await ingestPastedText(MOMO, second.d);
        expect(second.saved[0].event.rawHash).toBe(first.saved[0].event.rawHash);
        expect(result.outcome).toBe("duplicate");
    });

    it("reports review when the plan queues the draft", async () => {
        const { d } = deps("review");
        expect((await ingestPastedText(MOMO, d)).outcome).toBe("review");
    });

    it("rejects text that is not a transaction without saving", async () => {
        const { d, saved, stats } = deps();
        expect((await ingestPastedText("Hey friend, see you tomorrow", d)).outcome).toBe("not-financial");
        expect(saved).toHaveLength(0);
        expect(stats[0]).toMatchObject({ capturedSms: 1, parseFailures: 1 });
    });

    it("returns empty for blank clipboard text", async () => {
        const { d, stats } = deps();
        expect((await ingestPastedText("   ", d)).outcome).toBe("empty");
        expect(stats).toHaveLength(0);
    });
});
