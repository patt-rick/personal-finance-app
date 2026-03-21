import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from "react-native";
import { useTheme } from "../theme/theme";
import { TourPage, isTourCompleted, markTourCompleted } from "../utils/tourStorage";

export interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface TourOverlayProps {
    page: TourPage;
    steps: TourStep[];
    delay?: number;
}

export default function TourOverlay({ page, steps, delay = 600 }: TourOverlayProps) {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const cardTranslateY = useRef(new Animated.Value(40)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        let mounted = true;
        const check = async () => {
            const completed = await isTourCompleted(page);
            if (!completed && mounted) {
                setTimeout(() => {
                    if (mounted) {
                        setVisible(true);
                        animateIn();
                    }
                }, delay);
            }
        };
        check();
        return () => { mounted = false; };
    }, [page]);

    const animateIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(cardTranslateY, {
                toValue: 0,
                damping: 20,
                stiffness: 200,
                useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const animateOut = useCallback((onDone: () => void) => {
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(cardTranslateY, {
                toValue: 60,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(onDone);
    }, []);

    const animateStepTransition = useCallback((next: number) => {
        Animated.timing(contentOpacity, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
        }).start(() => {
            setCurrentStep(next);
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }).start();
        });
    }, []);

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            animateStepTransition(currentStep + 1);
        } else {
            dismiss();
        }
    }, [currentStep, steps.length]);

    const dismiss = useCallback(() => {
        markTourCompleted(page);
        animateOut(() => setVisible(false));
    }, [page]);

    if (!visible || steps.length === 0) return null;

    const step = steps[currentStep];
    const isLast = currentStep === steps.length - 1;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[
                    styles.backdrop,
                    { opacity: backdropOpacity },
                ]}
                pointerEvents="auto"
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={dismiss}
                />
            </Animated.View>

            <Animated.View
                style={[
                    styles.cardContainer,
                    {
                        opacity: cardOpacity,
                        transform: [{ translateY: cardTranslateY }],
                    },
                ]}
                pointerEvents="box-none"
            >
                <View
                    style={[
                        styles.card,
                        { backgroundColor: theme.colors.card },
                    ]}
                    pointerEvents="auto"
                >
                    <View style={styles.stepIndicatorRow}>
                        {steps.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.stepDot,
                                    {
                                        backgroundColor:
                                            i === currentStep
                                                ? theme.colors.primary
                                                : theme.colors.border,
                                        width: i === currentStep ? 20 : 6,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <Animated.View style={[styles.contentArea, { opacity: contentOpacity }]}>
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: theme.colors.primary + "14" },
                            ]}
                        >
                            {step.icon}
                        </View>
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {step.title}
                        </Text>
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                            {step.description}
                        </Text>
                    </Animated.View>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={dismiss} style={styles.skipBtn}>
                            <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
                                Skip
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleNext}
                            style={[
                                styles.nextBtn,
                                { backgroundColor: theme.colors.primary },
                            ]}
                        >
                            <Text style={styles.nextText}>
                                {isLast ? "Got it" : "Next"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    cardContainer: {
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
    },
    card: {
        borderRadius: 20,
        padding: 24,
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
    stepIndicatorRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
        marginBottom: 20,
    },
    stepDot: {
        height: 6,
        borderRadius: 3,
    },
    contentArea: {
        alignItems: "center",
        marginBottom: 24,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    title: {
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: -0.2,
        marginBottom: 6,
        textAlign: "center",
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        paddingHorizontal: 4,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    skipBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    skipText: {
        fontSize: 14,
        fontWeight: "600",
    },
    nextBtn: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    nextText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },
});
