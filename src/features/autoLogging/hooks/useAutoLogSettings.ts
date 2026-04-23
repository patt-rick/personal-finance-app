import { useCallback, useEffect, useState } from "react";
import { AutoLogSettings } from "../types";
import {
    DEFAULT_AUTO_LOG_SETTINGS,
    loadAutoLogSettings,
    saveAutoLogSettings,
} from "../services/persistence/settings";

export interface UseAutoLogSettings {
    settings: AutoLogSettings;
    loading: boolean;
    update: (patch: Partial<AutoLogSettings>) => Promise<void>;
    reload: () => Promise<void>;
}

export function useAutoLogSettings(): UseAutoLogSettings {
    const [settings, setSettings] = useState<AutoLogSettings>(DEFAULT_AUTO_LOG_SETTINGS);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const loaded = await loadAutoLogSettings();
        setSettings(loaded);
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const update = useCallback(
        async (patch: Partial<AutoLogSettings>) => {
            const next = { ...settings, ...patch };
            setSettings(next);
            await saveAutoLogSettings(next);
        },
        [settings],
    );

    return { settings, loading, update, reload };
}
