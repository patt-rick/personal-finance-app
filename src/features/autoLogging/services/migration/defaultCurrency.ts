import { Business } from "../../../../types";
import { AutoLogSettings } from "../../types";
import { loadAutoLogSettings, saveAutoLogSettings } from "../persistence/settings";

export function chooseDefaultCurrency(businesses: Business[], fallback: string): string {
    const counts = new Map<string, number>();
    for (const b of businesses) {
        const c = b.currency?.trim();
        if (!c) continue;
        counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    if (counts.size === 0) return fallback;
    let best = fallback;
    let bestCount = 0;
    for (const [code, count] of counts) {
        if (count > bestCount) {
            best = code;
            bestCount = count;
        }
    }
    return best;
}

export async function migrateDefaultCurrencyIfNeeded(
    businesses: Business[],
): Promise<AutoLogSettings> {
    const settings = await loadAutoLogSettings();
    if (settings.defaultCurrencyMigrated) return settings;
    const nextCurrency = chooseDefaultCurrency(businesses, settings.defaultCurrency);
    const next: AutoLogSettings = {
        ...settings,
        defaultCurrency: nextCurrency,
        defaultCurrencyMigrated: true,
    };
    await saveAutoLogSettings(next);
    return next;
}
