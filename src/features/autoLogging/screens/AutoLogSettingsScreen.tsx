import React, { useCallback, useEffect, useMemo, useState } from "react";
import {    BackHandler,
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
    ChevronRight,
    Eye,
    FlaskConical,
    Inbox,
    Lock,
    MessageSquare,
    Radio,
    ShieldCheck,
    Sparkles,
    Wallet,
    Zap,
} from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import AutoLogToggleRow from "../components/AutoLogToggleRow";
import AllowedAppsSelector from "../components/AllowedAppsSelector";
import AutoLogStatsCard from "../components/AutoLogStatsCard";
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
import { FLOATING_TAB_HEIGHT } from "../../../components/FloatingTabBar";

const CURRENCIES = [
    { label: "US Dollar", value: "USD", symbol: "$" },
    { label: "Ghana Cedi", value: "GHS", symbol: "₵" },
    { label: "Euro", value: "EUR", symbol: "€" },
    { label: "British Pound", value: "GBP", symbol: "£" },
    { label: "Nigerian Naira", value: "NGN", symbol: "₦" },
];

interface Props {
    businesses: Business[];
    onBack: () => void;
    onDataChanged?: () => Promise<void> | void;
}

function alertCaptureUnavailable(): boolean {
    if (Platform.OS !== "android") {
        appAlert(
            "Android only",
            "Automatic logging is currently available on Android. iOS support is on the roadmap.",
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
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
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
    }, [showMappings, showReview, showPackages, showSenders, showPrivacy, onBack]);

    useEffect(() => {
        if (loading || !captureActive || Platform.OS !== "android" || !autoLogNative.isAvailable()) {
            return;
        }
        autoLogNative.setAllowedPackages(settings.allowedPackages).catch(() => {});
        autoLogNative.setAllowedSenders(settings.allowedSenders).catch(() => {});
    }, [loading, captureActive, settings.allowedPackages, settings.allowedSenders]);

    useEffect(() => {
        if (loading || Platform.OS !== "android" || !autoLogNative.isAvailable()) return;
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
                const granted = await ensureSmsPermission();
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

    const mappingSubtitle = "Rename, reroute, merge";

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
                <SectionLabel label="Capture Sources" styles={styles} />
                <View style={styles.groupCard}>
                    <AutoLogToggleRow
                        icon={<MessageSquare size={18} color={theme.colors.onPrimaryContainer} />}
                        iconBg={theme.colors.primaryContainer}
                        title="SMS"
                        subtitle="Read financial SMS messages"
                        value={settings.captureSms}
                        onValueChange={handleCaptureSms}
                    />
                    <AutoLogToggleRow
                        icon={<Bell size={18} color={theme.colors.onPrimaryContainer} />}
                        iconBg={theme.colors.primaryContainer}
                        title="Notifications"
                        subtitle="Capture posted notifications"
                        value={settings.captureNotifications}
                        onValueChange={handleCaptureNotifications}
                        last
                    />
                </View>

                <SectionLabel label="Routing" styles={styles} />
                <View style={styles.groupCard}>
                    <NavRow
                        icon={<Radio size={18} color={theme.colors.onSecondaryContainer} />}
                        iconBg={theme.colors.secondaryContainer}
                        title="Sender Mappings"
                        subtitle={mappingSubtitle}
                        onPress={() => setShowMappings(true)}
                        styles={styles}
                        theme={theme}
                    />
                    <CurrencyRow
                        current={settings.defaultCurrency}
                        onChange={(value) => update({ defaultCurrency: value })}
                        styles={styles}
                        theme={theme}
                    />
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
                        styles={styles}
                        theme={theme}
                    />
                    <NavRow
                        icon={<ShieldCheck size={18} color={theme.colors.onSecondaryContainer} />}
                        iconBg={theme.colors.secondaryContainer}
                        title="Allowed SMS Senders"
                        subtitle={
                            settings.allowedSenders.length === 0
                                ? "Receiving from all senders"
                                : `${settings.allowedSenders.length} sender${settings.allowedSenders.length === 1 ? "" : "s"}`
                        }
                        onPress={() => setShowSenders(true)}
                        styles={styles}
                        theme={theme}
                        last
                    />
                </View>

                <SectionLabel label="Review" styles={styles} />
                <View style={styles.groupCard}>
                    <AutoLogToggleRow
                        icon={<Eye size={18} color={theme.colors.onPrimaryContainer} />}
                        iconBg={theme.colors.primaryContainer}
                        title="Review low-confidence only"
                        subtitle="High-confidence entries save silently"
                        value={settings.reviewLowConfidenceOnly}
                        onValueChange={(v) => update({ reviewLowConfidenceOnly: v })}
                    />
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
                        styles={styles}
                        theme={theme}
                        last
                    />
                </View>

                {__DEV__ ? (
                    <>
                        <SectionLabel label="Developer" styles={styles} />
                        <View style={styles.groupCard}>
                            <NavRow
                                icon={<FlaskConical size={18} color={theme.colors.onTertiaryContainer} />}
                                iconBg={theme.colors.tertiaryContainer}
                                title="Seed sample events"
                                subtitle="Runs 4 canned SMS/notification events through the pipeline"
                                onPress={handleSeed}
                                styles={styles}
                                theme={theme}
                                last
                            />
                        </View>
                    </>
                ) : null}

                <SectionLabel label="Insights" styles={styles} />
                <AutoLogStatsCard stats={stats} onReset={handleResetStats} />

                <SectionLabel label="Privacy" styles={styles} />
                <View style={styles.groupCard}>
                    <NavRow
                        icon={<Lock size={18} color={theme.colors.onSecondaryContainer} />}
                        iconBg={theme.colors.secondaryContainer}
                        title="How your data stays private"
                        subtitle="What is captured, stored, and never uploaded"
                        onPress={() => setShowPrivacy(true)}
                        styles={styles}
                        theme={theme}
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

function SectionLabel({ label, styles }: { label: string; styles: ReturnType<typeof createStyles> }) {
    return <Text style={styles.sectionLabel}>{label}</Text>;
}

function NavRow({
    icon,
    iconBg,
    title,
    subtitle,
    onPress,
    styles,
    theme,
    last,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
    theme: any;
    last?: boolean;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.navRow,
                { borderBottomColor: theme.colors.borderLight },
                last && { borderBottomWidth: 0 },
            ]}
            onPress={onPress}
        >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.navTitle, { color: theme.colors.onSurface }]}>{title}</Text>
                <Text style={[styles.navSubtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
    );
}

function CurrencyRow({
    current,
    onChange,
    styles,
    theme,
}: {
    current: string;
    onChange: (value: string) => void;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}) {
    return (
        <View style={[styles.currencyRow, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={styles.currencyHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Wallet size={18} color={theme.colors.onSecondaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.navTitle, { color: theme.colors.onSurface }]}>Default Currency</Text>
                    <Text style={[styles.navSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        For auto-created cashbooks
                    </Text>
                </View>
            </View>
            <View style={styles.currencyGrid}>
                {CURRENCIES.map((c) => {
                    const selected = current === c.value;
                    return (
                        <TouchableOpacity
                            key={c.value}
                            style={[
                                styles.currencyCard,
                                selected && {
                                    backgroundColor: theme.colors.primary,
                                    borderColor: theme.colors.primary,
                                },
                            ]}
                            onPress={() => onChange(c.value)}
                        >
                            <Text
                                style={[
                                    styles.currencySymbol,
                                    { color: theme.colors.onSurfaceVariant },
                                    selected && { color: theme.colors.onPrimary },
                                ]}
                            >
                                {c.symbol}
                            </Text>
                            <Text
                                style={[
                                    styles.currencyCode,
                                    { color: theme.colors.onSurfaceVariant },
                                    selected && { color: theme.colors.onPrimary },
                                ]}
                            >
                                {c.value}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
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
        sectionLabel: {
            fontSize: 11,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            marginTop: 24,
            marginBottom: 10,
            marginLeft: 4,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.8,
        },
        groupCard: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 14,
            overflow: "hidden",
        },
        navRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
        },
        iconCircle: {
            width: 38,
            height: 38,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
        },
        navTitle: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
        },
        navSubtitle: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            marginTop: 1,
        },
        currencyRow: {
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
        },
        currencyHeader: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
        },
        currencyGrid: {
            flexDirection: "row",
            gap: 8,
        },
        currencyCard: {
            flex: 1,
            height: 56,
            borderRadius: theme.shape.medium,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
        },
        currencySymbol: {
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
        },
        currencyCode: {
            fontSize: 10,
            fontFamily: theme.fonts.semibold,
            marginTop: 2,
        },
    });
