import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { appAlert } from "../../../components/dialog";
import { hapticWarning } from "../../../utils/haptics";

const CHANNEL_ID = "budget-alerts";
/** Lets a closing sheet (e.g. quick add) finish first; Android drops a modal opened during another's exit. */
const SHOW_DELAY_MS = 450;
let gateOpen = false;
let queued: string[] = [];

function showInApp(lines: string[]) {
    setTimeout(() => {
        hapticWarning();
        appAlert("Budget alert", lines.join("\n\n"), undefined, { tone: "warning" });
    }, SHOW_DELAY_MS);
}

export function flushQueuedAlerts(): void {
    if (!gateOpen || AppState.currentState !== "active" || queued.length === 0) return;
    const lines = queued;
    queued = [];
    showInApp(lines);
}

/** Closed while the app is loading or locked, so budget amounts never show over the splash or lock screen. */
export function setBudgetAlertGate(open: boolean): void {
    gateOpen = open;
    flushQueuedAlerts();
}

async function notify(lines: string[]): Promise<void> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
            queued.push(...lines);
            return;
        }
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                name: "Budget alerts",
                importance: Notifications.AndroidImportance.HIGH,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
            });
        }
        await Notifications.scheduleNotificationAsync({
            content: { title: "Budget alert", body: lines.join("\n") },
            trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
        });
    } catch {
        queued.push(...lines);
    }
}

export async function deliverAlerts(lines: string[]): Promise<void> {
    if (lines.length === 0) return;
    if (AppState.currentState !== "active") return notify(lines);
    if (!gateOpen) {
        queued.push(...lines);
        return;
    }
    showInApp(lines);
}
