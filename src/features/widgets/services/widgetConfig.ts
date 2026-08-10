import AsyncStorage from "@react-native-async-storage/async-storage";
import { WIDGET_CASHBOOK_MAP_KEY } from "../constants";

type WidgetMap = Record<string, string>; // widgetId (as string) -> businessId

const readMap = async (): Promise<WidgetMap> => {
    try {
        const raw = await AsyncStorage.getItem(WIDGET_CASHBOOK_MAP_KEY);
        return raw ? (JSON.parse(raw) as WidgetMap) : {};
    } catch {
        return {};
    }
};

const writeMap = async (map: WidgetMap): Promise<void> => {
    await AsyncStorage.setItem(WIDGET_CASHBOOK_MAP_KEY, JSON.stringify(map));
};

export const getWidgetBusinessId = async (widgetId: number): Promise<string | null> => {
    const map = await readMap();
    return map[String(widgetId)] ?? null;
};

export const setWidgetBusinessId = async (widgetId: number, businessId: string): Promise<void> => {
    const map = await readMap();
    map[String(widgetId)] = businessId;
    await writeMap(map);
};

export const removeWidgetMapping = async (widgetId: number): Promise<void> => {
    const map = await readMap();
    delete map[String(widgetId)];
    await writeMap(map);
};

export const removeMappingsForBusiness = async (businessId: string): Promise<void> => {
    const map = await readMap();
    let changed = false;
    for (const [wid, bid] of Object.entries(map)) {
        if (bid === businessId) {
            delete map[wid];
            changed = true;
        }
    }
    if (changed) await writeMap(map);
};
