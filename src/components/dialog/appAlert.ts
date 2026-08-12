export type AppAlertTone = "info" | "success" | "warning" | "destructive";

export type AppAlertButton = {
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
};

export type AppAlertOptions = {
    cancelable?: boolean;
    onDismiss?: () => void;
    tone?: AppAlertTone;
};

export type DialogRequest = {
    title: string;
    message?: string;
    buttons: AppAlertButton[];
    cancelable: boolean;
    onDismiss?: () => void;
    tone: AppAlertTone;
};

export function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
    if (!buttons || buttons.length === 0) return [{ text: "OK" }];
    return buttons;
}

export function inferTone(
    title: string,
    buttons: AppAlertButton[],
    override?: AppAlertTone,
): AppAlertTone {
    if (override) return override;
    if (buttons.some((b) => b.style === "destructive")) return "destructive";
    const lower = title.toLowerCase();
    if (lower.startsWith("error") || lower.includes("failed")) return "destructive";
    if (lower.includes("success")) return "success";
    if (buttons.length >= 2) return "warning";
    return "info";
}

type Listener = () => void;

const queue: DialogRequest[] = [];
let listener: Listener | null = null;

export function appAlert(
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
): void {
    const normalized = normalizeButtons(buttons);
    queue.push({
        title,
        message,
        buttons: normalized,
        cancelable: options?.cancelable !== false,
        onDismiss: options?.onDismiss,
        tone: inferTone(title, normalized, options?.tone),
    });
    listener?.();
}

export function subscribeDialogs(next: Listener): () => void {
    listener = next;
    next();
    return () => {
        if (listener === next) listener = null;
    };
}

export function currentDialog(): DialogRequest | null {
    return queue[0] ?? null;
}

export function dismissCurrentDialog(): void {
    queue.shift();
    listener?.();
}

export function resetDialogsForTest(): void {
    queue.length = 0;
    listener = null;
}
