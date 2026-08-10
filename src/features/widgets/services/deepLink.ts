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
    // React Native's URL polyfill does not parse custom schemes, so parse by hand
    // rather than with `new URL(...)` (which works in Node/tests but not on device).
    const colonIdx = url.indexOf(":");
    if (colonIdx === -1) return null;
    const afterScheme = url.slice(colonIdx + 1).replace(/^\/+/, "");
    const queryIdx = afterScheme.indexOf("?");
    const path = (queryIdx === -1 ? afterScheme : afterScheme.slice(0, queryIdx)).replace(/\/+$/, "");
    if (path !== QUICK_ADD_PATH) return null;
    let businessId: string | null = null;
    if (queryIdx !== -1) {
        for (const pair of afterScheme.slice(queryIdx + 1).split("&")) {
            const eqIdx = pair.indexOf("=");
            if ((eqIdx === -1 ? pair : pair.slice(0, eqIdx)) === "businessId") {
                const rawVal = eqIdx === -1 ? "" : pair.slice(eqIdx + 1);
                try {
                    businessId = decodeURIComponent(rawVal);
                } catch {
                    businessId = rawVal;
                }
                break;
            }
        }
    }
    return { businessId };
};
