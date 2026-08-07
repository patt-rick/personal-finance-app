import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { X, Zap } from "lucide-react-native";
import { useTheme } from "../../theme/theme";
import { loadAutoLogSettings } from "../../features/autoLogging/services/persistence/settings";

const DISMISSED_KEY = "@autolog_promo_dismissed";

interface Props {
    onSetUp: () => void;
}

export default function AutoLogPromoCard({ onSetUp }: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [visible, setVisible] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(12)).current;

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== "android") return;
            let mounted = true;
            const check = async () => {
                const [dismissed, settings] = await Promise.all([
                    AsyncStorage.getItem(DISMISSED_KEY),
                    loadAutoLogSettings(),
                ]);
                if (!mounted) return;
                const active = settings.captureSms || settings.captureNotifications;
                const show = !dismissed && !active;
                setVisible(show);
                if (show) {
                    Animated.parallel([
                        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]).start();
                }
            };
            check();
            return () => {
                mounted = false;
            };
        }, [fadeAnim, slideAnim]),
    );

    const dismiss = useCallback(() => {
        setVisible(false);
        AsyncStorage.setItem(DISMISSED_KEY, "1").catch(() => {});
    }, []);

    if (!visible) return null;

    return (
        <Animated.View
            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
            <View style={styles.topRow}>
                <View style={styles.iconCircle}>
                    <Zap size={18} color={theme.colors.onPrimaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Log expenses automatically</Text>
                    <Text style={styles.body}>
                        Expense Tracker can read your bank and MoMo SMS on this phone and turn them
                        into entries for you. Nothing leaves your device.
                    </Text>
                </View>
                <TouchableOpacity onPress={dismiss} hitSlop={10} style={styles.dismissBtn}>
                    <X size={16} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.ctaBtn} onPress={onSetUp} activeOpacity={0.8}>
                <Text style={styles.ctaText}>Set up</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        card: {
            marginHorizontal: 20,
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
        },
        topRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
        },
        iconCircle: {
            width: 38,
            height: 38,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primaryContainer,
        },
        title: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        body: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 17,
            marginTop: 3,
        },
        dismissBtn: {
            padding: 2,
        },
        ctaBtn: {
            alignSelf: "flex-start",
            marginTop: 12,
            marginLeft: 50,
            paddingHorizontal: 18,
            height: 34,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
        },
        ctaText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimary,
        },
    });
