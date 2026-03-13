import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Image,
    useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme/theme";
import { useThemeContext } from "../theme/ThemeContext";

const { width, height } = Dimensions.get("window");

function WaveBackground({ isDark }: { isDark: boolean }) {
    const theme = useTheme();
    const primary = theme.colors.primary;
    const primaryLight = isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)";
    const primaryMedium = isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.12)";

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={StyleSheet.absoluteFill}
            >
                <Path
                    d={`M${width * 0.6},0
                        C${width * 0.45},${height * 0.08} ${width * 1.1},${height * 0.12} ${width},${height * 0.22}
                        L${width},0 Z`}
                    fill={primary}
                    opacity={isDark ? 0.2 : 0.85}
                />
                <Path
                    d={`M${width * 0.75},0
                        C${width * 0.5},${height * 0.06} ${width * 1.15},${height * 0.15} ${width},${height * 0.28}
                        L${width},${height * 0.18}
                        C${width * 0.95},${height * 0.1} ${width * 0.55},${height * 0.04} ${width * 0.85},0 Z`}
                    fill={primaryMedium}
                />
                <Path
                    d={`M0,${height * 0.7}
                        C${width * 0.15},${height * 0.65} ${width * 0.05},${height * 0.82} ${width * 0.35},${height * 0.78}
                        C${width * 0.55},${height * 0.75} ${width * 0.4},${height * 0.92} ${width * 0.5},${height}
                        L0,${height} Z`}
                    fill={primary}
                    opacity={isDark ? 0.18 : 0.8}
                />
                <Path
                    d={`M0,${height * 0.78}
                        C${width * 0.1},${height * 0.74} ${width * 0.15},${height * 0.88} ${width * 0.4},${height * 0.85}
                        C${width * 0.5},${height * 0.84} ${width * 0.45},${height * 0.95} ${width * 0.55},${height}
                        L0,${height} Z`}
                    fill={primaryLight}
                />
                <Path
                    d={`M${width},${height * 0.55}
                        C${width * 0.85},${height * 0.58} ${width * 0.95},${height * 0.48} ${width * 0.78},${height * 0.5}
                        C${width * 0.7},${height * 0.51} ${width * 0.75},${height * 0.42} ${width * 0.65},${height * 0.45}
                        L${width * 0.65},${height * 0.46}
                        C${width * 0.78},${height * 0.44} ${width * 0.72},${height * 0.53} ${width * 0.85},${height * 0.52}
                        C${width * 0.92},${height * 0.515} ${width * 0.88},${height * 0.56} ${width},${height * 0.58} Z`}
                    fill={primaryMedium}
                />
            </Svg>
        </View>
    );
}

function LoadingDots() {
    const theme = useTheme();
    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animateDot = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0.3,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );

        animateDot(dot1, 0).start();
        animateDot(dot2, 200).start();
        animateDot(dot3, 400).start();
    }, [dot1, dot2, dot3]);

    return (
        <View style={loadingStyles.container}>
            {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View
                    key={i}
                    style={[
                        loadingStyles.dot,
                        {
                            backgroundColor: theme.colors.primary,
                            opacity: dot,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

export default function SplashScreen() {
    const theme = useTheme();
    const { themeMode } = useThemeContext();
    const systemColorScheme = useColorScheme();
    const isDark =
        themeMode === "system"
            ? systemColorScheme === "dark"
            : themeMode === "dark";

    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(24)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const subtitleTranslateY = useRef(new Animated.Value(16)).current;
    const footerOpacity = useRef(new Animated.Value(0)).current;
    const loadingOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(titleTranslateY, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(subtitleOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(subtitleTranslateY, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(loadingOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(footerOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, [
        logoOpacity,
        logoScale,
        titleOpacity,
        titleTranslateY,
        subtitleOpacity,
        subtitleTranslateY,
        loadingOpacity,
        footerOpacity,
    ]);

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

            <WaveBackground isDark={isDark} />

            <View style={styles.content}>
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }],
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.logoContainer,
                            {
                                backgroundColor: isDark
                                    ? "rgba(99, 102, 241, 0.15)"
                                    : "#FFFFFF",
                                shadowColor: theme.colors.primary,
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: isDark ? 0.3 : 0.15,
                                shadowRadius: 24,
                                elevation: 12,
                            },
                        ]}
                    >
                        <Image
                            source={require("../icon.png")}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                </Animated.View>

                <Animated.Text
                    style={[
                        styles.title,
                        {
                            color: theme.colors.text,
                            opacity: titleOpacity,
                            transform: [{ translateY: titleTranslateY }],
                        },
                    ]}
                >
                    Finance Tracker
                </Animated.Text>

                <Animated.Text
                    style={[
                        styles.subtitle,
                        {
                            color: theme.colors.textSecondary,
                            opacity: subtitleOpacity,
                            transform: [{ translateY: subtitleTranslateY }],
                        },
                    ]}
                >
                    Your Premium Cashbook
                </Animated.Text>

                <Animated.View style={{ opacity: loadingOpacity }}>
                    <LoadingDots />
                </Animated.View>
            </View>

            <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
                <View
                    style={[
                        styles.footerDivider,
                        {
                            backgroundColor: isDark
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.08)",
                        },
                    ]}
                />
                <Text
                    style={[
                        styles.footerText,
                        {
                            color: isDark
                                ? "rgba(255, 255, 255, 0.3)"
                                : "rgba(0, 0, 0, 0.25)",
                        },
                    ]}
                >
                    SECURE {"  "}·{"  "} PRIVATE {"  "}·{"  "} FAST
                </Text>
            </Animated.View>
        </View>
    );
}

const loadingStyles = StyleSheet.create({
    container: {
        flexDirection: "row",
        gap: 8,
        marginTop: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        alignItems: "center",
        paddingBottom: 40,
    },
    logoWrapper: {
        marginBottom: 32,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    logoImage: {
        width: 72,
        height: 72,
    },
    title: {
        fontSize: 30,
        fontWeight: "700",
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: "400",
        letterSpacing: 3,
        textTransform: "uppercase",
        marginTop: 10,
    },
    footer: {
        position: "absolute",
        bottom: 56,
        alignItems: "center",
    },
    footerDivider: {
        width: 32,
        height: 1,
        marginBottom: 16,
    },
    footerText: {
        fontSize: 11,
        letterSpacing: 4,
        fontWeight: "300",
    },
});
