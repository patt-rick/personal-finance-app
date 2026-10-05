import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AppState,
    BackHandler,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { appAlert } from "../../../components/dialog";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ArrowLeft,
    Bell,
    FlaskConical,
    Inbox,
    Lock,
    MessageSquare,
    Radio,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Zap,
} from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import AutoLogToggleRow from "../components/AutoLogToggleRow";
import AllowedAppsSelector from "../components/AllowedAppsSelector";
import AutoLogStatsCard from "../components/AutoLogStatsCard";
import { CurrencyRow, NavRow, SectionLabel } from "../components/AutoLogRows";
import PasteSmsRow from "../components/PasteSmsRow";
import PrivacyModal from "../components/PrivacyModal";
import { useAutoLogSettings } from "../hooks/useAutoLogSettings";
import { loadReviewQueue } from "../services/persistence/reviewQueue";
import { loadAutoLogStats, resetAutoLogStats } from "../services/persistence/stats";
import { seedSampleEvents } from "../services/ingestion/devSeed";
import { migrateDefaultCurrencyIfNeeded } from "../services/migration/defaultCurrency";
import {
    ensureNotificationListenerAccess,
    ensureSmsPermission,
} from "../services/permissions/android";
import { autoLogNative } from "../services/ingestion/nativeBridge";
import { AutoLogStats } from "../types";
import SenderMappingsScreen from "./SenderMappingsScreen";
import ReviewQueueScreen from "./ReviewQueueScreen";
import IosShortcutSetupScreen from "./IosShortcutSetupScreen";
import { getTimeAgo } from "../../../utils/_helpers";
import { LastCapture } from "../services/ingestion/iosInbox/inboxStore";
import { FLOATING_TAB_HEIGHT } from "../../../components/FloatingTabBar";

interface Props {
    businesses: Business[];
    onBack: () => void;
    onDataChanged?: () => Promise<void> | void;
}

const IS_IOS = Platform.OS === "ios";

function alertCaptureUnavailable(): boolean {
    if (IS_IOS && !autoLogNative.isAvailable()) {
        appAlert(
            "Needs the App Store version",
            "SMS logging on iPhone needs iOS 17 or later and the Expense Tracker app from the App Store or TestFlight. You can still copy an SMS and use Paste an SMS.",
        );
        return true;
    }
    if (!autoLogNative.isAvailable()) {
        appAlert(
            "Full app required",
            "This preview (Expo Go) can't capture SMS or notifications. Automatic Logging works in the installed app from the Play Store or a development build.",
        );
        return true;
    }
    return false;
}

export default function AutoLogSettingsScreen({ businesses, onBack, onDataChanged }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const { settings, loading, update } = useAutoLogSettings();
    const [showMappings, setShowMappings] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [showPackages, setShowPackages] = useState(false);
    const [showSenders, setShowSenders] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showIosSetup, setShowIosSetup] = useState(false);
    const [lastCapture, setLastCapture] = useState<LastCapture | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [stats, setStats] = useState<AutoLogStats | null>(null);

    const captureActive = settings.captureSms || settings.captureNotifications;

    useEffect(() => {
        if (loading) return;
        if (settings.enabled !== captureActive) {
            update({ enabled: captureActive });
        }
    }, [loading, settings.enabled, captureActive, update]);

    const refreshPendingCount = useCallback(async () => {
        const queue = await loadReviewQueue();
        setPendingCount(queue.length);
    }, []);

    const refreshStats = useCallback(async () => {
        const s = await loadAutoLogStats();
        setStats(s);
    }, []);

    useEffect(() => {
        refreshPendingCount();
        refreshStats();
    }, [refreshPendingCount, refreshStats, showReview]);

    useEffect(() => {
        if (!IS_IOS || showIosSetup) return;
        const refresh = () => {
            autoLogNative.getLastCapture().then(setLastCapture).catch(() => {});
        };
        refresh();
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") refresh();
        });
        return () => sub.remove();
    }, [showIosSetup]);

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            if (showIosSetup) {
                setShowIosSetup(false);
                return true;
            }
            if (showPrivacy) {
                setShowPrivacy(false);
                return true;
            }
            if (showMappings) {
                setShowMappings(false);
                return true;
            }
            if (showReview) {
                setShowReview(false);
                return true;
            }
            if (showPackages || showSenders) {
                setShowPackages(false);
                setShowSenders(false);
                return true;
            }
            onBack();
            return true;
        });
        return () => sub.remove();
    }, [showMappings, showReview, showPackages, showSenders, showPrivacy, showIosSetup, onBack]);

    useEffect(() => {
        if (loading || !captureActive || Platform.OS !== "android" || !autoLogNative.isAvailable()) {
            return;
        }
        autoLogNative.setAllowedPackages(settings.allowedPackages).catch(() => {});
        autoLogNative.setAllowedSenders(settings.allowedSenders).catch(() => {});
    }, [loading, captureActive, settings.allowedPackages, settings.allowedSenders]);

    useEffect(() => {
        if (loading || !autoLogNative.isAvailable()) return;
        const reconcile = async () => {
            try {
                await autoLogNative.setEnabled(captureActive);
                await autoLogNative.setCaptureSms(settings.captureSms);
                await autoLogNative.setCaptureNotifications(settings.captureNotifications);
            } catch {
                // native bridge will surface errors to callers via promise rejection
            }
        };
        reconcile();
    }, [loading, captureActive, settings.captureSms, settings.captureNotifications]);

    const handleCaptureSms = useCallback(
        async (next: boolean) => {
            if (next) {
                if (alertCaptureUnavailable()) return;
                const granted = IS_IOS || (await ensureSmsPermission());
                if (!granted) return;
                if (!captureActive) {
                    try {
                        await migrateDefaultCurrencyIfNeeded(businesses);
                    } catch {
                        // migration is best-effort
                    }
                }
            }
            const enabled = next || settings.captureNotifications;
            await update({ captureSms: next, enabled });
            if (next && IS_IOS) setShowIosSetup(true);
        },
        [update, captureActive, businesses, settings.captureNotifications],
    );

    const handleCaptureNotifications = useCallback(
        async (next: boolean) => {
            if (next) {
                if (alertCaptureUnavailable()) return;
                const granted = await ensureNotificationListenerAccess();
                if (!granted) return;
                if (!captureActive) {
                    try {
                        await migrateDefaultCurrencyIfNeeded(businesses);
                    } catch {
                        // migration is best-effort
                    }
                }
            }
            const enabled = next || settings.captureSms;
            await update({ captureNotifications: next, enabled });
        },
        [update, captureActive, businesses, settings.captureSms],
    );

    const handleDataLogged = useCallback(() => {
        refreshPendingCount();
        refreshStats();
        onDataChanged?.();
    }, [refreshPendingCount, refreshStats, onDataChanged]);

    const handleResetStats = useCallback(async () => {
        await resetAutoLogStats();
        await refreshStats();
    }, [refreshStats]);

    const handleSeed = useCallback(async () => {
        const result = await seedSampleEvents(settings);
        await refreshPendingCount();
        await refreshStats();
        await onDataChanged?.();
        appAlert(
            "Seeded sample events",
            `Attempted ${result.attempted}. Saved ${result.saved}, queued ${result.queued}, filtered ${result.filtered}, dropped ${result.dropped}.`,
        );
    }, [settings, refreshPendingCount, refreshStats, onDataChanged]);

    if (showIosSetup) {
        return <IosShortcutSetupScreen onBack={() => setShowIosSetup(false)} />;
    }

    if (showMappings) {
        return <SenderMappingsScreen businesses={businesses} onBack={() => setShowMappings(false)} />;
    }

    if (showReview) {
        return (
            <ReviewQueueScreen
                businesses={businesses}
                onBack={() => setShowReview(false)}
                onConfirmed={() => {
                    refreshPendingCount();
                    onDataChanged?.();
                }}
            />
        );
    }

    if (loading) {
        return <View style={styles.container} />;
    }

    const iosSetupSubtitle = lastCapture
        ? `Last SMS ${getTimeAgo(new Date(lastCapture.at).toISOString())}`
        : "Connect the Shortcuts automation";

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
                    <ArrowLeft size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Automatic Logging</Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 20) + FLOATING_TAB_HEIGHT + 24,
                    paddingHorizontal: 20,
                }}
                showsVerticalScrollIndicator={false}
            >
                <SectionLabel label="Capture Sources" />
                <View style={styles.groupCard}>
                    <AutoLogToggleRow
                        icon={<MessageSquare size={18} color={theme.colors.onPrimaryContainer} />}
                        iconBg={theme.colors.primaryContainer}
                        title="SMS"
                        subtitle={IS_IOS ? "Logged through a Shortcuts automation" : "Read financial SMS messages"}
                        value={settings.captureSms}
                        onValueChange={handleCaptureSms}
                    />
                    {IS_IOS ? (
                        <NavRow
                            icon={<Smartphone size={18} color={theme.colors.onPrimaryContainer} />}
                            iconBg={theme.colors.primaryContainer}
                            title="iPhone setup"
                            subtitle={iosSetupSubtitle}
                            onPress={() => setShowIosSetup(true)}
                        />
                    ) : (
                        <AutoLogToggleRow
                            icon={<Bell size={18} color={theme.colors.onPrimaryContainer} />}
                            iconBg={theme.colors.primaryContainer}
                            title="Notifications"
                            subtitle="Capture posted notifications"
                            value={settings.captureNotifications}
                            onValueChange={handleCaptureNotifications}
                        />
                    )}
                    <PasteSmsRow onLogged={handleDataLogged} last />
                </View>

                <SectionLabel label="Routing" />
                <View style={styles.groupCard}>
                    <NavRow
                        icon={<Radio size={18} color={theme.colors.onSecondaryContainer} />}
                        iconBg={theme.colors.secondaryContainer}
                        title="Sender Mappings"
                        subtitle="Rename, reroute, merge"
                        onPress={() => setShowMappings(true)}
                    />
                    <CurrencyRow
                        current={settings.defaultCurrency}
                        onChange={(value) => update({ defaultCurrency: value })}
                    />
                    {IS_IOS ? null : (
                        <NavRow
                            icon={<Zap size={18} color={theme.colors.onSecondaryContainer} />}
                            iconBg={theme.colors.secondaryContainer}
                            title="Allowed Apps"
                            subtitle={
                                settings.allowedPackages.length === 0
                                    ? "Receiving from all apps"
                                    : `${settings.allowedPackages.length} app${settings.allowedPackages.length === 1 ? "" : "s"}`
                            }
                            onPress={() => setShowPackages(true)}
                        />
                    )}
                    <NavRow
                        icon={<ShieldCheck size={18} color={theme.colors.onSecondaryContainer} />}
                        iconBg={theme.colors.secondaryContainer}
                        title="Allowed SMS Senders"
                        subtitle={
                            (settings.allowedSenders.length === 0
                                ? "Receiving from all senders"
                                : `${settings.allowedSenders.length} sender${settings.allowedSenders.length === 1 ? "" : "s"}`) +
                            (IS_IOS ? ". Applies when Sender is connected" : "")
                        }
                        onPress={() => setShowSenders(true)}
                        last
                    />
                </View>

                <SectionLabel label="Review" />
                <View style={styles.groupCard}>
                    <AutoLogToggleRow
                        icon={<Sparkles size={18} color={theme.colors.onPrimaryContainer} />}
                        iconBg={theme.colors.primaryContainer}
                        title="Always review first"
                        subtitle="Nothing is saved without your tap"
                        value={settings.askBeforeSaving}
                        onValueChange={(v) => update({ askBeforeSaving: v })}
                    />
                    <NavRow
                        icon={<Inbox size={18} color={theme.colors.onSecondaryContainer} />}
                        iconBg={theme.colors.secondaryContainer}
                        title="Review Queue"
                        subtitle={
                            pendingCount === 0
                                ? "Nothing pending"
                                : `${pendingCount} waiting`
                        }
                        onPress={() => setShowReview(true)}
                        last
                    />
                </View>

                {__DEV__ ? (
                    <>
                        <SectionLabel label="Developer" />
                        <View style={styles.groupCard}>
                            <NavRow
                                icon={<FlaskConical size={18} color={theme.colors.onTertiaryContainer} />}
                                iconBg={theme.colors.tertiaryContainer}
                                title="Seed sample events"
                                subtitle="Runs 4 canned SMS/notification events through the pipeline"
                                onPress={handleSeed}
                                last
                            />
                        </View>
                    </>
                ) : null}

                <SectionLabel label="Insights" />
                <AutoLogStatsCard stats={stats} onReset={handleResetStats} />

                <SectionLabel label="Privacy" />
                <View style={styles.groupCard}>
                    <NavRow
                        icon={<Lock size={18} color={theme.colors.onSecondaryContainer} />}
                        iconBg={theme.colors.secondaryContainer}
                        title="How your data stays private"
                        subtitle="What is captured, stored, and never uploaded"
                        onPress={() => setShowPrivacy(true)}
                        last
                    />
                </View>
            </ScrollView>

            <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />

            <AllowedAppsSelector
                visible={showPackages}
                title="Allowed Apps"
                placeholder="Add package name (e.g. com.mtn.momo)"
                values={settings.allowedPackages}
                onClose={() => setShowPackages(false)}
                onChange={(values) => update({ allowedPackages: values })}
            />

            <AllowedAppsSelector
                visible={showSenders}
                title="Allowed SMS Senders"
                placeholder="Add sender ID (e.g. MTN)"
                values={settings.allowedSenders}
                onClose={() => setShowSenders(false)}
                onChange={(values) => update({ allowedSenders: values })}
            />
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerLow,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        headerTitle: {
            fontSize: 22,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        groupCard: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 14,
            overflow: "hidden",
        },
    });
