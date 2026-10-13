import { TargetId } from "./types";

export interface TargetEntry {
    ref: { current: unknown };
    scrollRef?: { current: unknown };
}

const targets = new Map<TargetId, TargetEntry>();
const listeners = new Set<() => void>();

export function notifyTargetChanged(): void {
    listeners.forEach((listener) => listener());
}

export function registerTarget(id: TargetId, entry: TargetEntry): () => void {
    targets.set(id, entry);
    notifyTargetChanged();
    return () => {
        if (targets.get(id) !== entry) return;
        targets.delete(id);
        notifyTargetChanged();
    };
}

/** A target counts only while its element is actually mounted; components that render nothing leave the ref empty. */
export function getTarget(id: TargetId): TargetEntry | null {
    const entry = targets.get(id);
    return entry && entry.ref.current != null ? entry : null;
}

export function isRegistered(id: TargetId): boolean {
    return getTarget(id) !== null;
}

export function subscribeTargets(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function resetTargetsForTest(): void {
    targets.clear();
    listeners.clear();
}
