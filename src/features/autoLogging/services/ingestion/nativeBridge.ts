import { DeviceEventEmitter, EmitterSubscription, NativeModules, Platform } from "react-native";
import { RawEvent } from "../../types";

const RAW_EVENT = "AutoLog:RawEvent";

interface NativeAutoLogModule {
    isEnabled(): Promise<boolean>;
    setEnabled(enabled: boolean): Promise<void>;
    setCaptureSms(enabled: boolean): Promise<void>;
    setCaptureNotifications(enabled: boolean): Promise<void>;
    setAllowedPackages(values: string[]): Promise<void>;
    setAllowedSenders(values: string[]): Promise<void>;
    drainQueue(): Promise<NativeRawEvent[]>;
    clearQueue(ids: string[]): Promise<void>;
    openNotificationAccessSettings(): Promise<void>;
    hasNotificationListenerAccess(): Promise<boolean>;
    getInstalledApps(): Promise<Array<{ packageName: string; label: string }>>;
    openAppNotificationSettings(): Promise<void>;
}

interface NativeRawEvent {
    id: string;
    source: "sms" | "notification";
    packageName: string | null;
    sender: string | null;
    title: string | null;
    body: string;
    timestamp: number;
    rawHash: string;
}

const nativeModule: NativeAutoLogModule | null =
    Platform.OS === "android" ? (NativeModules.AutoLogModule ?? null) : null;

function requireModule(): NativeAutoLogModule | null {
    return nativeModule;
}

function toRawEvent(ev: NativeRawEvent): RawEvent {
    return {
        id: ev.id,
        source: ev.source,
        packageName: ev.packageName ?? undefined,
        sender: ev.sender ?? undefined,
        title: ev.title ?? undefined,
        body: ev.body,
        timestamp: ev.timestamp,
        rawHash: ev.rawHash,
    };
}

export const autoLogNative = {
    isAvailable(): boolean {
        return nativeModule !== null;
    },

    async isEnabled(): Promise<boolean> {
        const mod = requireModule();
        if (!mod) return false;
        try {
            return await mod.isEnabled();
        } catch {
            return false;
        }
    },

    async setEnabled(enabled: boolean): Promise<void> {
        const mod = requireModule();
        if (!mod) return;
        await mod.setEnabled(enabled);
    },

    async setCaptureSms(enabled: boolean): Promise<void> {
        const mod = requireModule();
        if (!mod) return;
        await mod.setCaptureSms(enabled);
    },

    async setCaptureNotifications(enabled: boolean): Promise<void> {
        const mod = requireModule();
        if (!mod) return;
        await mod.setCaptureNotifications(enabled);
    },

    async setAllowedPackages(values: string[]): Promise<void> {
        const mod = requireModule();
        if (!mod) return;
        await mod.setAllowedPackages(values);
    },

    async setAllowedSenders(values: string[]): Promise<void> {
        const mod = requireModule();
        if (!mod) return;
        await mod.setAllowedSenders(values);
    },

    async drainQueue(): Promise<RawEvent[]> {
        const mod = requireModule();
        if (!mod) return [];
        try {
            const events = await mod.drainQueue();
            return events.map(toRawEvent);
        } catch {
            return [];
        }
    },

    async clearQueue(ids: string[]): Promise<void> {
        const mod = requireModule();
        if (!mod || ids.length === 0) return;
        await mod.clearQueue(ids);
    },

    async hasNotificationListenerAccess(): Promise<boolean> {
        const mod = requireModule();
        if (!mod) return false;
        try {
            return await mod.hasNotificationListenerAccess();
        } catch {
            return false;
        }
    },

    async openNotificationAccessSettings(): Promise<void> {
        const mod = requireModule();
        if (!mod) return;
        await mod.openNotificationAccessSettings();
    },

    async openAppNotificationSettings(): Promise<void> {
        const mod = requireModule();
        if (!mod) return;
        await mod.openAppNotificationSettings();
    },

    async getInstalledApps(): Promise<Array<{ packageName: string; label: string }>> {
        const mod = requireModule();
        if (!mod) return [];
        try {
            return await mod.getInstalledApps();
        } catch {
            return [];
        }
    },

    subscribe(listener: (event: RawEvent) => void): EmitterSubscription {
        return DeviceEventEmitter.addListener(RAW_EVENT, (payload: NativeRawEvent) => {
            listener(toRawEvent(payload));
        });
    },
};
