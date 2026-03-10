import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Lock, Fingerprint, ScanFace, Trash2 } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import {
    isPinEnabled,
    removePin,
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
    const [loaded, setLoaded] = useState(false);

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
            Alert.alert(
                "Remove PIN",
                "This will remove your PIN lock and biometric authentication. Anyone will be able to open the app.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Remove",
                        style: "destructive",
                        onPress: async () => {
                            await removePin();
                            setPinEnabled(false);
                            setBiometricsOn(false);
                            onPinChanged();
                        },
                    },
                ]
            );
        } else {
            setShowPinSetup(true);
        }
    }, [pinEnabled, onPinChanged]);

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
                            <View style={[styles.iconCircle, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}>
                                <Lock size={18} color="#6366F1" />
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
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                                    <BiometricIcon size={18} color="#10B981" />
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
                                    trackColor={{ false: theme.colors.surface, true: "#10B981" }}
                                    thumbColor="white"
                                />
                            </View>
                        )}

                        {pinEnabled && (
                            <TouchableOpacity
                                style={[styles.row, { borderBottomWidth: 0 }]}
                                onPress={handleChangePin}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                                    <Lock size={18} color="#F59E0B" />
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
                                <View style={[styles.iconCircle, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                                    <Trash2 size={18} color="#EF4444" />
                                </View>
                                <Text style={[styles.rowText, { color: "#EF4444" }]}>Remove PIN</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

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
