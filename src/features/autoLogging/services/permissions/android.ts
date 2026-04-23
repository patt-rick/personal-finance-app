import { Alert } from "react-native";

export async function ensureSmsPermission(): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            "SMS Permission",
            "Finance Tracker needs permission to read your incoming SMS so it can parse bank and mobile-money alerts. Nothing is uploaded — messages are parsed on-device and stored only alongside your transactions.",
            [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Grant", onPress: () => resolve(true) },
            ],
        );
    });
}

export async function ensureNotificationListenerAccess(): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            "Notification Access",
            "Finance Tracker needs Notification Access to read posted notifications from your allowed apps. The next update will open Android's Notification Access settings so you can flip it on.",
            [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Continue", onPress: () => resolve(true) },
            ],
        );
    });
}
