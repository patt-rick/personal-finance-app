import type { HexColor } from "react-native-android-widget";
import { Business } from "../../../types";
import { CASHBOOK_COLORS } from "./palette";

export const DEFAULT_CASHBOOK_ICON = "wallet";

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const hashToIndex = (seed: string, mod: number): number => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % mod;
};

export const resolveCashbookColor = (
    business: Pick<Business, "id" | "color">,
): HexColor => {
    if (business.color && HEX_RE.test(business.color)) {
        return business.color as HexColor;
    }
    return CASHBOOK_COLORS[hashToIndex(business.id || "", CASHBOOK_COLORS.length)];
};

// Overridden in Task 4 to also validate against the icon registry. For now it
// only needs the default so the palette task can land independently.
export const resolveCashbookIconKey = (
    _business: Pick<Business, "icon">,
): string => DEFAULT_CASHBOOK_ICON;

// Produce an #AARRGGBB color from a 6- or 8-digit hex, using the last 6 digits.
export const withAlpha = (hex: string, alpha2: string): HexColor =>
    `#${alpha2}${hex.slice(-6)}` as HexColor;
