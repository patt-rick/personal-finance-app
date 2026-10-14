import { Rect } from "./placement";
import { TargetEntry } from "./targetRegistry";

interface Measurable {
    measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
    measureLayout: (
        relativeTo: unknown,
        onSuccess: (x: number, y: number, width: number, height: number) => void,
        onFail?: () => void,
    ) => void;
}

interface Scrollable extends Measurable {
    scrollTo: (options: { y: number; animated: boolean }) => void;
    getInnerViewRef?: () => Measurable | null;
}

const SCROLL_TOP_GAP = 16;
const SETTLE_FRAMES = 8;

const inWindow = (node: Measurable) =>
    new Promise<Rect>((resolve) => node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })));

const within = (node: Measurable, ancestor: Measurable) =>
    new Promise<Rect | null>((resolve) =>
        node.measureLayout(
            ancestor,
            (x, y, width, height) => resolve({ x, y, width, height }),
            () => resolve(null),
        ),
    );

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// A scroll reaches the layout tree a frame or more after scrollTo, so wait until the position has both moved and stopped moving.
async function measureAfterScroll(node: Measurable, before: Rect): Promise<Rect> {
    let last = before;
    for (let frame = 0; frame < SETTLE_FRAMES; frame++) {
        await nextFrame();
        const rect = await inWindow(node);
        if (rect.y !== before.y && rect.y === last.y) return rect;
        last = rect;
    }
    return last;
}

type Band = { top: number; bottom: number };

/**
 * A target needs scrolling when it is not fully inside the band, or when it is but leaves less than `room` (the tooltip card plus
 * its gaps) on both sides, provided scrolling it to the top would make that room.
 */
export function needsScroll(rect: Rect, band: Band, room: number): boolean {
    const bottom = rect.y + rect.height;
    if (rect.y < band.top || bottom > band.bottom) return true;
    const hasRoom = rect.y - band.top >= room || band.bottom - bottom >= room;
    return !hasRoom && SCROLL_TOP_GAP + rect.height + room <= band.bottom - band.top;
}

async function scrollIntoBand(node: Measurable, scroll: Scrollable, rect: Rect, band: Band, room: number) {
    const viewport = await inWindow(scroll);
    const top = Math.max(band.top, viewport.y);
    const bottom = Math.min(band.bottom, viewport.y + viewport.height);
    if (!needsScroll(rect, { top, bottom }, room)) return rect;

    const content = scroll.getInnerViewRef?.();
    if (!content) return rect;
    const [position, contentRect] = await Promise.all([within(node, content), inWindow(content)]);
    if (!position) return rect;

    const maxOffset = Math.max(0, contentRect.height - viewport.height);
    const offset = Math.min(maxOffset, Math.max(0, position.y - (top - viewport.y) - SCROLL_TOP_GAP));
    // Content near the end may already be scrolled as far as it can go.
    if (Math.abs(offset - (viewport.y - contentRect.y)) < 1) return rect;
    scroll.scrollTo({ y: offset, animated: false });
    return measureAfterScroll(node, rect);
}

/**
 * Finds a target's rectangle relative to `root`, scrolling it into the visible band first when it sits in a ScrollView, with
 * `room` px left beside it for the tooltip. Reports null when the element has no size yet. Returns a cancel function.
 */
export function locateTarget(
    entry: TargetEntry,
    root: unknown,
    band: Band,
    room: number,
    onRect: (rect: Rect | null) => void,
): () => void {
    let cancelled = false;

    const run = async () => {
        const node = entry.ref.current as Measurable | null;
        if (!node) return onRect(null);

        let rect = await inWindow(node);
        const scroll = entry.scrollRef?.current as Scrollable | null | undefined;
        if (scroll && rect.width > 0 && rect.height > 0 && !cancelled) {
            rect = await scrollIntoBand(node, scroll, rect, band, room);
        }
        const origin = await inWindow(root as Measurable);
        if (cancelled) return;
        onRect(
            rect.width > 0 && rect.height > 0
                ? { x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height }
                : null,
        );
    };

    run().catch(() => {});
    return () => {
        cancelled = true;
    };
}
