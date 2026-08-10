import { QUICK_ADD_PATH, DEEP_LINK_SCHEME } from "../constants";

export interface QuickAddLink {
    businessId: string | null;
}

export const buildQuickAddLink = (businessId?: string | null): string => {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
    return `${DEEP_LINK_SCHEME}://${QUICK_ADD_PATH}${suffix}`;
};

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
