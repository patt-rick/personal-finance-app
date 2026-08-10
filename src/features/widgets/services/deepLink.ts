import { QUICK_ADD_PATH } from "../constants";

export interface QuickAddLink {
    businessId: string | null;
}

// Parses financetracker://quick-add?businessId=<id>. Returns null if the URL is
// not a quick-add link or cannot be parsed.
export const parseQuickAddLink = (url: string | undefined | null): QuickAddLink | null => {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        // scheme URLs parse with the path in either host or pathname depending on
        // the platform; normalize both.
        const path = (parsed.host || parsed.pathname.replace(/^\/+/, "")).replace(/^\/+/, "");
        if (path !== QUICK_ADD_PATH) return null;
        return { businessId: parsed.searchParams.get("businessId") };
    } catch {
        return null;
    }
};
