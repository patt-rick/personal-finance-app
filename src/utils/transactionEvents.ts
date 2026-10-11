import { Transaction } from "../types";

type Listener = (prev: Transaction[], next: Transaction[]) => void;

const listeners = new Set<Listener>();

export function onTransactionsSaved(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function emitTransactionsSaved(prev: Transaction[], next: Transaction[]): void {
    listeners.forEach((listener) => {
        try {
            listener(prev, next);
        } catch (error) {
            console.error("Transactions-saved listener failed:", error);
        }
    });
}
