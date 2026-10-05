import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { getTimeAgo } from "../../../utils/_helpers";
import { FLOATING_TAB_HEIGHT } from "../../../components/FloatingTabBar";
import { appAlert } from "../../../components/dialog";
import { autoLogNative } from "../services/ingestion/nativeBridge";
import { isSupportedIosVersion, LastCapture } from "../services/ingestion/iosInbox/inboxStore";

interface Props {
    onBack: () => void;
}

interface Step {
    text: string;
    taps?: string[];
    note?: string;
}

// Mirrors the Shortcuts app's own wording so users can match what they see on screen.
const STEPS: Step[] = [
    { text: "Open the Shortcuts app and go to the Automation tab." },
    { text: "Tap + to make a new automation, then choose Message.", taps: ["Message"] },
    {
        text: "Tap Message Contains and type GHS.",
        taps: ["GHS"],
        note: "Leave Sender empty. Bank and MoMo senders aren't contacts, so they can't be picked there.",
    },
    { text: "Choose Run Immediately, then tap Next.", taps: ["Run Immediately"] },
    { text: "Tap New Blank Automation, then Add Action.", taps: ["New Blank Automation"] },
    { text: "Search for Expense Tracker and pick Log SMS Transaction.", taps: ["Log SMS Transaction"] },
    { text: "Tap Message and choose Shortcut Input.", taps: ["Shortcut Input"] },
    {
        text: "Tap Sender, choose Shortcut Input, then tap it again and pick Sender.",
        taps: ["Shortcut Input", "Sender"],
        note: "This tells Expense Tracker which bank or wallet sent the SMS, so each one gets its own cashbook. Many MoMo messages don't name MTN, so without it they're harder to recognise.",
    },
    { text: "Tap Done. Your next bank or MoMo SMS will be logged automatically." },
];

export default function IosShortcutSetupScreen({ onBack }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme), [theme]);
    // undefined while loading, so the status card doesn't flash "No SMS received yet".
    const [lastCapture, setLastCapture] = useState<LastCapture | null | undefined>(undefined);
    const supported = isSupportedIosVersion();
    const isIos27OrLater = parseInt(String(Platform.Version), 10) >= 27;

    const refresh = useCallback(() => {
        autoLogNative.getLastCapture().then(setLastCapture).catch(() => {});
    }, []);

    useEffect(() => {
        refresh();
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") refresh();
        });
        return () => sub.remove();
    }, [refresh]);

    const openShortcuts = useCallback(() => {
        Linking.openURL("shortcuts://").catch(() =>
            appAlert("Shortcuts not found", "Install Apple's Shortcuts app from the App Store, then try again."),
        );
    }, []);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
                    <ArrowLeft size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>iPhone setup</Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 20) + FLOATING_TAB_HEIGHT + 24,
                    paddingHorizontal: 20,
                }}
                showsVerticalScrollIndicator={false}
            >
                <StatusCard lastCapture={lastCapture} styles={styles} theme={theme} />

                <Text style={styles.lead}>
                    iPhone doesn't let apps read your texts. Instead, a Shortcuts automation passes each
                    bank or MoMo SMS to Expense Tracker. Setting it up takes about a minute.
                </Text>

                {supported ? (
                    <>
                        {isIos27OrLater ? (
                            <Text style={styles.tip}>
                                On iOS 27 and later, automations are part of regular shortcuts, so some screens
                                look different. Make the same choices: a Message trigger that contains GHS, set
                                to run immediately, followed by Log SMS Transaction with Message and Sender set
                                to Shortcut Input.
                            </Text>
                        ) : null}
                        <View style={styles.steps}>
                            {STEPS.map((step, index) => (
                                <View key={step.text} style={styles.step}>
                                    <View style={styles.stepRail}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                                        </View>
                                        {index < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
                                    </View>
                                    <View style={styles.stepBody}>
                                        <Text style={styles.stepText}>{step.text}</Text>
                                        {step.taps ? (
                                            <View style={styles.pills}>
                                                {step.taps.map((tap) => (
                                                    <View key={tap} style={styles.pill}>
                                                        <Text style={styles.pillText}>{tap}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : null}
                                        {step.note ? <Text style={styles.stepNote}>{step.note}</Text> : null}
                                    </View>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.cta} onPress={openShortcuts} activeOpacity={0.85}>
                            <Text style={styles.ctaText}>Open Shortcuts</Text>
                        </TouchableOpacity>

                        <Text style={styles.tipsTitle}>Good to know</Text>
                        <Text style={styles.tip}>
                            Some providers write GH¢ or GHC instead of GHS. Repeat the steps with that word to
                            catch those messages too.
                        </Text>
                        <Text style={styles.tip}>
                            iPhone shows a short notification each time the automation runs. That's normal and
                            can't be switched off.
                        </Text>
                        <Text style={styles.tip}>
                            Nothing arriving? In the iPhone Settings app, open Messages (under Apps on iOS 18
                            and later) and turn off Filter Unknown Senders or Screen Unknown Senders. After an
                            iOS update, check the automation still runs immediately.
                        </Text>
                    </>
                ) : (
                    <View style={styles.unsupported}>
                        <Text style={styles.stepText}>
                            Automatic SMS logging needs iOS 17 or later. Update your iPhone to set it up. Until
                            then, copy a bank or MoMo SMS and use Paste an SMS in Automatic Logging.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function StatusCard({
    lastCapture,
    styles,
    theme,
}: {
    lastCapture: LastCapture | null | undefined;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}) {
    if (lastCapture === undefined) return null;
    if (!lastCapture) {
        return (
            <View style={styles.status}>
                <Clock size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.statusText}>No SMS received yet</Text>
            </View>
        );
    }
    const when = getTimeAgo(new Date(lastCapture.at).toISOString());
    return (
        <View style={styles.status}>
            {lastCapture.hasSender ? (
                <CheckCircle2 size={18} color={theme.colors.income} />
            ) : (
                <AlertTriangle size={18} color={theme.colors.gold} />
            )}
            <View style={{ flex: 1 }}>
                <Text style={styles.statusText}>Last SMS received {when}</Text>
                {lastCapture.hasSender ? null : (
                    <Text style={styles.statusHint}>
                        The sender isn't connected, so messages are guessed from their text. Finish step 8.
                    </Text>
                )}
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
        status: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            padding: 16,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.surfaceContainer,
        },
        statusText: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        statusHint: {
            fontSize: 13,
            lineHeight: 18,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
        },
        lead: {
            fontSize: 15,
            lineHeight: 22,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 20,
            marginBottom: 20,
        },
        steps: {
            marginBottom: 8,
        },
        step: {
            flexDirection: "row",
        },
        stepRail: {
            width: 28,
            alignItems: "center",
            marginRight: 14,
        },
        stepNumber: {
            width: 28,
            height: 28,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        stepNumberText: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.onPrimary,
            fontVariant: ["tabular-nums"],
        },
        stepLine: {
            flex: 1,
            width: 2,
            marginVertical: 4,
            borderRadius: 1,
            backgroundColor: theme.colors.outlineVariant,
        },
        stepBody: {
            flex: 1,
            paddingTop: 4,
            paddingBottom: 20,
        },
        stepText: {
            fontSize: 15,
            lineHeight: 22,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurface,
        },
        stepNote: {
            fontSize: 13,
            lineHeight: 19,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 6,
        },
        pills: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 8,
        },
        pill: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: theme.shape.small,
            backgroundColor: theme.colors.primaryContainer,
        },
        pillText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimaryContainer,
        },
        cta: {
            height: 52,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        ctaText: {
            fontSize: 16,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimary,
        },
        tipsTitle: {
            fontSize: 16,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            marginTop: 28,
            marginBottom: 8,
        },
        tip: {
            fontSize: 14,
            lineHeight: 21,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 10,
        },
        unsupported: {
            padding: 16,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.surfaceContainerLow,
        },
    });
