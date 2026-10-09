jest.mock("@react-native-async-storage/async-storage", () => {
    let store: Record<string, string> = {};
    return {
        __esModule: true,
        default: {
            getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
            setItem: jest.fn(async (k: string, v: string) => {
                store[k] = v;
            }),
            __reset: () => {
                store = {};
            },
        },
    };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    appendReviewItem,
    removeReviewItem,
    subscribeReviewQueue,
} from "../../src/features/autoLogging/services/persistence/reviewQueue";
import { ReviewItem } from "../../src/features/autoLogging/types";

function item(id: string): ReviewItem {
    return { id, businessId: "b1", createdAt: "2026-10-09T00:00:00Z", draft: {} } as unknown as ReviewItem;
}

beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

describe("subscribeReviewQueue", () => {
    it("reports the new count when items are added and removed", async () => {
        const counts: number[] = [];
        const unsubscribe = subscribeReviewQueue((n) => counts.push(n));

        await appendReviewItem(item("a"));
        await appendReviewItem(item("b"));
        await removeReviewItem("a");
        unsubscribe();
        await removeReviewItem("b");

        expect(counts).toEqual([1, 2, 1]);
    });

    it("does not notify when nothing changed (duplicate append, unknown remove)", async () => {
        await appendReviewItem(item("a"));
        const listener = jest.fn();
        const unsubscribe = subscribeReviewQueue(listener);

        await appendReviewItem(item("a"));
        await removeReviewItem("missing");
        unsubscribe();

        expect(listener).not.toHaveBeenCalled();
    });
});
