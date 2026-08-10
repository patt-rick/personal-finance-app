jest.mock("@react-native-async-storage/async-storage", () => {
    let store: Record<string, string> = {};
    return {
        __esModule: true,
        default: {
            getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
            setItem: jest.fn(async (k: string, v: string) => {
                store[k] = v;
            }),
            removeItem: jest.fn(async (k: string) => {
                delete store[k];
            }),
            __reset: () => {
                store = {};
            },
        },
    };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    getWidgetBusinessId,
    setWidgetBusinessId,
    removeWidgetMapping,
    removeMappingsForBusiness,
} from "../../src/features/widgets/services/widgetConfig";

beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

describe("widgetConfig", () => {
    it("returns null when no mapping exists", async () => {
        expect(await getWidgetBusinessId(1)).toBeNull();
    });

    it("stores and reads a widgetId -> businessId mapping", async () => {
        await setWidgetBusinessId(1, "b1");
        await setWidgetBusinessId(2, "b2");
        expect(await getWidgetBusinessId(1)).toBe("b1");
        expect(await getWidgetBusinessId(2)).toBe("b2");
    });

    it("removes a single widget mapping", async () => {
        await setWidgetBusinessId(1, "b1");
        await removeWidgetMapping(1);
        expect(await getWidgetBusinessId(1)).toBeNull();
    });

    it("removes all mappings pointing at a deleted business", async () => {
        await setWidgetBusinessId(1, "b1");
        await setWidgetBusinessId(2, "b1");
        await setWidgetBusinessId(3, "b2");
        await removeMappingsForBusiness("b1");
        expect(await getWidgetBusinessId(1)).toBeNull();
        expect(await getWidgetBusinessId(2)).toBeNull();
        expect(await getWidgetBusinessId(3)).toBe("b2");
    });
});
