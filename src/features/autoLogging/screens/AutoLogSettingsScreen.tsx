import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    BackHandler,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
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
import AutoLogOnboardingScreen from "./AutoLogOnboardingScreen";
import { FLOATING_TAB_HEIGHT } from "../../../components/FloatingTabBar";

const CURRENCIES = [
    { label: "US Dollar", value: "USD", symbol: "$" },
    { label: "Ghana Cedi", value: "GHS", symbol: "₵" },
    { label: "Euro", value: "EUR", symbol: "€" },
    { label: "British Pound", value: "GBP", symbol: "£" },
];

interface Props {
    businesses: Business[];
    onBack: () => void;
    onDataChanged?: () => Promise<void> | void;
}

export default function AutoLogSettingsScreen({ businesses, onBack, onDataChanged }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const { settings, loading, update, reload } = useAutoLogSettings();
    const [showMappings, setShowMappings] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [showPackages, setShowPackages] = useState(false);
    const [showSenders, setShowSenders] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [stats, setStats] = useState<AutoLogStats | null>(null);

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
            if (showOnboarding) {
                setShowOnboarding(false);
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
    }, [showMappings, showReview, showPackages, showSenders, showOnboarding, showPrivacy, onBack]);

    useEffect(() => {
        if (loading || !settings.enabled || Platform.OS !== "android" || !autoLogNative.isAvailable()) {
            return;
        }
        autoLogNative.setAllowedPackages(settings.allowedPackages).catch(() => {});
        autoLogNative.setAllowedSenders(settings.allowedSenders).catch(() => {});
    }, [loading, settings.enabled, settings.allowedPackages, settings.allowedSenders]);

    useEffect(() => {
        if (loading || Platform.OS !== "android" || !autoLogNative.isAvailable()) return;
        const reconcile = async () => {
            try {
                await autoLogNative.setEnabled(settings.enabled);
                await autoLogNative.setCaptureSms(settings.enabled && settings.captureSms);
                await autoLogNative.setCaptureNotifications(
                    settings.enabled && settings.captureNotifications,
                );
            } catch {
                // native bridge will surface errors to callers via promise rejection
            }
        };
        reconcile();
    }, [loading, settings.enabled, settings.captureSms, settings.captureNotifications]);

    const handleCaptureSms = useCallback(
        async (next: boolean) => {
            if (next) {
                const granted = await ensureSmsPermission();
                if (!granted) return;
            }
            await update({ captureSms: next });
        },
        [update],
    );

    const handleCaptureNotifications = useCallback(
        async (next: boolean) => {
            if (next) {
                const granted = await ensureNotificationListenerAccess();
                if (!granted) return;
            }
            await update({ captureNotifications: next });
        },
        [update],
    );

    const handleOnboardingDone = useCallback(
        async (granted: { sms: boolean; notifications: boolean }) => {
            try {
                await autoLogNative.setAllowedPackages(settings.allowedPackages);
                await autoLogNative.setAllowedSenders(settings.allowedSenders);
            } catch {
                // ignore — reconcile effect will retry on next render
            }
            await update({
                enabled: true,
                captureSms: granted.sms,
                captureNotifications: granted.notifications,
            });
            setShowOnboarding(false);
        },
        [update, settings.allowedPackages, settings.allowedSenders],
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
        Alert.alert(
            "Seeded sample events",
            `Attempted ${result.attempted}. Saved ${result.saved}, queued ${result.queued}, filtered ${result.filtered}, dropped ${result.dropped}.`,
        );
    }, [settings, refreshPendingCount, refreshStats, onDataChanged]);

    const handleToggleEnabled = useCallback(
        async (next: boolean) => {
            if (next) {
                if (Platform.OS !== "android" || !autoLogNative.isAvailable()) {
                    Alert.alert(
                        "Android only",
                        "Automatic logging is currently available on Android. iOS support is on the roadmap.",
                    );
                    return;
                }
                try {
                    await migrateDefaultCurrencyIfNeeded(businesses);
                    await reload();
                } catch {
                    // migration is best-effort; don't block enable
                }
                setShowOnboarding(true);
                return;
            }
            await update({ enabled: false });
        },
        [update, reload, businesses],
    );

    if (showOnboarding) {
        return (
            <AutoLogOnboardingScreen
                onDone={handleOnboardingDone}
                onCancel={() => setShowOnboarding(false)}
            />
        );
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

    const mappingSubtitle = "Rename, reroute, merge";

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
                    <ArrowLeft size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Automatic Logging</Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingBottom: Math.max(insets.bottom, 20) + FLOATING_TAB_HEIGHT + 24,
                    paddingHorizontal: 20,
                }}
                showsVerticalScrollIndicator={false}
            >
                <StatusCard
                    enabled={settings.enabled}
                    onToggle={handleToggleEnabled}
                    styles={styles}
                    theme={theme}
                />

                <SectionLabel label="Capture Sources" styles={styles} />
                <View style={styles.groupCard}>
                    <AutoLogToggleRow
                        icon={<MessageSquare size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
                        title="SMS"
                        subtitle="Read financial SMS messages"
                        value={settings.captureSms}
                        onValueChange={handleCaptureSms}
                        disabled={!settings.enabled}
                    />
                    <AutoLogToggleRow
                        icon={<Bell size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
                        title="Notifications"
                        subtitle="Capture posted notifications"
                        value={settings.captureNotifications}
                        onValueChange={handleCaptureNotifications}
                        disabled={!settings.enabled}
                        last
                    />
                </View>

                <SectionLabel label="Routing" styles={styles} />
                <View style={styles.groupCard}>
                    <NavRow
                        icon={<Radio size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
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
                        icon={<Zap size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
                        title="Allowed Apps"
                        subtitle={
                            settings.allowedPackages.length === 0
                                ? "No apps added"
                                : `${settings.allowedPackages.length} app${settings.allowedPackages.length === 1 ? "" : "s"}`
                        }
                        onPress={() => setShowPackages(true)}
                        styles={styles}
                        theme={theme}
                    />
                    <NavRow
                        icon={<ShieldCheck size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
                        title="Allowed SMS Senders"
                        subtitle={
                            settings.allowedSenders.length === 0
                                ? "No senders added"
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
                        icon={<Eye size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
                        title="Review low-confidence only"
                        subtitle="High-confidence entries save silently"
                        value={settings.reviewLowConfidenceOnly}
                        onValueChange={(v) => update({ reviewLowConfidenceOnly: v })}
                    />
                    <AutoLogToggleRow
                        icon={<Sparkles size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
                        title="Always review first"
                        subtitle="Nothing is saved without your tap"
                        value={settings.askBeforeSaving}
                        onValueChange={(v) => update({ askBeforeSaving: v })}
                    />
                    <NavRow
                        icon={<Inbox size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
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
                                icon={<FlaskConical size={18} color={theme.colors.primary} />}
                                iconBg={theme.colors.incomeBg}
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
                        icon={<Lock size={18} color={theme.colors.primary} />}
                        iconBg={theme.colors.incomeBg}
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

function StatusCard({
    enabled,
    onToggle,
    styles,
    theme,
}: {
    enabled: boolean;
    onToggle: (next: boolean) => void;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}) {
    return (
        <View style={styles.statusCard}>
            <View style={styles.statusTop}>
                <View style={[styles.statusIcon, { backgroundColor: theme.colors.incomeBg }]}>
                    <Wallet size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>{enabled ? "On" : "Off"}</Text>
                    <Text style={styles.statusSubtitle}>
                        {enabled
                            ? "Listening for financial SMS and notifications"
                            : "Turn on to start capturing automatically"}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={[
                    styles.statusToggle,
                    { backgroundColor: enabled ? theme.colors.primary : theme.colors.surface },
                ]}
                onPress={() => onToggle(!enabled)}
            >
                <Text
                    style={[
                        styles.statusToggleText,
                        { color: enabled ? theme.colors.textInverse : theme.colors.text },
                    ]}
                >
                    {enabled ? "Turn Off" : "Turn On"}
                </Text>
            </TouchableOpacity>
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
                <Text style={[styles.navTitle, { color: theme.colors.text }]}>{title}</Text>
                <Text style={[styles.navSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
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
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.incomeBg }]}>
                    <Wallet size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.navTitle, { color: theme.colors.text }]}>Default Currency</Text>
                    <Text style={[styles.navSubtitle, { color: theme.colors.textSecondary }]}>
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
                                { backgroundColor: theme.colors.surface },
                                selected && { backgroundColor: theme.colors.primary },
                            ]}
                            onPress={() => onChange(c.value)}
                        >
                            <Text
                                style={[
                                    styles.currencySymbol,
                                    { color: theme.colors.text },
                                    selected && { color: theme.colors.textInverse },
                                ]}
                            >
                                {c.symbol}
                            </Text>
                            <Text
                                style={[
                                    styles.currencyCode,
                                    { color: theme.colors.textSecondary },
                                    selected && { color: theme.colors.textInverse },
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
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.colors.card,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: "800",
            letterSpacing: -0.3,
            color: theme.colors.text,
        },
        statusCard: {
            backgroundColor: theme.colors.card,
            borderRadius: 20,
            padding: 20,
            marginTop: 8,
            elevation: 2,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
        },
        statusTop: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
        },
        statusIcon: {
            width: 48,
            height: 48,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        statusTitle: {
            fontSize: 20,
            fontWeight: "800",
            color: theme.colors.text,
            letterSpacing: -0.2,
        },
        statusSubtitle: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 2,
            lineHeight: 17,
        },
        statusToggle: {
            height: 46,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        statusToggleText: {
            fontSize: 14,
            fontWeight: "700",
            letterSpacing: 0.2,
        },
        sectionLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textTransform: "uppercase",
            marginTop: 24,
            marginBottom: 10,
            marginLeft: 4,
            fontWeight: "700",
            letterSpacing: 0.8,
        },
        groupCard: {
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            overflow: "hidden",
            elevation: 1,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        navRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
        },
        navTitle: {
            fontSize: 15,
            fontWeight: "600",
            letterSpacing: -0.1,
        },
        navSubtitle: {
            fontSize: 12,
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
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        currencySymbol: {
            fontSize: 18,
            fontWeight: "700",
        },
        currencyCode: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: 2,
        },
        privacyCard: {
            padding: 16,
        },
        privacyTitle: {
            fontSize: 14,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 4,
        },
        privacyBody: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            lineHeight: 18,
        },
    });
