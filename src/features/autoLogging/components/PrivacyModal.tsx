import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell, Lock, MessageSquare, ShieldCheck } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import AppModal from "../../../components/AppModal";

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function PrivacyModal({ visible, onClose }: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const headerLeft = (
        <View style={[styles.headerIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Lock size={18} color={theme.colors.onSecondaryContainer} />
        </View>
    );

    return (
        <AppModal
            visible={visible}
            onClose={onClose}
            title="Privacy"
            headerRight={null}
            scrollable
            contentStyle={{ backgroundColor: theme.colors.background }}
        >
            <View style={styles.iconRow}>{headerLeft}</View>

            <Text style={styles.lead}>Everything stays on this device.</Text>
            <Text style={styles.paragraph}>
                Captured SMS and notification text is parsed locally and stored alongside your transactions.
                Expense Tracker does not run a server and does not upload the contents of your messages.
            </Text>

            <Section title="What is captured" styles={styles} theme={theme}>
                <Bullet icon={<MessageSquare size={14} color={theme.colors.onPrimaryContainer} />} iconBg={theme.colors.primaryContainer} theme={theme} styles={styles}>
                    SMS: the sender and message body, only from senders you place on the allowlist.
                </Bullet>
                <Bullet icon={<Bell size={14} color={theme.colors.onPrimaryContainer} />} iconBg={theme.colors.primaryContainer} theme={theme} styles={styles}>
                    Notifications: the package name, title, and text, only from apps you allow.
                </Bullet>
            </Section>

            <Section title="How it is used" styles={styles} theme={theme}>
                <Bullet theme={theme} styles={styles}>
                    Parsed on-device into an amount, merchant, and category suggestion.
                </Bullet>
                <Bullet theme={theme} styles={styles}>
                    Saved directly or queued for your review based on your settings.
                </Bullet>
                <Bullet theme={theme} styles={styles}>
                    You can reject, edit, or delete any captured entry at any time.
                </Bullet>
            </Section>

            <Section title="What we never do" styles={styles} theme={theme}>
                <Bullet icon={<ShieldCheck size={14} color={theme.colors.onIncomeContainer} />} iconBg={theme.colors.incomeContainer} theme={theme} styles={styles}>
                    We never upload message content. There is no server.
                </Bullet>
                <Bullet icon={<ShieldCheck size={14} color={theme.colors.onIncomeContainer} />} iconBg={theme.colors.incomeContainer} theme={theme} styles={styles}>
                    We never share captured text with third parties.
                </Bullet>
                <Bullet icon={<ShieldCheck size={14} color={theme.colors.onIncomeContainer} />} iconBg={theme.colors.incomeContainer} theme={theme} styles={styles}>
                    We never use captured text for ads, profiling, or training any model.
                </Bullet>
            </Section>

            <Section title="Your controls" styles={styles} theme={theme}>
                <Bullet theme={theme} styles={styles}>
                    Turn Automatic Logging off at any time from the settings screen.
                </Bullet>
                <Bullet theme={theme} styles={styles}>
                    Remove senders or apps from the allowlist to stop capturing from them.
                </Bullet>
                <Bullet theme={theme} styles={styles}>
                    Revoke permissions from Android settings — we detect and disable capture on the next foreground.
                </Bullet>
            </Section>
        </AppModal>
    );
}

interface SectionProps {
    title: string;
    children: React.ReactNode;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}

function Section({ title, children, styles, theme }: SectionProps) {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
            <View style={{ gap: 10 }}>{children}</View>
        </View>
    );
}

interface BulletProps {
    children: React.ReactNode;
    icon?: React.ReactNode;
    iconBg?: string;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}

function Bullet({ children, icon, iconBg, styles, theme }: BulletProps) {
    const dotBg = iconBg ?? theme.colors.secondaryContainer;
    return (
        <View style={styles.bullet}>
            <View style={[styles.bulletDot, { backgroundColor: dotBg }]}>
                {icon ?? (
                    <View
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.colors.onSecondaryContainer,
                        }}
                    />
                )}
            </View>
            <Text style={[styles.bulletText, { color: theme.colors.onSurface }]}>{children}</Text>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        iconRow: {
            marginBottom: 12,
        },
        headerIcon: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        lead: {
            fontSize: 17,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            letterSpacing: -0.2,
            marginBottom: 8,
        },
        paragraph: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 19,
            marginBottom: 20,
        },
        section: {
            marginBottom: 20,
        },
        sectionTitle: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
        },
        bullet: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
        },
        bulletDot: {
            width: 24,
            height: 24,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
        },
        bulletText: {
            flex: 1,
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            lineHeight: 19,
        },
    });
