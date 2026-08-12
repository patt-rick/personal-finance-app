import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,    useColorScheme,
} from "react-native";
import { appAlert } from "../components/dialog";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import {
    Fingerprint,
    Delete,
    ScanFace,
    ArrowLeft,
    Shield,
} from "lucide-react-native";
import {
    verifyPin,
    getSecurityQuestions,
    verifySecurityAnswers,
    removePin,
    setupPin,
    saveSecurityQuestions,
} from "../utils/security";
import { useTheme } from "../theme/theme";
import { useThemeContext } from "../theme/ThemeContext";

const { width, height } = Dimensions.get("window");

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

interface LockScreenProps {
    onUnlock: () => void;
    biometricsAvailable: boolean;
    biometricType: string;
    onBiometricAuth: () => void;
}

function WaveBackground({ isDark, primary }: { isDark: boolean; primary: string }) {
    const theme = useTheme();
    const primaryContainer = theme.colors.primaryContainer;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={StyleSheet.absoluteFill}
            >
                <Path
                    d={`M${width * 0.55},0
                        C${width * 0.4},${height * 0.06} ${width * 1.05},${height * 0.1} ${width},${height * 0.18}
                        L${width},0 Z`}
                    fill={primary}
                    opacity={isDark ? 0.15 : 0.7}
                />
                <Path
                    d={`M${width * 0.72},0
                        C${width * 0.5},${height * 0.05} ${width * 1.1},${height * 0.12} ${width},${height * 0.22}
                        L${width},${height * 0.15}
                        C${width * 0.9},${height * 0.08} ${width * 0.55},${height * 0.03} ${width * 0.82},0 Z`}
                    fill={primaryContainer}
                    opacity={isDark ? 0.3 : 0.5}
                />
                <Path
                    d={`M0,${height * 0.82}
                        C${width * 0.12},${height * 0.78} ${width * 0.08},${height * 0.9} ${width * 0.3},${height * 0.88}
                        C${width * 0.42},${height * 0.87} ${width * 0.35},${height * 0.95} ${width * 0.45},${height}
                        L0,${height} Z`}
                    fill={primary}
                    opacity={isDark ? 0.14 : 0.65}
                />
                <Path
                    d={`M0,${height * 0.88}
                        C${width * 0.08},${height * 0.85} ${width * 0.12},${height * 0.93} ${width * 0.3},${height * 0.92}
                        C${width * 0.38},${height * 0.915} ${width * 0.35},${height * 0.97} ${width * 0.42},${height}
                        L0,${height} Z`}
                    fill={primaryContainer}
                    opacity={isDark ? 0.2 : 0.35}
                />
            </Svg>
        </View>
    );
}

function PinDot({
    filled,
    error,
    shakeAnim,
    theme,
}: {
    filled: boolean;
    error: boolean;
    index: number;
    shakeAnim: Animated.Value;
    theme: ReturnType<typeof useTheme>;
    isDark: boolean;
}) {
    const scale = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (filled) {
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    friction: 5,
                    tension: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(glowOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scale, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(glowOpacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [filled, scale, glowOpacity]);

    const dotColor = error ? theme.colors.error : theme.colors.primary;
    const glowColor = error
        ? theme.colors.errorContainer
        : theme.colors.primaryContainer;
    const ringBorderColor = error
        ? theme.colors.error
        : theme.colors.outline;

    return (
        <Animated.View
            style={[
                dotStyles.outer,
                { transform: [{ translateX: shakeAnim }] },
            ]}
        >
            <Animated.View
                style={[
                    dotStyles.glow,
                    { backgroundColor: glowColor, opacity: glowOpacity },
                ]}
            />
            <View style={[dotStyles.ring, { borderColor: ringBorderColor }]}>
                <Animated.View
                    style={[
                        dotStyles.fill,
                        { backgroundColor: dotColor, transform: [{ scale }] },
                    ]}
                />
            </View>
        </Animated.View>
    );
}

function NumKey({
    label,
    onPress,
    disabled,
    theme,
}: {
    label: string;
    onPress: () => void;
    disabled: boolean;
    theme: ReturnType<typeof useTheme>;
    isDark: boolean;
}) {
    const pressAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.timing(pressAnim, {
            toValue: 0.88,
            duration: 80,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(pressAnim, {
            toValue: 1,
            friction: 5,
            tension: 200,
            useNativeDriver: true,
        }).start();
    };

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={keypadStyles.touchable}
        >
            <Animated.View
                style={[
                    keypadStyles.outer,
                    {
                        transform: [{ scale: pressAnim }],
                        opacity: disabled ? 0.3 : 1,
                        backgroundColor: theme.colors.surfaceContainerLow,
                        ...theme.elevation.level1,
                        shadowColor: theme.colors.shadow,
                    },
                ]}
            >
                <Text
                    style={[
                        keypadStyles.label,
                        {
                            color: theme.colors.onSurface,
                            fontFamily: theme.fonts.regular,
                        },
                    ]}
                >
                    {label}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function LockScreen({
    onUnlock,
    biometricsAvailable,
    biometricType,
    onBiometricAuth,
}: LockScreenProps) {
    const theme = useTheme();
    const { themeMode } = useThemeContext();
    const systemColorScheme = useColorScheme();
    const isDark =
        themeMode === "system"
            ? systemColorScheme === "dark"
            : themeMode === "dark";

    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);
    const [showRecovery, setShowRecovery] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    const isLockedOut = lockoutRemaining > 0;

    useEffect(() => {
        Animated.timing(fadeIn, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        if (biometricsAvailable) {
            const timer = setTimeout(() => onBiometricAuth(), 400);
            return () => clearTimeout(timer);
        }
    }, [fadeIn, biometricsAvailable, onBiometricAuth]);

    useEffect(() => {
        if (lockoutRemaining <= 0) return;
        const timer = setInterval(() => {
            setLockoutRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [lockoutRemaining]);

    const triggerShake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 18, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -18, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 14, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -14, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleDigit = useCallback(
        async (digit: string) => {
            if (isLockedOut || error) return;
            const next = pin + digit;
            if (next.length > 4) return;
            setPin(next);
            if (next.length === 4) {
                const valid = await verifyPin(next);
                if (valid) {
                    onUnlock();
                } else {
                    setError(true);
                    triggerShake();
                    const newAttempts = attempts + 1;
                    setAttempts(newAttempts);
                    if (newAttempts >= MAX_ATTEMPTS) {
                        setLockoutRemaining(LOCKOUT_SECONDS);
                        setAttempts(0);
                    }
                    setTimeout(() => {
                        setPin("");
                        setError(false);
                    }, 600);
                }
            }
        },
        [pin, isLockedOut, error, attempts, onUnlock, triggerShake]
    );

    const handleDelete = useCallback(() => {
        if (isLockedOut || error) return;
        setPin((prev) => prev.slice(0, -1));
    }, [isLockedOut, error]);

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const BiometricIcon = biometricType === "Face ID" ? ScanFace : Fingerprint;
    const deleteIconColor = isLockedOut || pin.length === 0
        ? theme.colors.outlineVariant
        : theme.colors.onSurface;
    const biometricIconColor = isLockedOut
        ? theme.colors.outlineVariant
        : theme.colors.onSurface;

    if (showRecovery) {
        return (
            <PinRecoveryScreen
                onRecovered={onUnlock}
                onBack={() => setShowRecovery(false)}
            />
        );
    }

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <StatusBar
                style={isDark ? "light" : "dark"}
                backgroundColor={theme.colors.background}
            />
            <WaveBackground isDark={isDark} primary={theme.colors.primary} />

            <Animated.View style={[styles.content, { opacity: fadeIn }]}>
                <View style={styles.headerSection}>
                    <View
                        style={[
                            styles.logoContainer,
                            {
                                backgroundColor: theme.colors.surfaceContainerLow,
                                ...theme.elevation.level1,
                                shadowColor: theme.colors.shadow,
                            },
                        ]}
                    >
                        <Image
                            source={require("../icon.png")}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.colors.onSurface,
                                fontFamily: theme.fonts.semibold,
                            },
                        ]}
                    >
                        {isLockedOut ? "Too Many Attempts" : "Enter PIN"}
                    </Text>
                </View>

                {isLockedOut ? (
                    <View style={styles.lockoutContainer}>
                        <Text
                            style={[
                                styles.lockoutText,
                                {
                                    color: theme.colors.error,
                                    fontFamily: theme.fonts.semibold,
                                },
                            ]}
                        >
                            Try again in {lockoutRemaining}s
                        </Text>
                        <View
                            style={[
                                styles.lockoutBar,
                                { backgroundColor: theme.colors.surfaceContainerHighest },
                            ]}
                        >
                            <View
                                style={[
                                    styles.lockoutProgress,
                                    {
                                        backgroundColor: theme.colors.primary,
                                        opacity: 0.6,
                                        width: `${((LOCKOUT_SECONDS - lockoutRemaining) / LOCKOUT_SECONDS) * 100}%`,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.dotsRow}>
                            {[0, 1, 2, 3].map((i) => (
                                <PinDot
                                    key={i}
                                    index={i}
                                    filled={i < pin.length}
                                    error={error}
                                    shakeAnim={shakeAnim}
                                    theme={theme}
                                    isDark={isDark}
                                />
                            ))}
                        </View>
                        {attempts > 0 && (
                            <Text
                                style={[
                                    styles.attemptsText,
                                    {
                                        color: theme.colors.error,
                                        fontFamily: theme.fonts.regular,
                                    },
                                ]}
                            >
                                {MAX_ATTEMPTS - attempts} attempt
                                {MAX_ATTEMPTS - attempts !== 1 ? "s" : ""}{" "}
                                remaining
                            </Text>
                        )}
                    </>
                )}

                <View style={keypadStyles.keypad}>
                    {keys.map((k) => (
                        <NumKey
                            key={k}
                            label={k}
                            onPress={() => handleDigit(k)}
                            disabled={isLockedOut}
                            theme={theme}
                            isDark={isDark}
                        />
                    ))}
                    <View style={keypadStyles.touchable}>
                        {biometricsAvailable ? (
                            <TouchableOpacity
                                style={keypadStyles.actionKey}
                                onPress={onBiometricAuth}
                                disabled={isLockedOut}
                            >
                                <BiometricIcon
                                    size={26}
                                    color={biometricIconColor}
                                />
                            </TouchableOpacity>
                        ) : (
                            <View style={keypadStyles.actionKey} />
                        )}
                    </View>
                    <NumKey
                        label="0"
                        onPress={() => handleDigit("0")}
                        disabled={isLockedOut}
                        theme={theme}
                        isDark={isDark}
                    />
                    <View style={keypadStyles.touchable}>
                        <TouchableOpacity
                            style={keypadStyles.actionKey}
                            onPress={handleDelete}
                            disabled={isLockedOut || pin.length === 0}
                        >
                            <Delete size={24} color={deleteIconColor} />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.forgotBtn}
                    onPress={() => setShowRecovery(true)}
                >
                    <Text
                        style={[
                            styles.forgotText,
                            {
                                color: theme.colors.primary,
                                fontFamily: theme.fonts.semibold,
                            },
                        ]}
                    >
                        Forgot PIN?
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

function PinRecoveryScreen({
    onRecovered,
    onBack,
}: {
    onRecovered: () => void;
    onBack: () => void;
}) {
    const theme = useTheme();
    const { themeMode } = useThemeContext();
    const systemColorScheme = useColorScheme();
    const isDark =
        themeMode === "system"
            ? systemColorScheme === "dark"
            : themeMode === "dark";

    const [questions, setQuestions] = useState<{
        q1: string;
        q2: string;
    } | null>(null);
    const [a1, setA1] = useState("");
    const [a2, setA2] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const scrollRef = useRef<ScrollView>(null);
    const [stage, setStage] = useState<"answers" | "newpin" | "confirmpin">(
        "answers"
    );
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinError, setPinError] = useState("");
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        getSecurityQuestions().then((qs) => {
            if (!qs) {
                appAlert(
                    "No Recovery Available",
                    "Security questions were not set up. You cannot recover your PIN.",
                    [{ text: "OK", onPress: onBack }]
                );
            } else {
                setQuestions(qs);
            }
        });
    }, [onBack]);

    const triggerShake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 16, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -16, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleVerifyAnswers = useCallback(async () => {
        if (!a1.trim() || !a2.trim()) return;
        setVerifying(true);
        setErrorMsg("");
        const valid = await verifySecurityAnswers(a1, a2);
        setVerifying(false);
        if (valid) {
            setStage("newpin");
        } else {
            setErrorMsg("Incorrect answers. Please try again.");
        }
    }, [a1, a2]);

    const handlePinDigit = useCallback(
        async (digit: string) => {
            if (pinError) return;
            if (stage === "newpin") {
                const next = newPin + digit;
                if (next.length > 4) return;
                setNewPin(next);
                if (next.length === 4) {
                    setStage("confirmpin");
                }
            } else {
                const next = confirmPin + digit;
                if (next.length > 4) return;
                setConfirmPin(next);
                if (next.length === 4) {
                    if (next === newPin) {
                        await removePin();
                        await setupPin(next);
                        if (questions) {
                            await saveSecurityQuestions(
                                questions.q1,
                                a1,
                                questions.q2,
                                a2
                            );
                        }
                        onRecovered();
                    } else {
                        setPinError("PINs don't match");
                        triggerShake();
                        setTimeout(() => {
                            setNewPin("");
                            setConfirmPin("");
                            setPinError("");
                            setStage("newpin");
                        }, 800);
                    }
                }
            }
        },
        [
            stage,
            newPin,
            confirmPin,
            pinError,
            questions,
            a1,
            a2,
            onRecovered,
            triggerShake,
        ]
    );

    const handlePinDelete = useCallback(() => {
        if (pinError) return;
        if (stage === "newpin") {
            setNewPin((prev) => prev.slice(0, -1));
        } else {
            setConfirmPin((prev) => prev.slice(0, -1));
        }
    }, [stage, pinError]);

    if (!questions) return null;

    if (stage === "answers") {
        const canSubmit = a1.trim().length >= 2 && a2.trim().length >= 2;
        return (
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.colors.background },
                ]}
            >
                <StatusBar
                    style={isDark ? "light" : "dark"}
                    backgroundColor={theme.colors.background}
                />
                <WaveBackground isDark={isDark} primary={theme.colors.primary} />
                <TouchableOpacity
                    style={[
                        styles.backButton,
                        {
                            backgroundColor: theme.colors.surfaceContainerLow,
                            ...theme.elevation.level1,
                            shadowColor: theme.colors.shadow,
                        },
                    ]}
                    onPress={onBack}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <ArrowLeft size={22} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={recoveryStyles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View
                            style={[
                                recoveryStyles.iconCircle,
                                { backgroundColor: theme.colors.primaryContainer },
                            ]}
                        >
                            <Shield size={28} color={theme.colors.onPrimaryContainer} />
                        </View>
                        <Text
                            style={[
                                recoveryStyles.title,
                                {
                                    color: theme.colors.onSurface,
                                    fontFamily: theme.fonts.semibold,
                                },
                            ]}
                        >
                            Recover Your PIN
                        </Text>
                        <Text
                            style={[
                                recoveryStyles.subtitle,
                                {
                                    color: theme.colors.onSurfaceVariant,
                                    fontFamily: theme.fonts.regular,
                                },
                            ]}
                        >
                            Answer your security questions to reset your PIN
                        </Text>

                        <View style={recoveryStyles.questionBlock}>
                            <Text
                                style={[
                                    recoveryStyles.label,
                                    {
                                        color: theme.colors.onSurfaceVariant,
                                        fontFamily: theme.fonts.semibold,
                                    },
                                ]}
                            >
                                {questions.q1}
                            </Text>
                            <TextInput
                                style={[
                                    recoveryStyles.input,
                                    {
                                        backgroundColor: theme.colors.surfaceContainerHigh,
                                        color: theme.colors.onSurface,
                                        fontFamily: theme.fonts.regular,
                                    },
                                ]}
                                placeholder="Your answer"
                                placeholderTextColor={theme.colors.onSurfaceVariant}
                                value={a1}
                                onChangeText={(t) => {
                                    setA1(t);
                                    setErrorMsg("");
                                }}
                                autoCapitalize="none"
                                onFocus={(e) => {
                                    const target = e.target;
                                    setTimeout(() => {
                                        (target as any).measureInWindow?.(
                                            (_x: number, y: number) => {
                                                scrollRef.current?.scrollTo({
                                                    y: Math.max(0, y - 150),
                                                    animated: true,
                                                });
                                            }
                                        );
                                    }, 300);
                                }}
                            />
                        </View>

                        <View style={recoveryStyles.questionBlock}>
                            <Text
                                style={[
                                    recoveryStyles.label,
                                    {
                                        color: theme.colors.onSurfaceVariant,
                                        fontFamily: theme.fonts.semibold,
                                    },
                                ]}
                            >
                                {questions.q2}
                            </Text>
                            <TextInput
                                style={[
                                    recoveryStyles.input,
                                    {
                                        backgroundColor: theme.colors.surfaceContainerHigh,
                                        color: theme.colors.onSurface,
                                        fontFamily: theme.fonts.regular,
                                    },
                                ]}
                                placeholder="Your answer"
                                placeholderTextColor={theme.colors.onSurfaceVariant}
                                value={a2}
                                onChangeText={(t) => {
                                    setA2(t);
                                    setErrorMsg("");
                                }}
                                autoCapitalize="none"
                                onFocus={(e) => {
                                    const target = e.target;
                                    setTimeout(() => {
                                        (target as any).measureInWindow?.(
                                            (_x: number, y: number) => {
                                                scrollRef.current?.scrollTo({
                                                    y: Math.max(0, y - 150),
                                                    animated: true,
                                                });
                                            }
                                        );
                                    }, 300);
                                }}
                            />
                        </View>

                        {errorMsg ? (
                            <Text
                                style={[
                                    recoveryStyles.error,
                                    {
                                        color: theme.colors.error,
                                        fontFamily: theme.fonts.semibold,
                                    },
                                ]}
                            >
                                {errorMsg}
                            </Text>
                        ) : null}

                        <TouchableOpacity
                            style={[
                                recoveryStyles.submitBtn,
                                {
                                    backgroundColor:
                                        !canSubmit || verifying
                                            ? theme.colors.surfaceContainerHighest
                                            : theme.colors.primary,
                                },
                            ]}
                            disabled={!canSubmit || verifying}
                            onPress={handleVerifyAnswers}
                        >
                            <Text
                                style={[
                                    recoveryStyles.submitBtnText,
                                    {
                                        fontFamily: theme.fonts.semibold,
                                        color:
                                            !canSubmit || verifying
                                                ? theme.colors.onSurfaceVariant
                                                : theme.colors.onPrimary,
                                    },
                                ]}
                            >
                                {verifying ? "Verifying..." : "Verify Answers"}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        );
    }

    const currentPin = stage === "newpin" ? newPin : confirmPin;
    const pinTitle = stage === "newpin" ? "Create New PIN" : "Confirm New PIN";
    const pinSub =
        stage === "newpin"
            ? "Choose a new 4-digit PIN"
            : "Re-enter your new PIN";
    const pinKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const deleteIconColor = currentPin.length === 0
        ? theme.colors.outlineVariant
        : theme.colors.onSurface;

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <StatusBar
                style={isDark ? "light" : "dark"}
                backgroundColor={theme.colors.background}
            />
            <WaveBackground isDark={isDark} primary={theme.colors.primary} />

            <TouchableOpacity
                style={[
                    styles.backButton,
                    {
                        backgroundColor: theme.colors.surfaceContainerLow,
                        ...theme.elevation.level1,
                        shadowColor: theme.colors.shadow,
                    },
                ]}
                onPress={() => {
                    if (stage === "confirmpin") {
                        setConfirmPin("");
                        setPinError("");
                        setStage("newpin");
                        setNewPin("");
                    } else {
                        setNewPin("");
                        setStage("answers");
                    }
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <ArrowLeft size={22} color={theme.colors.onSurface} />
            </TouchableOpacity>

            <View style={styles.content}>
                <Text
                    style={[
                        styles.title,
                        {
                            color: theme.colors.onSurface,
                            fontFamily: theme.fonts.semibold,
                        },
                    ]}
                >
                    {pinTitle}
                </Text>
                <Text
                    style={[
                        recoveryStyles.pinSubtitle,
                        {
                            color: theme.colors.onSurfaceVariant,
                            fontFamily: theme.fonts.regular,
                        },
                    ]}
                >
                    {pinSub}
                </Text>

                <Animated.View
                    style={[
                        styles.dotsRow,
                        { transform: [{ translateX: shakeAnim }] },
                    ]}
                >
                    {[0, 1, 2, 3].map((i) => (
                        <View
                            key={i}
                            style={[
                                recoveryStyles.dot,
                                {
                                    borderColor: pinError
                                        ? theme.colors.error
                                        : theme.colors.outline,
                                },
                                i < currentPin.length && {
                                    backgroundColor: pinError
                                        ? theme.colors.error
                                        : theme.colors.primary,
                                    borderColor: pinError
                                        ? theme.colors.error
                                        : theme.colors.primary,
                                },
                            ]}
                        />
                    ))}
                </Animated.View>

                {pinError ? (
                    <Text
                        style={[
                            recoveryStyles.pinErrorText,
                            {
                                color: theme.colors.error,
                                fontFamily: theme.fonts.semibold,
                            },
                        ]}
                    >
                        {pinError}
                    </Text>
                ) : (
                    <View style={{ height: 22 }} />
                )}

                <View style={keypadStyles.keypad}>
                    {pinKeys.map((k) => (
                        <NumKey
                            key={k}
                            label={k}
                            onPress={() => handlePinDigit(k)}
                            disabled={false}
                            theme={theme}
                            isDark={isDark}
                        />
                    ))}
                    <View style={keypadStyles.touchable} />
                    <NumKey
                        label="0"
                        onPress={() => handlePinDigit("0")}
                        disabled={false}
                        theme={theme}
                        isDark={isDark}
                    />
                    <View style={keypadStyles.touchable}>
                        <TouchableOpacity
                            style={keypadStyles.actionKey}
                            onPress={handlePinDelete}
                            disabled={currentPin.length === 0}
                        >
                            <Delete size={24} color={deleteIconColor} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const KEY_SIZE = Math.min((width - 120) / 3, 76);

const dotStyles = StyleSheet.create({
    outer: {
        width: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    glow: {
        position: "absolute",
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    ring: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    fill: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});

const keypadStyles = StyleSheet.create({
    keypad: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        width: KEY_SIZE * 3 + 36,
        marginTop: 24,
        gap: 12,
    },
    touchable: {
        width: KEY_SIZE,
        height: KEY_SIZE,
    },
    outer: {
        width: "100%",
        height: "100%",
        borderRadius: KEY_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: 24,
        fontVariant: ["tabular-nums"],
    },
    actionKey: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    headerSection: {
        alignItems: "center",
        marginBottom: 28,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    logoImage: {
        width: 48,
        height: 48,
    },
    title: {
        fontSize: 20,
    },
    dotsRow: {
        flexDirection: "row",
        gap: 20,
        marginBottom: 12,
    },
    attemptsText: {
        fontSize: 12,
        marginTop: 4,
    },
    lockoutContainer: {
        alignItems: "center",
        marginBottom: 12,
    },
    lockoutText: {
        fontSize: 14,
        marginBottom: 12,
    },
    lockoutBar: {
        width: 160,
        height: 3,
        borderRadius: 2,
        overflow: "hidden",
    },
    lockoutProgress: {
        height: "100%",
        borderRadius: 2,
    },
    forgotBtn: {
        marginTop: 24,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    forgotText: {
        fontSize: 13,
    },
    backButton: {
        position: "absolute",
        top: 56,
        left: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
});

const recoveryStyles = StyleSheet.create({
    scrollContent: {
        paddingTop: 120,
        paddingHorizontal: 28,
        paddingBottom: 40,
        alignItems: "center",
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 36,
        textAlign: "center",
    },
    questionBlock: {
        width: "100%",
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 14,
    },
    error: {
        fontSize: 13,
        marginBottom: 16,
        textAlign: "center",
    },
    submitBtn: {
        width: "100%",
        height: 52,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
    },
    submitBtnText: {
        fontSize: 15,
    },
    pinSubtitle: {
        fontSize: 13,
        marginBottom: 28,
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
    },
    pinErrorText: {
        fontSize: 12,
        marginTop: 4,
        height: 22,
    },
});
