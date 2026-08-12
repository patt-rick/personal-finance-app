import type { HexColor } from "react-native-android-widget";
import { Business } from "../../../types";
import { CASHBOOK_COLORS } from "./palette";
import { CASHBOOK_ICON_NODES } from "./icons.data";

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

export const resolveCashbookIconKey = (
    business: Pick<Business, "icon">,
): string => {
    if (business.icon && business.icon in CASHBOOK_ICON_NODES) {
        return business.icon;
    }
    return DEFAULT_CASHBOOK_ICON;
};

// Produce an #AARRGGBB color from a 6- or 8-digit hex, using the last 6 digits.
export const withAlpha = (hex: string, alpha2: string): HexColor =>
    `#${alpha2}${hex.slice(-6)}` as HexColor;

// Pick a foreground (text/icon) color that stays legible on a solid `hex` fill,
// using the perceived-brightness (YIQ) threshold so arbitrary accent colors get
// dark text on light fills and white text on dark fills.
export const readableOn = (hex: string): HexColor => {
    const c = hex.slice(-6);
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness >= 150 ? "#1A1A1A" : "#FFFFFF";
};
