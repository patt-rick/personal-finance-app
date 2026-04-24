import { Category } from "../../../../types";
import { AutoLogSettings, AutoLogStats, ParsedDraft, RawEvent } from "../../types";
import { loadCategories } from "../../../../utils/storage";
import { loadAutoLogSettings } from "../persistence/settings";
import { incrementAutoLogStats } from "../persistence/stats";
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
    writeStats?: (deltas: Partial<AutoLogStats>) => Promise<void>;
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
    const doWriteStats =
        deps.writeStats ?? (async (d: Partial<AutoLogStats>) => {
            await incrementAutoLogStats(d);
        });

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
    const deltas: Partial<AutoLogStats> = {
        capturedSms: 0,
        capturedNotifications: 0,
        autoSaved: 0,
        queuedForReview: 0,
        dedupeHits: 0,
        parseFailures: 0,
    };

    for (const event of events) {
        processedIds.push(event.id);
        if (event.source === "sms") deltas.capturedSms = (deltas.capturedSms ?? 0) + 1;
        if (event.source === "notification") {
            deltas.capturedNotifications = (deltas.capturedNotifications ?? 0) + 1;
        }

        if (!doFilter(event, settings)) {
            result.filtered++;
            continue;
        }

        const draft = doParse(event, categories);
        if (!draft) {
            result.dropped++;
            deltas.parseFailures = (deltas.parseFailures ?? 0) + 1;
            continue;
        }

        try {
            const plan = await doSave(draft, settings);
            if (plan.outcome === "save" || plan.outcome === "replace") {
                result.saved++;
                deltas.autoSaved = (deltas.autoSaved ?? 0) + 1;
                if (plan.outcome === "replace") {
                    deltas.dedupeHits = (deltas.dedupeHits ?? 0) + 1;
                }
            } else if (plan.outcome === "review") {
                result.queued++;
                deltas.queuedForReview = (deltas.queuedForReview ?? 0) + 1;
            } else {
                result.dropped++;
                deltas.dedupeHits = (deltas.dedupeHits ?? 0) + 1;
            }
        } catch {
            result.dropped++;
        }
    }

    await doClear(processedIds);
    try {
        await doWriteStats(deltas);
    } catch {
        // stats failure must never break the drain
    }
    return result;
}
