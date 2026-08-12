import type { IconNode } from "lucide-react-native";
import { CASHBOOK_ICON_NODES } from "./icons.data";
import { resolveCashbookIconKey } from "./resolve";

// Rebuild the exact Lucide SVG wrapper so the widget glyph matches the app's
// <Icon> component. Lucide markup uses stroke="currentColor", which does not
// resolve inside SvgWidget, so callers pass an explicit hex stroke.
export const iconNodeToSvg = (
    nodes: IconNode,
    stroke: string,
    size = 24,
): string => {
    const inner = nodes
        .map(([tag, attrs]) => {
            const a = Object.entries(attrs)
                .filter(([k]) => k !== "key")
                .map(([k, v]) => `${k}="${v}"`)
                .join(" ");
            return `<${tag} ${a} />`;
        })
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
};

export const cashbookIconSvg = (
    iconKey: string,
    stroke: string,
    size = 24,
): string => {
    const key = resolveCashbookIconKey({ icon: iconKey });
    return iconNodeToSvg(CASHBOOK_ICON_NODES[key], stroke, size);
};
