export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Placement {
    top: number;
    left: number;
    /** Arrow centre measured from the card's left edge; null when the card does not point at anything. */
    arrowX: number | null;
    side: "below" | "above" | "over" | "center";
}

const ARROW_INSET = 24;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export function placeTooltip({
    target,
    tooltip,
    screen,
    bounds,
    gap = 12,
    margin = 16,
}: {
    target: Rect | null;
    tooltip: { width: number; height: number };
    screen: { width: number; height: number };
    /** Vertical range the card may occupy. */
    bounds: { top: number; bottom: number };
    gap?: number;
    margin?: number;
}): Placement {
    if (!target) {
        return {
            top: Math.max(bounds.top, (bounds.top + bounds.bottom - tooltip.height) / 2),
            left: (screen.width - tooltip.width) / 2,
            arrowX: null,
            side: "center",
        };
    }

    const centre = target.x + target.width / 2;
    const left = clamp(centre - tooltip.width / 2, margin, Math.max(margin, screen.width - margin - tooltip.width));
    const arrowX = clamp(centre - left, ARROW_INSET, tooltip.width - ARROW_INSET);

    const below = target.y + target.height + gap;
    if (below + tooltip.height <= bounds.bottom) return { top: below, left, arrowX, side: "below" };

    const above = target.y - gap - tooltip.height;
    if (above >= bounds.top) return { top: above, left, arrowX, side: "above" };

    return {
        top: Math.max(bounds.top, bounds.bottom - tooltip.height),
        left,
        arrowX: null,
        side: "over",
    };
}
