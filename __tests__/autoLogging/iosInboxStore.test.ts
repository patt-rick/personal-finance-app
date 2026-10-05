const mockFs = new Map<string, string>();
const mockDirs = new Set<string>();
const mockPlatform = { OS: "ios", Version: "17.4" };
let mockContainers: Record<string, unknown> = {};

jest.mock("react-native", () => ({ Platform: mockPlatform }));

jest.mock("expo-file-system", () => {
    const join = (parts: any[]) => parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    class Directory {
        uri: string;
        constructor(...parts: any[]) {
            this.uri = join(parts);
        }
        get name() {
            return this.uri.split("/").pop()!;
        }
        get exists() {
            return mockDirs.has(this.uri);
        }
        create() {
            mockDirs.add(this.uri);
        }
        list() {
            const prefix = this.uri + "/";
            const files = [...mockFs.keys()]
                .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
                .map((k) => new File(k));
            const dirs = [...mockDirs]
                .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
                .map((k) => new Directory(k));
            return [...files, ...dirs];
        }
    }
    class File {
        uri: string;
        constructor(...parts: any[]) {
            this.uri = join(parts);
        }
        get name() {
            return this.uri.split("/").pop()!;
        }
        get exists() {
            return mockFs.has(this.uri);
        }
        async text() {
            return mockFs.get(this.uri)!;
        }
        write(content: string) {
            mockFs.set(this.uri, content);
        }
        delete() {
            mockFs.delete(this.uri);
        }
    }
    return {
        Directory,
        File,
        Paths: {
            get appleSharedContainers() {
                return mockContainers;
            },
        },
    };
});

import { Directory } from "expo-file-system";
import {
    clearInbox,
    getLastCapture,
    isInboxAvailable,
    readInbox,
    setInboxCaptureEnabled,
} from "../../src/features/autoLogging/services/ingestion/iosInbox/inboxStore";

const GROUP = "group.com.patrickackom.financetracker";
const INBOX = "/group/autolog/inbox";
const ID_A = "AAAAAAAA-0000-0000-0000-000000000001";
const ID_B = "BBBBBBBB-0000-0000-0000-000000000002";

function entry(id: string, body: string, timestamp: number): string {
    return JSON.stringify({ v: 1, id, sender: "MobileMoney", body, timestamp });
}

beforeEach(() => {
    mockFs.clear();
    mockDirs.clear();
    mockPlatform.OS = "ios";
    mockPlatform.Version = "17.4";
    mockContainers = { [GROUP]: new Directory("/group") };
    mockDirs.add("/group").add("/group/autolog").add(INBOX);
});

describe("iOS inbox store", () => {
    it("reads valid entries oldest first, ignoring temp files and folders", async () => {
        mockFs.set(`${INBOX}/${ID_B}.json`, entry(ID_B, "GHS 2 paid", 2000));
        mockFs.set(`${INBOX}/${ID_A}.json`, entry(ID_A, "GHS 1 paid", 1000));
        mockFs.set(`${INBOX}/.${ID_A}.tmp`, "partial");
        mockDirs.add(`${INBOX}/nested.json`);

        const events = await readInbox();
        expect(events.map((e) => [e.id, e.body])).toEqual([
            [ID_A, "GHS 1 paid"],
            [ID_B, "GHS 2 paid"],
        ]);
        expect(mockFs.has(`${INBOX}/.${ID_A}.tmp`)).toBe(true);
    });

    it("deletes unparseable entries instead of returning them", async () => {
        mockFs.set(`${INBOX}/${ID_A}.json`, "{broken");
        expect(await readInbox()).toEqual([]);
        expect(mockFs.has(`${INBOX}/${ID_A}.json`)).toBe(false);
    });

    it("uses the file name as the id even if the JSON says otherwise", async () => {
        mockFs.set(`${INBOX}/${ID_A}.json`, entry(ID_B, "GHS 1 paid", 1000));
        expect((await readInbox())[0].id).toBe(ID_A);
    });

    it("clears only the named entries and refuses path-like ids", async () => {
        mockFs.set(`${INBOX}/${ID_A}.json`, entry(ID_A, "a", 1));
        mockFs.set(`${INBOX}/${ID_B}.json`, entry(ID_B, "b", 2));
        mockFs.set("/group/autolog/enabled", "1");
        await clearInbox([ID_A, "../enabled", "../../autolog/enabled"]);
        expect(mockFs.has(`${INBOX}/${ID_A}.json`)).toBe(false);
        expect(mockFs.has(`${INBOX}/${ID_B}.json`)).toBe(true);
        expect(mockFs.has("/group/autolog/enabled")).toBe(true);
    });

    it("creates and removes the capture flag the extension checks", async () => {
        await setInboxCaptureEnabled(true);
        expect(mockFs.get("/group/autolog/enabled")).toBe("1");
        await setInboxCaptureEnabled(false);
        expect(mockFs.has("/group/autolog/enabled")).toBe(false);
    });

    it("reports the last capture and whether the sender came through", async () => {
        expect(await getLastCapture()).toBeNull();
        mockFs.set("/group/autolog/last-capture", JSON.stringify({ at: 1234, hasSender: false }));
        expect(await getLastCapture()).toEqual({ at: 1234, hasSender: false });
        mockFs.set("/group/autolog/last-capture", "garbage");
        expect(await getLastCapture()).toBeNull();
    });

    it("is unavailable without the app group, on iOS 16, or on Android", async () => {
        expect(isInboxAvailable()).toBe(true);

        mockPlatform.Version = "16.7";
        expect(isInboxAvailable()).toBe(false);

        mockPlatform.Version = "17.4";
        mockContainers = {};
        expect(isInboxAvailable()).toBe(false);
        expect(await readInbox()).toEqual([]);

        mockContainers = { [GROUP]: new Directory("/group") };
        mockPlatform.OS = "android";
        expect(isInboxAvailable()).toBe(false);
    });
});
