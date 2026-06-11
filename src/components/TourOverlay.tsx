import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from "react-native";
import { useTheme } from "../theme/theme";
import { TourPage, isTourCompleted, markTourCompleted } from "../utils/tourStorage";
import { EmptyScene, EmptySceneVariant } from "./illustrations";

export interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    illustration?: EmptySceneVariant;
}

interface TourOverlayProps {
    page: TourPage;
    steps: TourStep[];
    delay?: number;
    onComplete?: () => void;
}

export default function TourOverlay({ page, steps, delay = 600, onComplete }: TourOverlayProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
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
            finish();
        }
    }, [currentStep, steps.length]);

    const dismiss = useCallback(() => {
        markTourCompleted(page);
        animateOut(() => setVisible(false));
    }, [page]);

    const finish = useCallback(() => {
        markTourCompleted(page);
        animateOut(() => {
            setVisible(false);
            onComplete?.();
        });
    }, [page, onComplete]);

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
                    style={styles.card}
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
                                                : theme.colors.outlineVariant,
                                        width: i === currentStep ? 20 : 6,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <Animated.View style={[styles.contentArea, { opacity: contentOpacity }]}>
                        {step.illustration ? (
                            <View style={styles.illustration}>
                                <EmptyScene variant={step.illustration} size={208} />
                            </View>
                        ) : (
                            <View style={styles.iconContainer}>
                                {step.icon}
                            </View>
                        )}
                        <Text style={styles.title}>
                            {step.title}
                        </Text>
                        <Text style={styles.description}>
                            {step.description}
                        </Text>
                    </Animated.View>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={dismiss} style={styles.skipBtn}>
                            <Text style={styles.skipText}>
                                Skip
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleNext}
                            style={styles.nextBtn}
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

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.6)",
        },
        cardContainer: {
            position: "absolute",
            bottom: 100,
            left: 20,
            right: 20,
        },
        card: {
            borderRadius: theme.shape.extraLarge,
            padding: 24,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
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
            borderRadius: 26,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            backgroundColor: theme.colors.primaryContainer,
        },
        illustration: {
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
        },
        title: {
            fontSize: 17,
            fontFamily: theme.fonts.semibold,
            letterSpacing: -0.2,
            marginBottom: 6,
            textAlign: "center",
            color: theme.colors.onSurface,
        },
        description: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            lineHeight: 20,
            textAlign: "center",
            paddingHorizontal: 4,
            color: theme.colors.onSurfaceVariant,
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
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
        },
        nextBtn: {
            paddingVertical: 12,
            paddingHorizontal: 28,
            borderRadius: theme.shape.full,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
        },
        nextText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimary,
        },
    });
