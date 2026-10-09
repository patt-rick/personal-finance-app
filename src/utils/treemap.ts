export interface TreemapRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const EMPTY: TreemapRect = { x: 0, y: 0, width: 0, height: 0 };

/**
 * Squarified treemap (Bruls, Huizing & van Wijk): each value gets a tile whose area is its share of `width × height`,
 * laid out row by row so tiles stay as close to square as possible. Expects values sorted largest first; the result
 * keeps the input order.
 */
export function layoutTreemap(values: number[], width: number, height: number): TreemapRect[] {
    const result: TreemapRect[] = values.map(() => EMPTY);
    const total = values.reduce((sum, v) => sum + Math.max(v, 0), 0);
    if (total <= 0 || width <= 0 || height <= 0) return result;

    const scale = (width * height) / total;
    const items = values.map((v, index) => ({ index, area: Math.max(v, 0) * scale })).filter((i) => i.area > 0);

    let box = { x: 0, y: 0, width, height };
    let row: typeof items = [];

    const worst = (candidate: typeof items, side: number) => {
        const sum = candidate.reduce((s, i) => s + i.area, 0);
        const max = Math.max(...candidate.map((i) => i.area));
        const min = Math.min(...candidate.map((i) => i.area));
        return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
    };

    const placeRow = () => {
        const sum = row.reduce((s, i) => s + i.area, 0);
        const horizontal = box.width >= box.height;
        const thickness = sum / (horizontal ? box.height : box.width);
        let offset = 0;
        for (const item of row) {
            const length = item.area / thickness;
            result[item.index] = horizontal
                ? { x: box.x, y: box.y + offset, width: thickness, height: length }
                : { x: box.x + offset, y: box.y, width: length, height: thickness };
            offset += length;
        }
        box = horizontal
            ? { x: box.x + thickness, y: box.y, width: box.width - thickness, height: box.height }
            : { x: box.x, y: box.y + thickness, width: box.width, height: box.height - thickness };
        row = [];
    };

    for (const item of items) {
        const side = Math.min(box.width, box.height);
        if (row.length === 0 || worst([...row, item], side) <= worst(row, side)) {
            row.push(item);
        } else {
            placeRow();
            row.push(item);
        }
    }
    if (row.length > 0) placeRow();
    return result;
}
