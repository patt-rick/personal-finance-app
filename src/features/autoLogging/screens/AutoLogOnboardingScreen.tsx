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
    Check,
    Lock,
    MessageSquare,
    ShieldCheck,
    Sparkles,
} from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import {
    ensureNotificationListenerAccess,
    ensurePostNotificationsPermission,
    ensureSmsPermission,
    hasNotificationListenerAccess,
    hasSmsPermission,
} from "../services/permissions/android";

type StepKey = "sms" | "listener" | "postNotifications";

type StepState = "pending" | "granted" | "skipped";

interface Props {
    onDone: (granted: { sms: boolean; notifications: boolean }) => void;
    onCancel: () => void;
}

export default function AutoLogOnboardingScreen({ onDone, onCancel }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [sms, setSms] = useState<StepState>("pending");
    const [listener, setListener] = useState<StepState>("pending");
    const [postNotifications, setPostNotifications] = useState<StepState>("pending");
    const [busy, setBusy] = useState(false);

    const showPostNotifications = Platform.OS === "android" && (Platform.Version as number) >= 33;

    const refreshStates = useCallback(async () => {
        const [smsOk, listenerOk] = await Promise.all([
            hasSmsPermission(),
            hasNotificationListenerAccess(),
        ]);
        setSms((prev) => (smsOk ? "granted" : prev === "skipped" ? "skipped" : "pending"));
        setListener((prev) => (listenerOk ? "granted" : prev === "skipped" ? "skipped" : "pending"));
    }, []);

    useEffect(() => {
        refreshStates();
    }, [refreshStates]);

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            onCancel();
            return true;
        });
        return () => sub.remove();
    }, [onCancel]);

    const runSms = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        try {
            const ok = await ensureSmsPermission();
            setSms(ok ? "granted" : "pending");
            if (!ok) {
                Alert.alert(
                    "SMS permission not granted",
                    "You can still use Notifications capture — or re-run this step anytime from settings.",
                );
            }
        } finally {
            setBusy(false);
        }
    }, [busy]);

    const runListener = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        try {
            await ensureNotificationListenerAccess();
            const ok = await hasNotificationListenerAccess();
            setListener(ok ? "granted" : "pending");
        } finally {
            setBusy(false);
        }
    }, [busy]);

    const runPostNotifications = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        try {
            const ok = await ensurePostNotificationsPermission();
            setPostNotifications(ok ? "granted" : "pending");
        } finally {
            setBusy(false);
        }
    }, [busy]);

    const skip = useCallback((key: StepKey) => {
        if (key === "sms") setSms("skipped");
        if (key === "listener") setListener("skipped");
        if (key === "postNotifications") setPostNotifications("skipped");
    }, []);

    const canFinish = sms !== "pending" && listener !== "pending" && (!showPostNotifications || postNotifications !== "pending");

    const handleFinish = useCallback(() => {
        onDone({
            sms: sms === "granted",
            notifications: listener === "granted",
        });
    }, [sms, listener, onDone]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity style={styles.backBtn} onPress={onCancel} hitSlop={12}>
                    <ArrowLeft size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Turn On Auto-Log</Text>
            </View>
            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: Math.max(insets.bottom, 20) + 40,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Sparkles size={22} color={theme.colors.onPrimaryContainer} />
                    </View>
                    <Text style={styles.heroTitle}>Capture expenses automatically</Text>
                    <Text style={styles.heroBody}>
                        Finance Tracker reads incoming financial SMS and notifications on-device and suggests entries. Nothing
                        leaves your phone.
                    </Text>
                </View>

                <Step
                    index={1}
                    icon={<MessageSquare size={18} color={theme.colors.onPrimaryContainer} />}
                    title="Read SMS"
                    subtitle="Lets us capture bank and mobile-money alerts"
                    state={sms}
                    busy={busy}
                    onGrant={runSms}
                    onSkip={() => skip("sms")}
                    styles={styles}
                    theme={theme}
                />

                <Step
                    index={2}
                    icon={<Bell size={18} color={theme.colors.onPrimaryContainer} />}
                    title="Notification Access"
                    subtitle="Captures posted notifications from allowed apps"
                    state={listener}
                    busy={busy}
                    onGrant={runListener}
                    onSkip={() => skip("listener")}
                    styles={styles}
                    theme={theme}
                />

                {showPostNotifications ? (
                    <Step
                        index={3}
                        icon={<ShieldCheck size={18} color={theme.colors.onPrimaryContainer} />}
                        title="Post Notifications"
                        subtitle="Lets us alert you about newly captured expenses"
                        state={postNotifications}
                        busy={busy}
                        onGrant={runPostNotifications}
                        onSkip={() => skip("postNotifications")}
                        styles={styles}
                        theme={theme}
                    />
                ) : null}

                <View style={styles.privacyCard}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Lock size={16} color={theme.colors.onSecondaryContainer} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.privacyTitle}>Your messages stay on this device.</Text>
                        <Text style={styles.privacyBody}>
                            Parsing happens locally. No server calls are made with the contents of your SMS or notifications.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <TouchableOpacity
                    style={[
                        styles.finishBtn,
                        {
                            backgroundColor: canFinish ? theme.colors.primary : theme.colors.surfaceContainerHighest,
                        },
                    ]}
                    disabled={!canFinish}
                    onPress={handleFinish}
                >
                    <Text
                        style={[
                            styles.finishText,
                            { color: canFinish ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
                        ]}
                    >
                        {canFinish ? "Finish setup" : "Review steps above"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

interface StepProps {
    index: number;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    state: StepState;
    busy: boolean;
    onGrant: () => void;
    onSkip: () => void;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}

function Step({ index, icon, title, subtitle, state, busy, onGrant, onSkip, styles, theme }: StepProps) {
    const granted = state === "granted";
    const skipped = state === "skipped";
    const statusColor = granted
        ? theme.colors.primary
        : skipped
            ? theme.colors.onSurfaceVariant
            : theme.colors.onSurfaceVariant;
    const statusLabel = granted ? "Granted" : skipped ? "Skipped" : "Pending";
    return (
        <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIndex, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <Text style={[styles.stepIndexText, { color: theme.colors.onSurfaceVariant }]}>{index}</Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>{icon}</View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{title}</Text>
                    <Text style={styles.stepSubtitle}>{subtitle}</Text>
                </View>
                {granted ? <Check size={18} color={theme.colors.primary} /> : null}
            </View>
            <View style={styles.stepActions}>
                <TouchableOpacity
                    disabled={busy || granted}
                    onPress={onGrant}
                    style={[
                        styles.stepPrimary,
                        { backgroundColor: granted ? theme.colors.surfaceContainerHighest : theme.colors.primary },
                    ]}
                >
                    <Text
                        style={[
                            styles.stepPrimaryText,
                            {
                                color: granted ? theme.colors.onSurfaceVariant : theme.colors.onPrimary,
                            },
                        ]}
                    >
                        {granted ? "Granted" : "Grant"}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={granted}
                    onPress={onSkip}
                    style={styles.stepSecondary}
                >
                    <Text style={[styles.stepSecondaryText, { color: theme.colors.onSurfaceVariant }]}>
                        {skipped ? "Skipped" : "Skip"}
                    </Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <Text style={[styles.stepStatus, { color: statusColor }]}>{statusLabel}</Text>
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
        heroCard: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 16,
            padding: 20,
            marginTop: 8,
            marginBottom: 16,
        },
        heroIcon: {
            width: 44,
            height: 44,
            borderRadius: theme.shape.large,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
        },
        heroTitle: {
            fontSize: 20,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            marginBottom: 6,
        },
        heroBody: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 19,
        },
        stepCard: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
        },
        stepHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        stepIndex: {
            width: 24,
            height: 24,
            borderRadius: theme.shape.extraSmall,
            alignItems: "center",
            justifyContent: "center",
        },
        stepIndexText: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        stepTitle: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        stepSubtitle: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
            lineHeight: 16,
        },
        stepActions: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: 14,
            gap: 10,
        },
        stepPrimary: {
            paddingHorizontal: 16,
            height: 36,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        stepPrimaryText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
        },
        stepSecondary: {
            paddingHorizontal: 14,
            height: 36,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        stepSecondaryText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
        },
        stepStatus: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.3,
        },
        privacyCard: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            marginTop: 8,
        },
        privacyTitle: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        privacyBody: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 17,
            marginTop: 2,
        },
        footer: {
            paddingHorizontal: 20,
            paddingTop: 12,
            backgroundColor: theme.colors.background,
        },
        finishBtn: {
            height: 52,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        finishText: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.2,
        },
    });
