import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const MESSAGES = [
    {
        title: "Hey Big Spender! 💸",
        body: "Time to track those digits! Don't let your wallet down.",
    },
    {
        title: "Your Wallet is Calling! 📞",
        body: "It misses you... and your entries. Log your spending now!",
    },
    {
        title: "Don't Go Broke in Secret! 🕵️‍♂️",
        body: "Tell me where the money went! I promise I won't tell anyone.",
    },
    {
        title: "Money Tree Check-in! 🌱",
        body: "Money doesn't grow on trees, but your entries help your savings grow! Plant one now.",
    },
    {
        title: "Financial Fitness Time! 💪",
        body: "Flex those fingers and log an entry. Your bank account will thank you!",
    },
    {
        title: "Cha-Ching! or Ka-Plow? 💥",
        body: "Did you spend or did you save? Either way, let's write it down!",
    },
    {
        title: "Detective Mode: ON! 🔍",
        body: "Let's investigate where that coffee money went. Log it before you forget!",
    },
];

export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === "granted";
}

export async function scheduleReminders() {
    // Cancel all existing notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const isGranted = await requestNotificationPermissions();
    if (!isGranted) {
        console.log("Notification permissions not granted");
        return;
    }

    // Set up morning reminder (9:00 AM)
    await Notifications.scheduleNotificationAsync({
        content: getRandomMessage(),
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
        },
    });

    // Set up evening reminder (8:00 PM)
    await Notifications.scheduleNotificationAsync({
        content: getRandomMessage(),
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 20,
            minute: 0,
        },
    });

    console.log("Notifications scheduled successfully");
}

function getRandomMessage() {
    const index = Math.floor(Math.random() * MESSAGES.length);
    return MESSAGES[index];
}

// Initial configuration
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});
