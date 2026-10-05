import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { RawEvent } from "../../../types";
import {
    AUTOLOG_APP_GROUP,
    ENABLED_FLAG_FILE,
    INBOX_DIR,
    INBOX_FILE_RE,
    INBOX_ID_RE,
    INBOX_ROOT_DIR,
    LAST_CAPTURE_FILE,
} from "./constants";
import { parseInboxEntry } from "./parseInboxEntry";

// The Shortcuts automation that feeds the inbox can run immediately only from iOS 17.
const MIN_IOS_MAJOR = 17;

export interface LastCapture {
    at: number;
    hasSender: boolean;
}

export function isSupportedIosVersion(): boolean {
    return Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= MIN_IOS_MAJOR;
}

function rootDir(): Directory | null {
    if (Platform.OS !== "ios") return null;
    try {
        const container = Paths.appleSharedContainers[AUTOLOG_APP_GROUP];
        return container ? new Directory(container, INBOX_ROOT_DIR) : null;
    } catch {
        return null;
    }
}

function inboxDir(root: Directory): Directory {
    return new Directory(root, INBOX_DIR);
}

export function isInboxAvailable(): boolean {
    return isSupportedIosVersion() && rootDir() !== null;
}

export async function readInbox(): Promise<RawEvent[]> {
    const root = rootDir();
    if (!root) return [];
    try {
        const dir = inboxDir(root);
        if (!dir.exists) return [];
        const events: RawEvent[] = [];
        for (const entry of dir.list()) {
            if (!INBOX_FILE_RE.test(entry.name) || !(entry instanceof File)) continue;
            const parsed = parseInboxEntry(await entry.text());
            const id = entry.name.slice(0, -".json".length);
            if (!parsed) {
                safeDelete(entry);
                continue;
            }
            // The file name, not the JSON, is the id clearInbox deletes by.
            events.push({ ...parsed, id });
        }
        return events.sort((a, b) => a.timestamp - b.timestamp);
    } catch {
        return [];
    }
}

export async function clearInbox(ids: string[]): Promise<void> {
    const root = rootDir();
    if (!root) return;
    const dir = inboxDir(root);
    for (const id of ids) {
        if (!INBOX_ID_RE.test(id)) continue;
        safeDelete(new File(dir, `${id}.json`));
    }
}

export async function setInboxCaptureEnabled(enabled: boolean): Promise<void> {
    const root = rootDir();
    if (!root) return;
    try {
        const flag = new File(root, ENABLED_FLAG_FILE);
        if (enabled) {
            root.create({ intermediates: true, idempotent: true });
            if (!flag.exists) flag.write("1");
        } else {
            safeDelete(flag);
        }
    } catch {
        // the extension then simply keeps its previous state
    }
}

export async function getLastCapture(): Promise<LastCapture | null> {
    const root = rootDir();
    if (!root) return null;
    try {
        const file = new File(root, LAST_CAPTURE_FILE);
        if (!file.exists) return null;
        const raw = JSON.parse(await file.text()) as Partial<LastCapture>;
        if (typeof raw.at !== "number" || !Number.isFinite(raw.at)) return null;
        return { at: raw.at, hasSender: raw.hasSender === true };
    } catch {
        return null;
    }
}

function safeDelete(file: File): void {
    try {
        if (file.exists) file.delete();
    } catch {
        // a file we cannot delete is re-read and re-deduped on the next drain
    }
}
