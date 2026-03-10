import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Fingerprint, Delete, ScanFace } from "lucide-react-native";
import { verifyPin } from "../utils/security";

const { width, height } = Dimensions.get("window");

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

interface LockScreenProps {
    onUnlock: () => void;
    biometricsAvailable: boolean;
    biometricType: string;
    onBiometricAuth: () => void;
}

function FloatingOrb({
    size,
    color,
    startX,
    startY,
    delay,
}: {
    size: number;
    color: string;
    startX: number;
    startY: number;
    delay: number;
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration: 1200,
            delay,
            useNativeDriver: true,
        }).start(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(translateY, {
                        toValue: -12,
                        duration: 3000 + delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateY, {
                        toValue: 12,
                        duration: 3000 + delay,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        });
    }, [opacity, translateY, delay]);

    return (
        <Animated.View
            style={{
                position: "absolute",
                left: startX,
                top: startY,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateY }],
            }}
        />
    );
}

function LogoMark() {
    const rotation = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 10000,
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseScale, {
                        toValue: 1.12,
                        duration: 2400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseOpacity, {
                        toValue: 0,
                        duration: 2400,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseScale, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseOpacity, {
                        toValue: 0.3,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    }, [rotation, pulseScale, pulseOpacity]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <View style={styles.logoWrapper}>
            <View style={styles.shimmerContainer}>
                <Animated.View
                    style={[
                        styles.pulseRing,
                        { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                    ]}
                />
                <Animated.View
                    style={[styles.shimmerRing, { transform: [{ rotate: spin }] }]}
                >
                    <LinearGradient
                        colors={[
                            "rgba(99, 102, 241, 0.5)",
                            "transparent",
                            "rgba(168, 85, 247, 0.5)",
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.shimmerGradient}
                    />
                </Animated.View>
            </View>
            <View style={styles.logoContainer}>
                <LinearGradient
                    colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.03)"]}
                    style={styles.logoGlassBg}
                />
                <Image
                    source={require("../icon.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </View>
        </View>
    );
}

function PinDot({
    filled,
    error,
    index,
    shakeAnim,
}: {
    filled: boolean;
    error: boolean;
    index: number;
    shakeAnim: Animated.Value;
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

    const dotColor = error ? "#EF4444" : "#6366F1";
    const glowColor = error ? "rgba(239, 68, 68, 0.4)" : "rgba(99, 102, 241, 0.4)";

    return (
        <Animated.View
            style={[
                styles.dotOuter,
                { transform: [{ translateX: shakeAnim }] },
            ]}
        >
            <Animated.View
                style={[
                    styles.dotGlow,
                    {
                        backgroundColor: glowColor,
                        opacity: glowOpacity,
                    },
                ]}
            />
            <View
                style={[
                    styles.dotRing,
                    {
                        borderColor: error
                            ? "rgba(239, 68, 68, 0.5)"
                            : "rgba(255, 255, 255, 0.15)",
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.dotFill,
                        {
                            backgroundColor: dotColor,
                            transform: [{ scale }],
                        },
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
}: {
    label: string;
    onPress: () => void;
    disabled: boolean;
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
            style={styles.keyTouchable}
        >
            <Animated.View
                style={[
                    styles.keyOuter,
                    {
                        transform: [{ scale: pressAnim }],
                        opacity: disabled ? 0.3 : 1,
                    },
                ]}
            >
                <LinearGradient
                    colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
                    style={styles.keyGlass}
                />
                <Text style={styles.keyLabel}>{label}</Text>
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
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);

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

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#0B0F1A" />
            <LinearGradient
                colors={["#0B0F1A", "#131B2E", "#1A1040"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <FloatingOrb size={180} color="rgba(99, 102, 241, 0.05)" startX={-30} startY={height * 0.08} delay={0} />
            <FloatingOrb size={140} color="rgba(168, 85, 247, 0.04)" startX={width - 60} startY={height * 0.2} delay={500} />
            <FloatingOrb size={100} color="rgba(59, 130, 246, 0.04)" startX={width * 0.25} startY={height * 0.75} delay={300} />

            <Animated.View style={[styles.content, { opacity: fadeIn }]}>
                <LogoMark />

                <Text style={styles.title}>
                    {isLockedOut ? "Too Many Attempts" : "Enter PIN"}
                </Text>

                {isLockedOut ? (
                    <View style={styles.lockoutContainer}>
                        <Text style={styles.lockoutText}>
                            Try again in {lockoutRemaining}s
                        </Text>
                        <View style={styles.lockoutBar}>
                            <View
                                style={[
                                    styles.lockoutProgress,
                                    {
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
                                />
                            ))}
                        </View>
                        {attempts > 0 && (
                            <Text style={styles.attemptsText}>
                                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining
                            </Text>
                        )}
                    </>
                )}

                <View style={styles.keypad}>
                    {keys.map((k) => (
                        <NumKey
                            key={k}
                            label={k}
                            onPress={() => handleDigit(k)}
                            disabled={isLockedOut}
                        />
                    ))}

                    <View style={styles.keyTouchable}>
                        {biometricsAvailable ? (
                            <TouchableOpacity
                                style={styles.actionKey}
                                onPress={onBiometricAuth}
                                disabled={isLockedOut}
                            >
                                <BiometricIcon
                                    size={26}
                                    color={isLockedOut ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)"}
                                />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.actionKey} />
                        )}
                    </View>

                    <NumKey
                        label="0"
                        onPress={() => handleDigit("0")}
                        disabled={isLockedOut}
                    />

                    <View style={styles.keyTouchable}>
                        <TouchableOpacity
                            style={styles.actionKey}
                            onPress={handleDelete}
                            disabled={isLockedOut || pin.length === 0}
                        >
                            <Delete
                                size={24}
                                color={
                                    isLockedOut || pin.length === 0
                                        ? "rgba(255,255,255,0.15)"
                                        : "rgba(255,255,255,0.7)"
                                }
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const LOGO_OUTER = 88;
const LOGO_INNER = 72;
const KEY_SIZE = Math.min((width - 120) / 3, 76);

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

    logoWrapper: {
        alignItems: "center",
        justifyContent: "center",
        width: LOGO_OUTER + 28,
        height: LOGO_OUTER + 28,
        marginBottom: 28,
    },
    shimmerContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    shimmerRing: {
        width: LOGO_OUTER + 14,
        height: LOGO_OUTER + 14,
        borderRadius: (LOGO_OUTER + 14) / 2,
        overflow: "hidden",
    },
    shimmerGradient: {
        flex: 1,
        borderRadius: (LOGO_OUTER + 14) / 2,
    },
    pulseRing: {
        position: "absolute",
        width: LOGO_OUTER + 14,
        height: LOGO_OUTER + 14,
        borderRadius: (LOGO_OUTER + 14) / 2,
        borderWidth: 1,
        borderColor: "rgba(99, 102, 241, 0.25)",
    },
    logoContainer: {
        position: "absolute",
        width: LOGO_INNER,
        height: LOGO_INNER,
        borderRadius: LOGO_INNER / 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.10)",
    },
    logoGlassBg: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: LOGO_INNER / 2,
    },
    logoImage: {
        width: 44,
        height: 44,
    },

    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.7)",
        letterSpacing: 1.5,
        marginBottom: 28,
    },

    dotsRow: {
        flexDirection: "row",
        gap: 20,
        marginBottom: 12,
    },
    dotOuter: {
        width: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    dotGlow: {
        position: "absolute",
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    dotRing: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    dotFill: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    attemptsText: {
        fontSize: 12,
        color: "rgba(239, 68, 68, 0.8)",
        marginTop: 4,
        letterSpacing: 0.5,
    },

    lockoutContainer: {
        alignItems: "center",
        marginBottom: 12,
    },
    lockoutText: {
        fontSize: 14,
        color: "rgba(239, 68, 68, 0.9)",
        fontWeight: "600",
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    lockoutBar: {
        width: 160,
        height: 3,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 2,
        overflow: "hidden",
    },
    lockoutProgress: {
        height: "100%",
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderRadius: 2,
    },

    keypad: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        width: KEY_SIZE * 3 + 36,
        marginTop: 24,
        gap: 12,
    },
    keyTouchable: {
        width: KEY_SIZE,
        height: KEY_SIZE,
    },
    keyOuter: {
        width: "100%",
        height: "100%",
        borderRadius: KEY_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    keyGlass: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: KEY_SIZE / 2,
    },
    keyLabel: {
        fontSize: 26,
        fontWeight: "300",
        color: "rgba(255, 255, 255, 0.85)",
        letterSpacing: 0.5,
    },
    actionKey: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
});
