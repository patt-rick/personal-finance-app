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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Delete, ChevronDown, Check, Shield } from "lucide-react-native";
import { setupPin, saveSecurityQuestions, SECURITY_QUESTIONS } from "../utils/security";

const { width, height } = Dimensions.get("window");

interface PinSetupScreenProps {
    onComplete: () => void;
    onBack: () => void;
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

function PinDot({
    filled,
    error,
    shakeAnim,
}: {
    filled: boolean;
    error: boolean;
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
                    { backgroundColor: glowColor, opacity: glowOpacity },
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

function SecurityQuestionsStep({
    onComplete: onQuestionsComplete,
    onBack: onQuestionsBack,
}: {
    onComplete: (q1: string, a1: string, q2: string, a2: string) => void;
    onBack: () => void;
}) {
    const [q1, setQ1] = useState("");
    const [a1, setA1] = useState("");
    const [q2, setQ2] = useState("");
    const [a2, setA2] = useState("");
    const [showQ1Picker, setShowQ1Picker] = useState(false);
    const [showQ2Picker, setShowQ2Picker] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    const availableForQ2 = SECURITY_QUESTIONS.filter((q) => q !== q1);
    const canContinue = q1 && a1.trim().length >= 2 && q2 && a2.trim().length >= 2 && q1 !== q2;

    const scrollToInput = (y: number) => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: Math.max(0, y - 150), animated: true });
        }, 300);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#0B0F1A" />
            <LinearGradient
                colors={["#0B0F1A", "#131B2E", "#1A1040"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <TouchableOpacity
                style={styles.backButton}
                onPress={onQuestionsBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <ArrowLeft size={22} color="rgba(255, 255, 255, 0.7)" />
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
                    <View style={sqStyles.iconCircle}>
                        <Shield size={28} color="#6366F1" />
                    </View>
                    <Text style={sqStyles.title}>Security Questions</Text>
                    <Text style={sqStyles.subtitle}>
                        These will help you recover your PIN if you forget it
                    </Text>

                    <View style={sqStyles.questionBlock}>
                        <Text style={sqStyles.label}>Question 1</Text>
                        <TouchableOpacity
                            style={sqStyles.picker}
                            onPress={() => { setShowQ1Picker(!showQ1Picker); setShowQ2Picker(false); }}
                        >
                            <Text style={[sqStyles.pickerText, !q1 && sqStyles.placeholder]}>
                                {q1 || "Select a question"}
                            </Text>
                            <ChevronDown size={18} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                        {showQ1Picker && (
                            <View style={sqStyles.dropdown}>
                                {SECURITY_QUESTIONS.map((q) => (
                                    <TouchableOpacity
                                        key={q}
                                        style={[sqStyles.dropdownItem, q === q1 && sqStyles.dropdownItemActive]}
                                        onPress={() => { setQ1(q); setShowQ1Picker(false); if (q === q2) setQ2(""); }}
                                    >
                                        <Text style={[sqStyles.dropdownText, q === q1 && sqStyles.dropdownTextActive]}>{q}</Text>
                                        {q === q1 && <Check size={16} color="#6366F1" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TextInput
                            style={sqStyles.input}
                            placeholder="Your answer"
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            value={a1}
                            onChangeText={setA1}
                            autoCapitalize="none"
                            onFocus={(e) => {
                                setShowQ1Picker(false);
                                setShowQ2Picker(false);
                                const target = e.target;
                                setTimeout(() => {
                                    (target as any).measureInWindow?.((
                                        _x: number, y: number,
                                    ) => { scrollToInput(y); });
                                }, 100);
                            }}
                        />
                    </View>

                    <View style={sqStyles.questionBlock}>
                        <Text style={sqStyles.label}>Question 2</Text>
                        <TouchableOpacity
                            style={sqStyles.picker}
                            onPress={() => { setShowQ2Picker(!showQ2Picker); setShowQ1Picker(false); }}
                        >
                            <Text style={[sqStyles.pickerText, !q2 && sqStyles.placeholder]}>
                                {q2 || "Select a question"}
                            </Text>
                            <ChevronDown size={18} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                        {showQ2Picker && (
                            <View style={sqStyles.dropdown}>
                                {availableForQ2.map((q) => (
                                    <TouchableOpacity
                                        key={q}
                                        style={[sqStyles.dropdownItem, q === q2 && sqStyles.dropdownItemActive]}
                                        onPress={() => { setQ2(q); setShowQ2Picker(false); }}
                                    >
                                        <Text style={[sqStyles.dropdownText, q === q2 && sqStyles.dropdownTextActive]}>{q}</Text>
                                        {q === q2 && <Check size={16} color="#6366F1" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TextInput
                            style={sqStyles.input}
                            placeholder="Your answer"
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            value={a2}
                            onChangeText={setA2}
                            autoCapitalize="none"
                            onFocus={(e) => {
                                setShowQ1Picker(false);
                                setShowQ2Picker(false);
                                const target = e.target;
                                setTimeout(() => {
                                    (target as any).measureInWindow?.((
                                        _x: number, y: number,
                                    ) => { scrollToInput(y); });
                                }, 100);
                            }}
                        />
                    </View>

                    <TouchableOpacity
                        style={[sqStyles.continueBtn, !canContinue && sqStyles.continueBtnDisabled]}
                        disabled={!canContinue}
                        onPress={() => onQuestionsComplete(q1, a1, q2, a2)}
                    >
                        <Text style={[sqStyles.continueBtnText, !canContinue && sqStyles.continueBtnTextDisabled]}>
                            Continue
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

export default function PinSetupScreen({ onComplete, onBack }: PinSetupScreenProps) {
    const [stage, setStage] = useState<"questions" | "create" | "confirm">("questions");
    const [pin, setPin] = useState("");
    const [firstPin, setFirstPin] = useState("");
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [securityData, setSecurityData] = useState<{ q1: string; a1: string; q2: string; a2: string } | null>(null);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;
    const stageOpacity = useRef(new Animated.Value(1)).current;

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

    const handleQuestionsComplete = useCallback((q1: string, a1: string, q2: string, a2: string) => {
        setSecurityData({ q1, a1, q2, a2 });
        setStage("create");
    }, []);

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
                                securityData.a2,
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
        [pin, stage, firstPin, error, saving, securityData, onComplete, triggerShake, transitionToStage]
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

    const title = stage === "create" ? "Create Your PIN" : "Confirm Your PIN";
    const subtitle = stage === "create"
        ? "Choose a 4-digit PIN"
        : "Re-enter your PIN to confirm";

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

            <TouchableOpacity
                style={styles.backButton}
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
                <ArrowLeft size={22} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>

            <Animated.View style={[styles.content, { opacity: fadeIn }]}>
                <Animated.View style={{ opacity: stageOpacity, alignItems: "center" }}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>

                    <View style={styles.dotsRow}>
                        {[0, 1, 2, 3].map((i) => (
                            <PinDot
                                key={i}
                                filled={i < pin.length}
                                error={error}
                                shakeAnim={shakeAnim}
                            />
                        ))}
                    </View>

                    {errorMessage ? (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    ) : (
                        <View style={styles.errorPlaceholder} />
                    )}
                </Animated.View>

                <View style={styles.keypad}>
                    {keys.map((k) => (
                        <NumKey
                            key={k}
                            label={k}
                            onPress={() => handleDigit(k)}
                            disabled={saving}
                        />
                    ))}

                    <View style={styles.keyTouchable} />

                    <NumKey
                        label="0"
                        onPress={() => handleDigit("0")}
                        disabled={saving}
                    />

                    <View style={styles.keyTouchable}>
                        <TouchableOpacity
                            style={styles.actionKey}
                            onPress={handleDelete}
                            disabled={saving || pin.length === 0}
                        >
                            <Delete
                                size={24}
                                color={
                                    saving || pin.length === 0
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

const KEY_SIZE = Math.min((width - 120) / 3, 76);

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
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
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
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.85)",
        letterSpacing: 1,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "400",
        color: "rgba(255, 255, 255, 0.4)",
        letterSpacing: 0.5,
        marginBottom: 32,
    },
    dotsRow: {
        flexDirection: "row",
        gap: 20,
        marginBottom: 8,
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
    errorText: {
        fontSize: 12,
        color: "rgba(239, 68, 68, 0.85)",
        letterSpacing: 0.5,
        marginTop: 4,
        height: 18,
    },
    errorPlaceholder: {
        height: 22,
    },
    keypad: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        width: KEY_SIZE * 3 + 36,
        marginTop: 20,
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
        borderRadius: 20,
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.85)",
        letterSpacing: 1,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.4)",
        letterSpacing: 0.5,
        marginBottom: 36,
        textAlign: "center",
    },
    questionBlock: {
        width: "100%",
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.5)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    picker: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 10,
    },
    pickerText: {
        flex: 1,
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.85)",
    },
    placeholder: {
        color: "rgba(255, 255, 255, 0.25)",
    },
    dropdown: {
        backgroundColor: "rgba(30, 30, 50, 0.98)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        marginBottom: 10,
        overflow: "hidden",
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255, 255, 255, 0.06)",
    },
    dropdownItemActive: {
        backgroundColor: "rgba(99, 102, 241, 0.1)",
    },
    dropdownText: {
        flex: 1,
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.7)",
    },
    dropdownTextActive: {
        color: "#6366F1",
        fontWeight: "600",
    },
    input: {
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingHorizontal: 16,
        height: 48,
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.85)",
    },
    continueBtn: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        backgroundColor: "#6366F1",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
    },
    continueBtnDisabled: {
        backgroundColor: "rgba(99, 102, 241, 0.25)",
    },
    continueBtnText: {
        fontSize: 15,
        fontWeight: "700",
        color: "white",
        letterSpacing: 0.3,
    },
    continueBtnTextDisabled: {
        color: "rgba(255, 255, 255, 0.4)",
    },
});
