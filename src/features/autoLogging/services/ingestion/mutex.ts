const chains = new Map<string, Promise<unknown>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prior = chains.get(key);
    const wait = prior ? prior.catch(() => {}) : Promise.resolve();
    const current = wait.then(fn);
    chains.set(key, current);
    try {
        return await current;
    } finally {
        if (chains.get(key) === current) {
            chains.delete(key);
        }
    }
}

export function _resetLocksForTests(): void {
    chains.clear();
}
