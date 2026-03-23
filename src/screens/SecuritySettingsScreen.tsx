import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Switch,
    BackHandler,
    Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Lock, Fingerprint, ScanFace, Trash2, Delete } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import {
    isPinEnabled,
    removePin,
    verifyPin,
    isBiometricsAvailable,
    isBiometricsEnabled,
    setBiometricsEnabled,
    getBiometricType,
} from "../utils/security";
import PinSetupScreen from "./PinSetupScreen";

interface SecuritySettingsScreenProps {
    onBack: () => void;
    onPinChanged: () => void;
}

export default function SecuritySettingsScreen({ onBack, onPinChanged }: SecuritySettingsScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [pinEnabled, setPinEnabled] = useState(false);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricsOn, setBiometricsOn] = useState(false);
    const [biometricType, setBiometricType] = useState("Biometrics");
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showPinVerify, setShowPinVerify] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const onBackPress = () => {
            if (showPinSetup) {
                setShowPinSetup(false);
                return true;
            }
            if (showPinVerify) {
                setShowPinVerify(false);
                return true;
            }
            onBack();
            return true;
        };
        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
    }, [showPinSetup, showPinVerify, onBack]);

    const loadSettings = useCallback(async () => {
        const [pinOn, bioAvail, bioOn, bioType] = await Promise.all([
            isPinEnabled(),
            isBiometricsAvailable(),
            isBiometricsEnabled(),
            getBiometricType(),
        ]);
        setPinEnabled(pinOn);
        setBiometricsAvailable(bioAvail);
        setBiometricsOn(bioOn);
        setBiometricType(bioType);
        setLoaded(true);
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleTogglePin = useCallback(() => {
        if (pinEnabled) {
            setShowPinVerify(true);
        } else {
            setShowPinSetup(true);
        }
    }, [pinEnabled]);

    const handlePinVerified = useCallback(async () => {
        setShowPinVerify(false);
        await removePin();
        setPinEnabled(false);
        setBiometricsOn(false);
        onPinChanged();
    }, [onPinChanged]);

    const handlePinSetupComplete = useCallback(async () => {
        setShowPinSetup(false);
        setPinEnabled(true);
        onPinChanged();
        if (await isBiometricsAvailable()) {
            Alert.alert(
                `Enable ${biometricType}?`,
                `Use ${biometricType.toLowerCase()} to unlock the app instead of entering your PIN each time.`,
                [
                    { text: "Not Now", style: "cancel" },
                    {
                        text: "Enable",
                        onPress: async () => {
                            await setBiometricsEnabled(true);
                            setBiometricsOn(true);
                        },
                    },
                ]
            );
        }
    }, [onPinChanged, biometricType]);

    const handleToggleBiometrics = useCallback(
        async (value: boolean) => {
            await setBiometricsEnabled(value);
            setBiometricsOn(value);
        },
        []
    );

    const handleChangePin = useCallback(() => {
        setShowPinSetup(true);
    }, []);

    if (showPinVerify) {
        return (
            <PinVerifyScreen
                theme={theme}
                onVerified={handlePinVerified}
                onBack={() => setShowPinVerify(false)}
            />
        );
    }

    if (showPinSetup) {
        return (
            <PinSetupScreen
                onComplete={handlePinSetupComplete}
                onBack={() => setShowPinSetup(false)}
            />
        );
    }

    if (!loaded) return null;

    const BiometricIcon = biometricType === "Face ID" ? ScanFace : Fingerprint;

    return (
        <View style={styles.container}>
            <View style={[styles.headerDecoration, { height: 180 + insets.top }]} />

            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={onBack}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ArrowLeft size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Security</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>App Lock</Text>
                    <View style={styles.groupCard}>
                        <View style={styles.row}>
                            <View style={[styles.iconCircle, { backgroundColor: "rgba(45, 106, 79, 0.1)" }]}>
                                <Lock size={18} color="#2D6A4F" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowText}>PIN Lock</Text>
                                <Text style={styles.rowSubText}>
                                    {pinEnabled ? "4-digit PIN is set" : "Protect your app with a PIN"}
                                </Text>
                            </View>
                            <Switch
                                value={pinEnabled}
                                onValueChange={handleTogglePin}
                                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                                thumbColor="white"
                            />
                        </View>

                        {pinEnabled && biometricsAvailable && (
                            <View style={styles.row}>
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(58, 125, 92, 0.1)" }]}>
                                    <BiometricIcon size={18} color="#3A7D5C" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>{biometricType}</Text>
                                    <Text style={styles.rowSubText}>
                                        Unlock with {biometricType.toLowerCase()}
                                    </Text>
                                </View>
                                <Switch
                                    value={biometricsOn}
                                    onValueChange={handleToggleBiometrics}
                                    trackColor={{ false: theme.colors.surface, true: "#3A7D5C" }}
                                    thumbColor="white"
                                />
                            </View>
                        )}

                        {pinEnabled && (
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={handleChangePin}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(193, 127, 89, 0.1)" }]}>
                                    <Lock size={18} color="#C17F59" />
                                </View>
                                <Text style={styles.rowText}>Change PIN</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {pinEnabled && (
                    <View style={styles.section}>
                        <View style={styles.groupCard}>
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={handleTogglePin}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(196, 69, 58, 0.1)" }]}>
                                    <Trash2 size={18} color="#C4453A" />
                                </View>
                                <Text style={[styles.rowText, { color: "#C4453A" }]}>Remove PIN</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function PinVerifyScreen({
    theme,
    onVerified,
    onBack,
}: {
    theme: any;
    onVerified: () => void;
    onBack: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const verifyStyles = useMemo(() => createVerifyStyles(theme), [theme]);

    const triggerShake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 16, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -16, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleDigit = useCallback(
        async (digit: string) => {
            if (error) return;
            const next = pin + digit;
            if (next.length > 4) return;
            setPin(next);

            if (next.length === 4) {
                const valid = await verifyPin(next);
                if (valid) {
                    onVerified();
                } else {
                    setError(true);
                    triggerShake();
                    setTimeout(() => {
                        setPin("");
                        setError(false);
                    }, 600);
                }
            }
        },
        [pin, error, onVerified, triggerShake]
    );

    const handleDelete = useCallback(() => {
        if (error) return;
        setPin((prev) => prev.slice(0, -1));
    }, [error]);

    useEffect(() => {
        const onBackPress = () => {
            onBack();
            return true;
        };
        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
    }, [onBack]);

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

    return (
        <View style={verifyStyles.container}>
            <View style={[verifyStyles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity
                    onPress={onBack}
                    style={verifyStyles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ArrowLeft size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={verifyStyles.headerTitle}>Verify PIN</Text>
            </View>

            <View style={verifyStyles.content}>
                <View style={verifyStyles.lockIconCircle}>
                    <Lock size={28} color={theme.colors.primary} />
                </View>
                <Text style={verifyStyles.subtitle}>Enter your current PIN to remove it</Text>

                <Animated.View style={[verifyStyles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
                    {[0, 1, 2, 3].map((i) => (
                        <View
                            key={i}
                            style={[
                                verifyStyles.dot,
                                i < pin.length && verifyStyles.dotFilled,
                                error && verifyStyles.dotError,
                            ]}
                        />
                    ))}
                </Animated.View>

                {error && <Text style={verifyStyles.errorText}>Incorrect PIN</Text>}

                <View style={verifyStyles.keypad}>
                    {keys.map((k, i) => {
                        if (k === "") {
                            return <View key={i} style={verifyStyles.key} />;
                        }
                        if (k === "del") {
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={verifyStyles.key}
                                    onPress={handleDelete}
                                    disabled={pin.length === 0 || error}
                                >
                                    <Delete
                                        size={22}
                                        color={pin.length === 0 || error ? theme.colors.border : theme.colors.text}
                                    />
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <TouchableOpacity
                                key={i}
                                style={verifyStyles.key}
                                onPress={() => handleDigit(k)}
                                disabled={error}
                            >
                                <Text style={verifyStyles.keyText}>{k}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const createVerifyStyles = (theme: any) =>
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
            color: theme.colors.text,
            letterSpacing: -0.3,
        },
        content: {
            flex: 1,
            alignItems: "center",
            paddingTop: 60,
        },
        lockIconCircle: {
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: "rgba(45, 106, 79, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
        },
        subtitle: {
            fontSize: 15,
            color: theme.colors.textSecondary,
            fontWeight: "500",
            marginBottom: 32,
        },
        dotsRow: {
            flexDirection: "row",
            gap: 18,
            marginBottom: 12,
        },
        dot: {
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: theme.colors.border,
        },
        dotFilled: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        dotError: {
            backgroundColor: "#C4453A",
            borderColor: "#C4453A",
        },
        errorText: {
            fontSize: 13,
            color: "#C4453A",
            fontWeight: "600",
            marginTop: 4,
        },
        keypad: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            width: 240,
            marginTop: 36,
            gap: 12,
        },
        key: {
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: theme.colors.card,
            alignItems: "center",
            justifyContent: "center",
        },
        keyText: {
            fontSize: 24,
            fontWeight: "400",
            color: theme.colors.text,
        },
    });

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        headerDecoration: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.incomeBg,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            opacity: 0.6,
        },
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
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: "800",
            color: theme.colors.text,
            letterSpacing: -0.3,
        },
        section: {
            marginTop: 24,
            paddingHorizontal: 20,
        },
        sectionLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textTransform: "uppercase",
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
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.borderLight,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
        },
        rowText: {
            flex: 1,
            fontSize: 15,
            fontWeight: "600",
            color: theme.colors.text,
            letterSpacing: -0.1,
        },
        rowSubText: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 1,
        },
    });
