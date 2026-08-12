import {
    appAlert,
    currentDialog,
    dismissCurrentDialog,
    inferTone,
    normalizeButtons,
    resetDialogsForTest,
    subscribeDialogs,
} from "../../src/components/dialog/appAlert";

beforeEach(() => {
    resetDialogsForTest();
});

describe("normalizeButtons", () => {
    it("defaults to a single OK button when omitted or empty", () => {
        expect(normalizeButtons(undefined)).toEqual([{ text: "OK" }]);
        expect(normalizeButtons([])).toEqual([{ text: "OK" }]);
    });

    it("returns given buttons unchanged", () => {
        const buttons = [{ text: "Cancel", style: "cancel" as const }, { text: "Delete" }];
        expect(normalizeButtons(buttons)).toBe(buttons);
    });
});

describe("inferTone", () => {
    it("is destructive when any button is destructive", () => {
        expect(
            inferTone("Delete Debt", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive" },
            ]),
        ).toBe("destructive");
    });

    it("is destructive for Error/Failed titles", () => {
        expect(inferTone("Error", [{ text: "OK" }])).toBe("destructive");
        expect(inferTone("Import Failed", [{ text: "OK" }])).toBe("destructive");
    });

    it("is success for Success titles", () => {
        expect(inferTone("Success", [{ text: "OK" }])).toBe("success");
    });

    it("is warning for multi-button confirmations", () => {
        expect(
            inferTone("Mark Settled", [{ text: "Cancel", style: "cancel" }, { text: "Settle" }]),
        ).toBe("warning");
    });

    it("falls back to info", () => {
        expect(inferTone("Tours Reset", [{ text: "OK" }])).toBe("info");
    });

    it("explicit tone override wins", () => {
        expect(inferTone("Error", [{ text: "OK" }], "info")).toBe("info");
    });
});

describe("appAlert queue", () => {
    it("shows requests one at a time in FIFO order", () => {
        appAlert("First");
        appAlert("Second");
        expect(currentDialog()?.title).toBe("First");
        dismissCurrentDialog();
        expect(currentDialog()?.title).toBe("Second");
        dismissCurrentDialog();
        expect(currentDialog()).toBeNull();
    });

    it("notifies the subscriber on push and dismiss", () => {
        const seen: (string | null)[] = [];
        subscribeDialogs(() => seen.push(currentDialog()?.title ?? null));
        appAlert("Hello");
        dismissCurrentDialog();
        expect(seen).toEqual([null, "Hello", null]);
    });

    it("builds the request with defaults and options", () => {
        appAlert("Delete Debt", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive" },
        ]);
        const req = currentDialog();
        expect(req?.message).toBe("Are you sure?");
        expect(req?.cancelable).toBe(true);
        expect(req?.tone).toBe("destructive");

        dismissCurrentDialog();
        const onDismiss = jest.fn();
        appAlert("Heads up", undefined, undefined, { cancelable: false, onDismiss, tone: "warning" });
        const req2 = currentDialog();
        expect(req2?.buttons).toEqual([{ text: "OK" }]);
        expect(req2?.cancelable).toBe(false);
        expect(req2?.onDismiss).toBe(onDismiss);
        expect(req2?.tone).toBe("warning");
    });
});
