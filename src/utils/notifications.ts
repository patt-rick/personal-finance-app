import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
export type MessageTone = "funny" | "corny" | "gentle" | "motivational" | "time" | "serious";

export interface NotificationMessage {
    tone: MessageTone;
    title: string;
    body: string;
}

export const MESSAGES = [
    // 🎭 Funny / Corny
    {
        tone: "funny",
        title: "Money Teleported 🌀",
        body: "It vanished! Or maybe you spent it. Log it.",
    },
    { tone: "funny", title: "Breaking News 📰", body: "Your wallet demands an update." },
    { tone: "funny", title: "Wallet PTSD 😬", body: "It remembers everything. You should too." },
    { tone: "funny", title: "Snack Attack 🍔", body: "That snack had a price. Write it down." },
    { tone: "funny", title: "Financial Detective 🕵️", body: "Clue #1: You spent money. Log it." },
    { tone: "funny", title: "Oops Budget 🤭", body: "Mistakes were made. Records must be kept." },
    { tone: "funny", title: "Money Said Bye 👋", body: "At least say where it went." },
    { tone: "funny", title: "Plot Twist 💥", body: "That purchase wasn't invisible." },
    { tone: "funny", title: "Wallet Workout 🏋️", body: "Lift one finger. Log it." },
    {
        tone: "funny",
        title: "Corny Alert 🌽",
        body: "Tracking money is nacho problem… unless you skip it.",
    },
    {
        tone: "funny",
        title: "Hey Big Spender! 💸",
        body: "Time to track those digits! Don't let your wallet down.",
    },
    {
        tone: "funny",
        title: "Your Wallet is Calling! 📞",
        body: "It misses you... and your entries. Log your spending now!",
    },
    {
        tone: "funny",
        title: "Don't Go Broke in Secret! 🕵️♂️",
        body: "Tell me where the money went! I promise I won't tell anyone.",
    },
    {
        tone: "funny",
        title: "Money Tree Check-in! 🌱",
        body: "Money doesn't grow on trees, but your entries help your savings grow! Plant one now.",
    },
    {
        tone: "funny",
        title: "Financial Fitness Time! 💪",
        body: "Flex those fingers and log an entry. Your bank account will thank you!",
    },
    {
        tone: "funny",
        title: "Cha-Ching! or Ka-Plow? 💥",
        body: "Did you spend or did you save? Either way, let's write it down!",
    },
    {
        tone: "funny",
        title: "Detective Mode: ON! 🔍",
        body: "Let's investigate where that coffee money went. Log it before you forget!",
    },

    // 😂 Extra corny
    { tone: "corny", title: "No Entry? No Peace 😌", body: "Your wallet likes closure." },
    { tone: "corny", title: "Cash With Feelings 🥹", body: "It wants to be remembered." },
    { tone: "corny", title: "Money Diary 📖", body: "Dear diary… today I was spent." },
    { tone: "corny", title: "Cha-Ching Therapy 💬", body: "Talk to me. Where did it go?" },
    { tone: "corny", title: "Wallet Horoscope 🔮", body: "Today predicts… logging expenses." },

    // 🧠 Smart / Gentle
    { tone: "gentle", title: "Quick Check 👀", body: "A few seconds keeps things clear." },
    { tone: "gentle", title: "Just a Reminder ✨", body: "Log your recent spending." },
    { tone: "gentle", title: "Staying Aware 🧭", body: "Awareness starts with one entry." },
    { tone: "gentle", title: "Friendly Nudge 🤍", body: "Nothing fancy. Just log it." },
    { tone: "gentle", title: "Consistency Wins 🏆", body: "One entry at a time." },

    // 💪 Motivational
    { tone: "motivational", title: "You're Building Control 💼", body: "Log today. Win tomorrow." },
    { tone: "motivational", title: "Small Habit, Big Results 📈", body: "Add that entry." },
    { tone: "motivational", title: "Future You Approves 👍", body: "Tracking pays off." },
    { tone: "motivational", title: "Discipline > Guessing 🎯", body: "Write it down." },
    { tone: "motivational", title: "Progress Mode: ON 🚀", body: "Keep the streak alive." },

    // 🕒 Time-based
    { tone: "time", title: "Before You Forget ⏰", body: "Log it now." },
    { tone: "time", title: "End-of-Day Check 🌙", body: "Wrap up today’s spending." },
    { tone: "time", title: "Quick Tap ✔️", body: "Takes less than a minute." },
    { tone: "time", title: "Still Fresh 🧠", body: "That expense is easy to remember now." },
    { tone: "time", title: "Last Call 📣", body: "Any spending to log?" },

    // 🧾 Serious / Minimal
    { tone: "serious", title: "Expense Reminder", body: "Record recent transactions." },
    { tone: "serious", title: "Spending Log", body: "Update your records." },
    { tone: "serious", title: "Daily Finance Check", body: "Log any expenses." },
    { tone: "serious", title: "Financial Entry Needed", body: "Add your latest spend." },
    { tone: "serious", title: "Tracking Reminder", body: "Keep your data accurate." },
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

export async function sendTestNotification() {
    const isGranted = await requestNotificationPermissions();
    if (!isGranted) {
        alert("Notification permissions not granted!");
        return;
    }

    await Notifications.scheduleNotificationAsync({
        content: getRandomMessage(),
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(Date.now() + 1000), // 1 second from now
        },
    });
}
const TONE_ROTATION: readonly MessageTone[] = [
    "funny",
    "gentle",
    "motivational",
    "corny",
    "serious",
    "time",
];

type MessagesByTone = Record<MessageTone, NotificationMessage[]>;

const messagesByTone = (MESSAGES as NotificationMessage[]).reduce<MessagesByTone>(
    (acc, msg) => {
        acc[msg.tone].push(msg);
        return acc;
    },
    {
        funny: [],
        corny: [],
        gentle: [],
        motivational: [],
        time: [],
        serious: [],
    },
);

let toneIndex = 0;
let messageIndexMap: { [tone: string]: number } = {};

export function getRandomMessage(): NotificationMessage {
    const tone = TONE_ROTATION[toneIndex % TONE_ROTATION.length];
    const list = messagesByTone[tone];

    if (!list.length) {
        toneIndex++;
        return getRandomMessage();
    }

    const index = messageIndexMap[tone] ?? 0;
    const message = list[index % list.length];

    messageIndexMap[tone] = index + 1;
    toneIndex++;

    return message;
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
