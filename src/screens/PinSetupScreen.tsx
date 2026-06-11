import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import {
    ArrowLeft,
    Delete,
    ChevronDown,
    Check,
    Shield,
} from "lucide-react-native";
import {
    setupPin,
    saveSecurityQuestions,
    SECURITY_QUESTIONS,
} from "../utils/security";
import { useTheme } from "../theme/theme";
import { useThemeContext } from "../theme/ThemeContext";

const { width, height } = Dimensions.get("window");

interface PinSetupScreenProps {
    onComplete: () => void;
    onBack: () => void;
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

function SecurityQuestionsStep({
    onComplete: onQuestionsComplete,
    onBack: onQuestionsBack,
}: {
    onComplete: (q1: string, a1: string, q2: string, a2: string) => void;
    onBack: () => void;
}) {
    const theme = useTheme();
    const { themeMode } = useThemeContext();
    const systemColorScheme = useColorScheme();
    const isDark =
        themeMode === "system"
            ? systemColorScheme === "dark"
            : themeMode === "dark";

    const [q1, setQ1] = useState("");
    const [a1, setA1] = useState("");
    const [q2, setQ2] = useState("");
    const [a2, setA2] = useState("");
    const [showQ1Picker, setShowQ1Picker] = useState(false);
    const [showQ2Picker, setShowQ2Picker] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    const availableForQ2 = SECURITY_QUESTIONS.filter((q) => q !== q1);
    const canContinue =
        q1 && a1.trim().length >= 2 && q2 && a2.trim().length >= 2 && q1 !== q2;

    const scrollToInput = (y: number) => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({
                y: Math.max(0, y - 150),
                animated: true,
            });
        }, 300);
    };

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
                onPress={onQuestionsBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <ArrowLeft size={22} color={theme.colors.onSurface} />
            </TouchableOpacity>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={sqStyles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={[
                            sqStyles.iconCircle,
                            { backgroundColor: theme.colors.primaryContainer },
                        ]}
                    >
                        <Shield size={28} color={theme.colors.onPrimaryContainer} />
                    </View>
                    <Text
                        style={[
                            sqStyles.title,
                            {
                                color: theme.colors.onSurface,
                                fontFamily: theme.fonts.semibold,
                            },
                        ]}
                    >
                        Security Questions
                    </Text>
                    <Text
                        style={[
                            sqStyles.subtitle,
                            {
                                color: theme.colors.onSurfaceVariant,
                                fontFamily: theme.fonts.regular,
                            },
                        ]}
                    >
                        These will help you recover your PIN if you forget it
                    </Text>

                    <View style={sqStyles.questionBlock}>
                        <Text
                            style={[
                                sqStyles.label,
                                {
                                    color: theme.colors.onSurfaceVariant,
                                    fontFamily: theme.fonts.semibold,
                                },
                            ]}
                        >
                            Question 1
                        </Text>
                        <TouchableOpacity
                            style={[
                                sqStyles.picker,
                                { backgroundColor: theme.colors.surfaceContainerHigh },
                            ]}
                            onPress={() => {
                                setShowQ1Picker(!showQ1Picker);
                                setShowQ2Picker(false);
                            }}
                        >
                            <Text
                                style={[
                                    sqStyles.pickerText,
                                    {
                                        color: theme.colors.onSurface,
                                        fontFamily: theme.fonts.regular,
                                    },
                                    !q1 && { color: theme.colors.onSurfaceVariant },
                                ]}
                            >
                                {q1 || "Select a question"}
                            </Text>
                            <ChevronDown size={18} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                        {showQ1Picker && (
                            <View
                                style={[
                                    sqStyles.dropdown,
                                    {
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                            >
                                {SECURITY_QUESTIONS.map((q) => (
                                    <TouchableOpacity
                                        key={q}
                                        style={[
                                            sqStyles.dropdownItem,
                                            { borderBottomColor: theme.colors.outlineVariant },
                                            q === q1 && {
                                                backgroundColor: theme.colors.primaryContainer,
                                            },
                                        ]}
                                        onPress={() => {
                                            setQ1(q);
                                            setShowQ1Picker(false);
                                            if (q === q2) setQ2("");
                                        }}
                                    >
                                        <Text
                                            style={[
                                                sqStyles.dropdownText,
                                                {
                                                    color: theme.colors.onSurfaceVariant,
                                                    fontFamily: theme.fonts.regular,
                                                },
                                                q === q1 && {
                                                    color: theme.colors.onPrimaryContainer,
                                                    fontFamily: theme.fonts.semibold,
                                                },
                                            ]}
                                        >
                                            {q}
                                        </Text>
                                        {q === q1 && (
                                            <Check size={16} color={theme.colors.onPrimaryContainer} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TextInput
                            style={[
                                sqStyles.input,
                                {
                                    backgroundColor: theme.colors.surfaceContainerHigh,
                                    color: theme.colors.onSurface,
                                    fontFamily: theme.fonts.regular,
                                },
                            ]}
                            placeholder="Your answer"
                            placeholderTextColor={theme.colors.onSurfaceVariant}
                            value={a1}
                            onChangeText={setA1}
                            autoCapitalize="none"
                            onFocus={(e) => {
                                setShowQ1Picker(false);
                                setShowQ2Picker(false);
                                const target = e.target;
                                setTimeout(() => {
                                    (target as any).measureInWindow?.(
                                        (_x: number, y: number) => {
                                            scrollToInput(y);
                                        }
                                    );
                                }, 100);
                            }}
                        />
                    </View>

                    <View style={sqStyles.questionBlock}>
                        <Text
                            style={[
                                sqStyles.label,
                                {
                                    color: theme.colors.onSurfaceVariant,
                                    fontFamily: theme.fonts.semibold,
                                },
                            ]}
                        >
                            Question 2
                        </Text>
                        <TouchableOpacity
                            style={[
                                sqStyles.picker,
                                { backgroundColor: theme.colors.surfaceContainerHigh },
                            ]}
                            onPress={() => {
                                setShowQ2Picker(!showQ2Picker);
                                setShowQ1Picker(false);
                            }}
                        >
                            <Text
                                style={[
                                    sqStyles.pickerText,
                                    {
                                        color: theme.colors.onSurface,
                                        fontFamily: theme.fonts.regular,
                                    },
                                    !q2 && { color: theme.colors.onSurfaceVariant },
                                ]}
                            >
                                {q2 || "Select a question"}
                            </Text>
                            <ChevronDown size={18} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                        {showQ2Picker && (
                            <View
                                style={[
                                    sqStyles.dropdown,
                                    {
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                            >
                                {availableForQ2.map((q) => (
                                    <TouchableOpacity
                                        key={q}
                                        style={[
                                            sqStyles.dropdownItem,
                                            { borderBottomColor: theme.colors.outlineVariant },
                                            q === q2 && {
                                                backgroundColor: theme.colors.primaryContainer,
                                            },
                                        ]}
                                        onPress={() => {
                                            setQ2(q);
                                            setShowQ2Picker(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                sqStyles.dropdownText,
                                                {
                                                    color: theme.colors.onSurfaceVariant,
                                                    fontFamily: theme.fonts.regular,
                                                },
                                                q === q2 && {
                                                    color: theme.colors.onPrimaryContainer,
                                                    fontFamily: theme.fonts.semibold,
                                                },
                                            ]}
                                        >
                                            {q}
                                        </Text>
                                        {q === q2 && (
                                            <Check size={16} color={theme.colors.onPrimaryContainer} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TextInput
                            style={[
                                sqStyles.input,
                                {
                                    backgroundColor: theme.colors.surfaceContainerHigh,
                                    color: theme.colors.onSurface,
                                    fontFamily: theme.fonts.regular,
                                },
                            ]}
                            placeholder="Your answer"
                            placeholderTextColor={theme.colors.onSurfaceVariant}
                            value={a2}
                            onChangeText={setA2}
                            autoCapitalize="none"
                            onFocus={(e) => {
                                setShowQ1Picker(false);
                                setShowQ2Picker(false);
                                const target = e.target;
                                setTimeout(() => {
                                    (target as any).measureInWindow?.(
                                        (_x: number, y: number) => {
                                            scrollToInput(y);
                                        }
                                    );
                                }, 100);
                            }}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            sqStyles.continueBtn,
                            {
                                backgroundColor: canContinue
                                    ? theme.colors.primary
                                    : theme.colors.surfaceContainerHighest,
                            },
                        ]}
                        disabled={!canContinue}
                        onPress={() => onQuestionsComplete(q1, a1, q2, a2)}
                    >
                        <Text
                            style={[
                                sqStyles.continueBtnText,
                                {
                                    fontFamily: theme.fonts.semibold,
                                    color: canContinue
                                        ? theme.colors.onPrimary
                                        : theme.colors.onSurfaceVariant,
                                },
                            ]}
                        >
                            Continue
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

export default function PinSetupScreen({
    onComplete,
    onBack,
}: PinSetupScreenProps) {
    const theme = useTheme();
    const { themeMode } = useThemeContext();
    const systemColorScheme = useColorScheme();
    const isDark =
        themeMode === "system"
            ? systemColorScheme === "dark"
            : themeMode === "dark";

    const [stage, setStage] = useState<"questions" | "create" | "confirm">(
        "questions"
    );
    const [pin, setPin] = useState("");
    const [firstPin, setFirstPin] = useState("");
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [securityData, setSecurityData] = useState<{
        q1: string;
        a1: string;
        q2: string;
        a2: string;
    } | null>(null);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;
    const stageOpacity = useRef(new Animated.Value(1)).current;

    const deleteIconColor = saving || pin.length === 0
        ? theme.colors.outlineVariant
        : theme.colors.onSurface;

    useEffect(() => {
        Animated.timing(fadeIn, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, [fadeIn]);

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

    const transitionToStage = useCallback(
        (nextStage: "create" | "confirm") => {
            Animated.timing(stageOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start(() => {
                setPin("");
                setStage(nextStage);
                setError(false);
                setErrorMessage("");
                Animated.timing(stageOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }).start();
            });
        },
        [stageOpacity]
    );

    const handleQuestionsComplete = useCallback(
        (q1: string, a1: string, q2: string, a2: string) => {
            setSecurityData({ q1, a1, q2, a2 });
            setStage("create");
        },
        []
    );

    const handleDigit = useCallback(
        async (digit: string) => {
            if (error || saving) return;
            const next = pin + digit;
            if (next.length > 4) return;
            setPin(next);
            if (next.length === 4) {
                if (stage === "create") {
                    setFirstPin(next);
                    transitionToStage("confirm");
                } else {
                    if (next === firstPin) {
                        setSaving(true);
                        await setupPin(next);
                        if (securityData) {
                            await saveSecurityQuestions(
                                securityData.q1,
                                securityData.a1,
                                securityData.q2,
                                securityData.a2
                            );
                        }
                        onComplete();
                    } else {
                        setError(true);
                        setErrorMessage("PINs don't match");
                        triggerShake();
                        setTimeout(() => {
                            setFirstPin("");
                            transitionToStage("create");
                        }, 800);
                    }
                }
            }
        },
        [
            pin,
            stage,
            firstPin,
            error,
            saving,
            securityData,
            onComplete,
            triggerShake,
            transitionToStage,
        ]
    );

    const handleDelete = useCallback(() => {
        if (error || saving) return;
        setPin((prev) => prev.slice(0, -1));
    }, [error, saving]);

    if (stage === "questions") {
        return (
            <SecurityQuestionsStep
                onComplete={handleQuestionsComplete}
                onBack={onBack}
            />
        );
    }

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const title =
        stage === "create" ? "Create Your PIN" : "Confirm Your PIN";
    const subtitle =
        stage === "create"
            ? "Choose a 4-digit PIN"
            : "Re-enter your PIN to confirm";

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
                    if (stage === "create") {
                        setStage("questions");
                    } else {
                        setFirstPin("");
                        transitionToStage("create");
                    }
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <ArrowLeft size={22} color={theme.colors.onSurface} />
            </TouchableOpacity>

            <Animated.View style={[styles.content, { opacity: fadeIn }]}>
                <Animated.View
                    style={{ opacity: stageOpacity, alignItems: "center" }}
                >
                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.colors.onSurface,
                                fontFamily: theme.fonts.semibold,
                            },
                        ]}
                    >
                        {title}
                    </Text>
                    <Text
                        style={[
                            styles.subtitle,
                            {
                                color: theme.colors.onSurfaceVariant,
                                fontFamily: theme.fonts.regular,
                            },
                        ]}
                    >
                        {subtitle}
                    </Text>

                    <View style={styles.dotsRow}>
                        {[0, 1, 2, 3].map((i) => (
                            <PinDot
                                key={i}
                                filled={i < pin.length}
                                error={error}
                                shakeAnim={shakeAnim}
                                theme={theme}
                                isDark={isDark}
                            />
                        ))}
                    </View>

                    {errorMessage ? (
                        <Text
                            style={[
                                styles.errorText,
                                {
                                    color: theme.colors.error,
                                    fontFamily: theme.fonts.semibold,
                                },
                            ]}
                        >
                            {errorMessage}
                        </Text>
                    ) : (
                        <View style={styles.errorPlaceholder} />
                    )}
                </Animated.View>

                <View style={keypadStyles.keypad}>
                    {keys.map((k) => (
                        <NumKey
                            key={k}
                            label={k}
                            onPress={() => handleDigit(k)}
                            disabled={saving}
                            theme={theme}
                            isDark={isDark}
                        />
                    ))}
                    <View style={keypadStyles.touchable} />
                    <NumKey
                        label="0"
                        onPress={() => handleDigit("0")}
                        disabled={saving}
                        theme={theme}
                        isDark={isDark}
                    />
                    <View style={keypadStyles.touchable}>
                        <TouchableOpacity
                            style={keypadStyles.actionKey}
                            onPress={handleDelete}
                            disabled={saving || pin.length === 0}
                        >
                            <Delete size={24} color={deleteIconColor} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
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
        marginTop: 20,
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
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    title: {
        fontSize: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 32,
    },
    dotsRow: {
        flexDirection: "row",
        gap: 20,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
        height: 18,
    },
    errorPlaceholder: {
        height: 22,
    },
});

const sqStyles = StyleSheet.create({
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
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    picker: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        marginBottom: 10,
    },
    pickerText: {
        flex: 1,
        fontSize: 14,
    },
    dropdown: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 10,
        overflow: "hidden",
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dropdownText: {
        flex: 1,
        fontSize: 13,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 14,
    },
    continueBtn: {
        width: "100%",
        height: 52,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
    },
    continueBtnText: {
        fontSize: 15,
    },
});
