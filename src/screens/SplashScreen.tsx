import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CARD_WIDTH = Math.min(230, SCREEN_WIDTH * 0.62);
const CARD_HEIGHT = CARD_WIDTH / 1.586;
const WORDMARK = "Finance Tracker";

function Contactless({ size = 18 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M6 8.5a8 8 0 0 1 0 7" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M9.5 6.5a12 12 0 0 1 0 11" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M13 4.5a16 16 0 0 1 0 15" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
    );
}

// One expanding ripple ring, looping with a phase delay.
function Ripple({ delay, color }: { delay: number; color: string }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 1800,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [anim, delay]);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.ripple,
                {
                    borderColor: color,
                    opacity: anim.interpolate({
                        inputRange: [0, 0.15, 1],
                        outputRange: [0, 0.45, 0],
                    }),
                    transform: [
                        {
                            scale: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.4, 2.4],
                            }),
                        },
                    ],
                },
            ]}
        />
    );
}

// A gold coin that pops in with a spring, then bobs forever.
function Coin({
    size,
    style,
    popDelay,
    floatPhase,
}: {
    size: number;
    style: object;
    popDelay: number;
    floatPhase: number;
}) {
    const pop = useRef(new Animated.Value(0)).current;
    const float = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(popDelay),
            Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        ]).start();

        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(floatPhase),
                Animated.timing(float, {
                    toValue: 1,
                    duration: 1900,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(float, {
                    toValue: 0,
                    duration: 1900,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pop, float, popDelay, floatPhase]);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                style,
                {
                    position: "absolute",
                    opacity: pop,
                    transform: [
                        { scale: pop },
                        {
                            translateY: float.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -7],
                            }),
                        },
                    ],
                },
            ]}
        >
            <LinearGradient
                colors={["#E8D9A8", "#C9B26E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <View
                    style={{
                        width: size * 0.62,
                        height: size * 0.62,
                        borderRadius: (size * 0.62) / 2,
                        borderWidth: 1.5,
                        borderColor: "rgba(80,60,20,0.30)",
                    }}
                />
            </LinearGradient>
        </Animated.View>
    );
}

// Staggered letter of the wordmark.
function WordmarkLetter({
    char,
    index,
    color,
    fontFamily,
}: {
    char: string;
    index: number;
    color: string;
    fontFamily: string;
}) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(650 + index * 35),
            Animated.spring(anim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        ]).start();
    }, [anim, index]);

    return (
        <Animated.Text
            style={{
                fontSize: 24,
                fontFamily,
                color,
                opacity: anim,
                transform: [
                    {
                        translateY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                        }),
                    },
                ],
            }}
        >
            {char === " " ? " " : char}
        </Animated.Text>
    );
}

// Pulsing loader dot.
function LoaderDot({ index, color }: { index: number; color: string }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(index * 180),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 420,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 420,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.delay((2 - index) * 180),
            ]),
        );
        const timer = setTimeout(() => loop.start(), 1300);
        return () => {
            clearTimeout(timer);
            loop.stop();
        };
    }, [anim, index]);

    return (
        <Animated.View
            style={[
                styles.loaderDot,
                {
                    backgroundColor: color,
                    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
                    transform: [
                        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) },
                    ],
                },
            ]}
        />
    );
}

export default function SplashScreen() {
    const theme = useTheme();

    const cardIn = useRef(new Animated.Value(0)).current;
    const cardFloat = useRef(new Animated.Value(0)).current;
    const taglineIn = useRef(new Animated.Value(0)).current;
    const blobDrift = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(120),
            Animated.spring(cardIn, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        ]).start();

        Animated.sequence([
            Animated.delay(1250),
            Animated.timing(taglineIn, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();

        const floatLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(cardFloat, {
                    toValue: 1,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(cardFloat, {
                    toValue: 0,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );
        floatLoop.start();

        const driftLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(blobDrift, {
                    toValue: 1,
                    duration: 5200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(blobDrift, {
                    toValue: 0,
                    duration: 5200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );
        driftLoop.start();

        return () => {
            floatLoop.stop();
            driftLoop.stop();
        };
    }, [cardIn, cardFloat, taglineIn, blobDrift]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={theme.dark ? "light" : "dark"} />

            {/* Soft drifting backdrop blobs */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.blob,
                    {
                        top: -90,
                        right: -110,
                        backgroundColor: theme.colors.goldContainer,
                        opacity: 0.45,
                        transform: [
                            {
                                translateY: blobDrift.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 26],
                                }),
                            },
                        ],
                    },
                ]}
            />
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.blob,
                    {
                        bottom: -120,
                        left: -100,
                        backgroundColor: theme.colors.primaryContainer,
                        opacity: 0.4,
                        transform: [
                            {
                                translateY: blobDrift.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -22],
                                }),
                            },
                        ],
                    },
                ]}
            />

            <View style={styles.stage}>
                {/* Contactless ripples behind the card */}
                <Ripple delay={900} color={theme.colors.primary} />
                <Ripple delay={1800} color={theme.colors.primary} />

                {/* The hero card */}
                <Animated.View
                    style={{
                        opacity: cardIn,
                        transform: [
                            {
                                translateY: Animated.add(
                                    cardIn.interpolate({ inputRange: [0, 1], outputRange: [46, 0] }),
                                    cardFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }),
                                ),
                            },
                            { scale: cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                            {
                                rotate: cardIn.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["-14deg", "-5deg"],
                                }),
                            },
                        ],
                    }}
                >
                    <LinearGradient
                        colors={["#0066FF", "#0047B8"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.card, { shadowColor: "#0066FF" }]}
                    >
                        <View style={styles.cardTopRow}>
                            <View style={styles.chip}>
                                <View style={styles.chipInner} />
                            </View>
                            <Contactless />
                        </View>

                        {/* "Card number" dot groups */}
                        <View style={styles.numberRow}>
                            {[0, 1, 2, 3].map((g) => (
                                <View key={g} style={styles.numberGroup}>
                                    {[0, 1, 2, 3].map((d) => (
                                        <View key={d} style={styles.numberDot} />
                                    ))}
                                </View>
                            ))}
                        </View>

                        <View style={styles.cardBottomRow}>
                            <Text style={[styles.cardName, { fontFamily: theme.fonts.semibold }]}>
                                YOUR MONEY
                            </Text>
                            <View style={styles.roundelRow}>
                                <View style={[styles.roundel, { backgroundColor: "rgba(255,255,255,0.85)" }]} />
                                <View
                                    style={[
                                        styles.roundel,
                                        styles.roundelOverlap,
                                        { backgroundColor: "rgba(255,210,80,0.85)" },
                                    ]}
                                />
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Coins orbiting the card */}
                <Coin size={34} style={{ top: -16, left: -26 }} popDelay={620} floatPhase={0} />
                <Coin size={22} style={{ bottom: -10, right: -20 }} popDelay={760} floatPhase={500} />
                <Coin size={15} style={{ top: 26, right: -38 }} popDelay={900} floatPhase={1000} />
            </View>

            {/* Wordmark */}
            <View style={styles.wordmarkRow}>
                {WORDMARK.split("").map((char, i) => (
                    <WordmarkLetter
                        key={i}
                        char={char}
                        index={i}
                        color={theme.colors.onSurface}
                        fontFamily={theme.fonts.semibold}
                    />
                ))}
            </View>

            <Animated.Text
                style={[
                    styles.tagline,
                    {
                        color: theme.colors.onSurfaceVariant,
                        fontFamily: theme.fonts.regular,
                        opacity: taglineIn,
                        transform: [
                            {
                                translateY: taglineIn.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [8, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                Private. Offline. Yours.
            </Animated.Text>

            <View style={styles.loaderRow}>
                {[0, 1, 2].map((i) => (
                    <LoaderDot key={i} index={i} color={theme.colors.primary} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    blob: {
        position: "absolute",
        width: 280,
        height: 280,
        borderRadius: 140,
    },
    stage: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 52,
    },
    ripple: {
        position: "absolute",
        width: CARD_WIDTH,
        height: CARD_WIDTH,
        borderRadius: CARD_WIDTH / 2,
        borderWidth: 1.5,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        padding: 16,
        justifyContent: "space-between",
        overflow: "hidden",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 10,
    },
    cardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    chip: {
        width: 34,
        height: 25,
        borderRadius: 5,
        padding: 4,
        backgroundColor: "#D7C389",
    },
    chipInner: {
        flex: 1,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: "rgba(80,60,20,0.35)",
    },
    numberRow: {
        flexDirection: "row",
        gap: 12,
    },
    numberGroup: {
        flexDirection: "row",
        gap: 4,
    },
    numberDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.65)",
    },
    cardBottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    cardName: {
        fontSize: 9,
        letterSpacing: 1.6,
        color: "rgba(255,255,255,0.85)",
    },
    roundelRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    roundel: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    roundelOverlap: {
        marginLeft: -8,
    },
    wordmarkRow: {
        flexDirection: "row",
        marginTop: 8,
    },
    tagline: {
        fontSize: 13,
        marginTop: 10,
        letterSpacing: 0.4,
    },
    loaderRow: {
        position: "absolute",
        bottom: 64,
        flexDirection: "row",
        gap: 8,
    },
    loaderDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
});
