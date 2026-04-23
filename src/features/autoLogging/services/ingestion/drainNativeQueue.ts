import { Category } from "../../../../types";
import { AutoLogSettings, ParsedDraft, RawEvent } from "../../types";
import { loadCategories } from "../../../../utils/storage";
import { loadAutoLogSettings } from "../persistence/settings";
import { isAllowedEvent } from "../filter/isAllowedEvent";
import { parse } from "../parser/parse";
import { saveDraft } from "./applyPlan";
import { autoLogNative } from "./nativeBridge";
import { Plan } from "./saveDraft";

export interface DrainResult {
    drained: number;
    saved: number;
    queued: number;
    filtered: number;
    dropped: number;
}

export interface DrainDeps {
    drainQueue?: () => Promise<RawEvent[]>;
    clearQueue?: (ids: string[]) => Promise<void>;
    loadCategories?: () => Promise<Category[]>;
    loadSettings?: () => Promise<AutoLogSettings>;
    applyFilter?: (event: RawEvent, settings: AutoLogSettings) => boolean;
    runParse?: (event: RawEvent, categories: Category[]) => ParsedDraft | null;
    runSave?: (draft: ParsedDraft, settings: AutoLogSettings) => Promise<Plan>;
}

const EMPTY: DrainResult = { drained: 0, saved: 0, queued: 0, filtered: 0, dropped: 0 };

export async function drainNativeQueue(deps: DrainDeps = {}): Promise<DrainResult> {
    const doDrain = deps.drainQueue ?? autoLogNative.drainQueue;
    const doClear = deps.clearQueue ?? autoLogNative.clearQueue;
    const doLoadSettings = deps.loadSettings ?? loadAutoLogSettings;
    const doLoadCategories = deps.loadCategories ?? loadCategories;
    const doFilter = deps.applyFilter ?? isAllowedEvent;
    const doParse = deps.runParse ?? parse;
    const doSave = deps.runSave ?? saveDraft;

    const events = await doDrain();
    if (events.length === 0) return { ...EMPTY };

    const settings = await doLoadSettings();
    if (!settings.enabled) {
        await doClear(events.map((e) => e.id));
        return { ...EMPTY, drained: events.length, dropped: events.length };
    }

    const categories = await doLoadCategories();

    const result: DrainResult = { ...EMPTY, drained: events.length };
    const processedIds: string[] = [];

    for (const event of events) {
        processedIds.push(event.id);

        if (!doFilter(event, settings)) {
            result.filtered++;
            continue;
        }

        const draft = doParse(event, categories);
        if (!draft) {
            result.dropped++;
            continue;
        }

        try {
            const plan = await doSave(draft, settings);
            if (plan.outcome === "save" || plan.outcome === "replace") result.saved++;
            else if (plan.outcome === "review") result.queued++;
            else result.dropped++;
        } catch {
            result.dropped++;
        }
    }

    await doClear(processedIds);
    return result;
}
