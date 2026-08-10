import { useCallback, useEffect, useState } from "react";
import { Transaction } from "../../../types";
import { ReviewItem } from "../types";
import { loadReviewQueue, removeReviewItem } from "../services/persistence/reviewQueue";
import { loadTransactions, saveTransactions } from "../../../utils/storage";
import { refreshCashbookWidgets } from "../../widgets/services/widgetSync";

export interface UseAutoLogQueue {
    items: ReviewItem[];
    loading: boolean;
    confirm: (item: ReviewItem, edits?: Partial<ConfirmEdits>) => Promise<void>;
    reject: (item: ReviewItem) => Promise<void>;
    reload: () => Promise<void>;
}

export interface ConfirmEdits {
    amount: number;
    category: string;
    description: string;
    businessId: string;
}

export function useAutoLogQueue(): UseAutoLogQueue {
    const [items, setItems] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        setItems(await loadReviewQueue());
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const confirm = useCallback(
        async (item: ReviewItem, edits?: Partial<ConfirmEdits>) => {
            const tx: Transaction = {
                id: item.id,
                description: edits?.description ?? item.draft.merchant ?? "Auto entry",
                amount: edits?.amount ?? item.draft.amount,
                date: item.draft.occurredAt,
                type: item.draft.type === "transfer" ? "expense" : item.draft.type,
                businessId: edits?.businessId ?? item.businessId,
                category: edits?.category ?? item.draft.category,
                remark: item.draft.rawText.slice(0, 280),
                source: item.draft.source,
                sourceApp: item.draft.sourceApp ?? item.draft.senderDisplay,
                rawText: item.draft.rawText,
                autoLogged: true,
                confidence: item.draft.confidence,
                reviewStatus: "confirmed",
            };
            const existing = await loadTransactions();
            await saveTransactions([...existing, tx]);
            await removeReviewItem(item.id);
            void refreshCashbookWidgets();
            setItems((prev) => prev.filter((i) => i.id !== item.id));
        },
        [],
    );

    const reject = useCallback(async (item: ReviewItem) => {
        await removeReviewItem(item.id);
        setItems((prev) => prev.filter((i) => i.id !== item.id));
    }, []);

    return { items, loading, confirm, reject, reload };
}
