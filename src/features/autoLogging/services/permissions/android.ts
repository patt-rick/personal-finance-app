import { PermissionsAndroid, Platform } from "react-native";
import { appAlert } from "../../../../components/dialog";
import { autoLogNative } from "../ingestion/nativeBridge";

export async function ensureSmsPermission(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
        const results = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        ]);
        const read = results[PermissionsAndroid.PERMISSIONS.READ_SMS];
        const receive = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];
        return (
            read === PermissionsAndroid.RESULTS.GRANTED &&
            receive === PermissionsAndroid.RESULTS.GRANTED
        );
    } catch {
        return false;
    }
}

export async function hasSmsPermission(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
        const [read, receive] = await Promise.all([
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS),
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS),
        ]);
        return read && receive;
    } catch {
        return false;
    }
}

export async function ensurePostNotificationsPermission(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    if (Platform.Version < 33) return true;
    try {
        const perm = (PermissionsAndroid.PERMISSIONS as Record<string, string>).POST_NOTIFICATIONS;
        if (!perm) return true;
        const result = await PermissionsAndroid.request(perm as never);
        return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
        return false;
    }
}

export async function hasNotificationListenerAccess(): Promise<boolean> {
    return autoLogNative.hasNotificationListenerAccess();
}

export async function ensureNotificationListenerAccess(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    const granted = await hasNotificationListenerAccess();
    if (granted) return true;
    return new Promise<boolean>((resolve) => {
        appAlert(
            "Notification Access",
            "Expense Tracker needs Notification Access to capture financial notifications. You will be taken to Android settings — flip the switch for Expense Tracker, then come back.",
            [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                {
                    text: "Open Settings",
                    onPress: async () => {
                        try {
                            await autoLogNative.openNotificationAccessSettings();
                        } catch {
                            // swallow — user will see no movement and can try again
                        }
                        resolve(false);
                    },
                },
            ],
        );
    });
}
