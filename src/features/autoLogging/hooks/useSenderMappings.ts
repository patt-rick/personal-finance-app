import { useCallback, useEffect, useState } from "react";
import { SenderMapping } from "../types";
import { loadSenderMappings, saveSenderMappings } from "../services/persistence/senderMappings";

export interface UseSenderMappings {
    mappings: SenderMapping[];
    loading: boolean;
    rename: (senderKey: string, displayName: string) => Promise<void>;
    reroute: (senderKey: string, businessId: string | null) => Promise<void>;
    remove: (senderKey: string) => Promise<void>;
    reload: () => Promise<void>;
}

export function useSenderMappings(): UseSenderMappings {
    const [mappings, setMappings] = useState<SenderMapping[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const loaded = await loadSenderMappings();
        setMappings(loaded);
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const mutate = useCallback(async (next: SenderMapping[]) => {
        setMappings(next);
        await saveSenderMappings(next);
    }, []);

    const rename = useCallback(
        (senderKey: string, displayName: string) =>
            mutate(mappings.map((m) => (m.senderKey === senderKey ? { ...m, displayName } : m))),
        [mappings, mutate],
    );

    const reroute = useCallback(
        (senderKey: string, businessId: string | null) =>
            mutate(mappings.map((m) => (m.senderKey === senderKey ? { ...m, businessId } : m))),
        [mappings, mutate],
    );

    const remove = useCallback(
        (senderKey: string) => mutate(mappings.filter((m) => m.senderKey !== senderKey)),
        [mappings, mutate],
    );

    return { mappings, loading, rename, reroute, remove, reload };
}
