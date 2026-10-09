import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { loadReviewQueue, subscribeReviewQueue } from "../services/persistence/reviewQueue";

export function usePendingReviewCount(): number {
    const [count, setCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            loadReviewQueue().then((queue) => {
                if (mounted) setCount(queue.length);
            });
            return () => {
                mounted = false;
            };
        }, []),
    );

    useEffect(() => subscribeReviewQueue(setCount), []);

    return count;
}
