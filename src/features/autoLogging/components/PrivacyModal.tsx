import React, { useMemo } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Lock, MessageSquare, ShieldCheck, X } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function PrivacyModal({ visible, onClose }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.header}>
                        <View style={[styles.headerIcon, { backgroundColor: theme.colors.incomeBg }]}>
                            <Lock size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.headerTitle}>Privacy</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                            <X size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
                        <Text style={styles.lead}>Everything stays on this device.</Text>
                        <Text style={styles.paragraph}>
                            Captured SMS and notification text is parsed locally and stored alongside your transactions.
                            Finance Tracker does not run a server and does not upload the contents of your messages.
                        </Text>

                        <Section title="What is captured" styles={styles} theme={theme}>
                            <Bullet icon={<MessageSquare size={14} color={theme.colors.primary} />} theme={theme} styles={styles}>
                                SMS: the sender and message body, only from senders you place on the allowlist.
                            </Bullet>
                            <Bullet icon={<Bell size={14} color={theme.colors.primary} />} theme={theme} styles={styles}>
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
                            <Bullet icon={<ShieldCheck size={14} color={theme.colors.primary} />} theme={theme} styles={styles}>
                                We never upload message content. There is no server.
                            </Bullet>
                            <Bullet icon={<ShieldCheck size={14} color={theme.colors.primary} />} theme={theme} styles={styles}>
                                We never share captured text with third parties.
                            </Bullet>
                            <Bullet icon={<ShieldCheck size={14} color={theme.colors.primary} />} theme={theme} styles={styles}>
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
                    </ScrollView>
                </View>
            </View>
        </Modal>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
            <View style={{ gap: 10 }}>{children}</View>
        </View>
    );
}

interface BulletProps {
    children: React.ReactNode;
    icon?: React.ReactNode;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}

function Bullet({ children, icon, styles, theme }: BulletProps) {
    return (
        <View style={styles.bullet}>
            <View style={[styles.bulletDot, { backgroundColor: theme.colors.incomeBg }]}>
                {icon ?? (
                    <View
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.colors.primary,
                        }}
                    />
                )}
            </View>
            <Text style={[styles.bulletText, { color: theme.colors.text }]}>{children}</Text>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
        },
        sheet: {
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "85%",
            paddingTop: 16,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 12,
            gap: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.borderLight,
        },
        headerIcon: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            flex: 1,
            fontSize: 18,
            fontWeight: "800",
            color: theme.colors.text,
            letterSpacing: -0.2,
        },
        closeBtn: {
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.card,
        },
        body: {
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 24,
        },
        lead: {
            fontSize: 17,
            fontWeight: "700",
            color: theme.colors.text,
            letterSpacing: -0.2,
            marginBottom: 8,
        },
        paragraph: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            lineHeight: 19,
            marginBottom: 20,
        },
        section: {
            marginBottom: 20,
        },
        sectionTitle: {
            fontSize: 11,
            fontWeight: "700",
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
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
        },
        bulletText: {
            flex: 1,
            fontSize: 13,
            lineHeight: 19,
        },
    });
