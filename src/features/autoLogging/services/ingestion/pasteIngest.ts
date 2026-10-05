import { Category } from "../../../../types";
import { loadBusinesses, loadCategories } from "../../../../utils/storage";
import { AutoLogSettings, AutoLogStats, ParsedDraft, RawEvent } from "../../types";
import { fnv1a } from "../dedupe/textHash";
import { parseEvent } from "../parser/engine";
import { migrateDefaultCurrencyIfNeeded } from "../migration/defaultCurrency";
import { incrementAutoLogStats } from "../persistence/stats";
import { saveDraft } from "./applyPlan";
import { MAX_BODY_CHARS } from "./iosInbox/constants";
import { Plan } from "./saveDraft";

export type PasteOutcome = "saved" | "review" | "duplicate" | "not-financial" | "empty";

export interface PasteResult {
    outcome: PasteOutcome;
    draft?: ParsedDraft;
}

export interface PasteDeps {
    loadSettings?: () => Promise<AutoLogSettings>;
    loadCategories?: () => Promise<Category[]>;
    runSave?: (draft: ParsedDraft, settings: AutoLogSettings, event: RawEvent) => Promise<Plan>;
    writeStats?: (deltas: Partial<AutoLogStats>) => Promise<void>;
    now?: () => number;
}

// A paste is an explicit user action, so it skips the capture toggles and sender allowlist.
export async function ingestPastedText(text: string, deps: PasteDeps = {}): Promise<PasteResult> {
    const body = text.trim().slice(0, MAX_BODY_CHARS);
    if (!body) return { outcome: "empty" };

    const now = (deps.now ?? Date.now)();
    const writeStats = deps.writeStats ?? (async (d: Partial<AutoLogStats>) => {
        await incrementAutoLogStats(d);
    });
    const event: RawEvent = {
        id: `paste-${now}`,
        source: "sms",
        via: "paste",
        body,
        timestamp: now,
        // Time-free so pasting the same SMS again is caught by raw-hash history.
        rawHash: `paste-${fnv1a(body)}`,
    };

    const [settings, categories] = await Promise.all([
        (deps.loadSettings ?? loadSettingsWithCurrency)(),
        (deps.loadCategories ?? loadCategories)(),
    ]);

    const draft = parseEvent(event, categories);
    if (!draft) {
        await safeStats(writeStats, { capturedSms: 1, parseFailures: 1 });
        return { outcome: "not-financial" };
    }

    const plan = await (deps.runSave ?? saveDraft)(draft, settings, event);
    const outcome: PasteOutcome =
        plan.outcome === "save" || plan.outcome === "replace"
            ? "saved"
            : plan.outcome === "review"
              ? "review"
              : "duplicate";

    await safeStats(writeStats, {
        capturedSms: 1,
        autoSaved: outcome === "saved" ? 1 : 0,
        queuedForReview: outcome === "review" ? 1 : 0,
        dedupeHits: outcome === "duplicate" ? 1 : 0,
    });
    return { outcome, draft };
}

// Pasting can happen before capture was ever enabled, which is where the default
// currency is otherwise migrated from the user's cashbooks.
async function loadSettingsWithCurrency(): Promise<AutoLogSettings> {
    return migrateDefaultCurrencyIfNeeded(await loadBusinesses());
}

async function safeStats(
    writeStats: (deltas: Partial<AutoLogStats>) => Promise<void>,
    deltas: Partial<AutoLogStats>,
): Promise<void> {
    try {
        await writeStats(deltas);
    } catch {
        // stats failure must never break ingestion
    }
}
