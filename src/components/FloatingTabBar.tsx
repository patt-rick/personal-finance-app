import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutGrid, Landmark, PiggyBank, Settings } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { useThemeContext } from "../theme/ThemeContext";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TAB_COUNT = 4;
const BAR_H_MARGIN = 20;
const BAR_WIDTH = SCREEN_WIDTH - BAR_H_MARGIN * 2;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;
const INDICATOR_WIDTH = 65;
const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;
const BAR_HEIGHT = 62;

export const FLOATING_TAB_HEIGHT = BAR_HEIGHT + 24;

const TAB_ICONS = [LayoutGrid, Landmark, PiggyBank, Settings];
const TAB_LABELS = ["Home", "Books", "Budget", "Settings"];

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
    const theme = useTheme();
    const { themeMode } = useThemeContext();
    const systemColorScheme = useColorScheme();
    const isDark = themeMode === "system" ? systemColorScheme === "dark" : themeMode === "dark";
    const insets = useSafeAreaInsets();
    const indicatorX = useRef(
        new Animated.Value(state.index * TAB_WIDTH + INDICATOR_OFFSET),
    ).current;
    const focusAnims = useRef(
        state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0)),
    ).current;

    useEffect(() => {
        Animated.spring(indicatorX, {
            toValue: state.index * TAB_WIDTH + INDICATOR_OFFSET,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
        }).start();

        focusAnims.forEach((anim, i) => {
            Animated.spring(anim, {
                toValue: i === state.index ? 1 : 0,
                friction: 8,
                tension: 80,
                useNativeDriver: true,
            }).start();
        });
    }, [state.index, indicatorX, focusAnims]);

    const bottomPadding = Math.max(insets.bottom, 8);

    return (
        <View style={[styles.wrapper, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
            <View
                style={[
                    styles.bar,
                    {
                        backgroundColor: theme.colors.card,
                        borderColor: isDark ? theme.colors.border : theme.colors.borderLight,
                        ...(isDark
                            ? { shadowColor: "#000000", shadowOpacity: 0.3 }
                            : { shadowColor: theme.colors.text, shadowOpacity: 0.08 }),
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.indicator,
                        {
                            backgroundColor: theme.colors.primary,
                            transform: [{ translateX: indicatorX }],
                        },
                    ]}
                />

                {state.routes.map((route, index) => {
                    const isFocused = state.index === index;
                    const Icon = TAB_ICONS[index];
                    const label = TAB_LABELS[index];
                    const focusAnim = focusAnims[index];

                    const onPress = () => {
                        const event = navigation.emit({
                            type: "tabPress",
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={route.name}
                            onPress={onPress}
                            activeOpacity={0.7}
                            style={styles.tab}
                        >
                            <View style={styles.tabContent}>
                                <View>
                                    <Animated.View
                                        style={{
                                            opacity: focusAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 0],
                                            }),
                                        }}
                                    >
                                        <Icon size={20} color={theme.colors.textSecondary} />
                                    </Animated.View>
                                    <Animated.View
                                        style={[StyleSheet.absoluteFill, { opacity: focusAnim }]}
                                    >
                                        <Icon size={20} color="#FFFFFF" />
                                    </Animated.View>
                                </View>
                                <Animated.View
                                    style={{
                                        opacity: focusAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 0],
                                        }),
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.label,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </Animated.View>
                                <Animated.View
                                    style={[styles.labelAbsolute, { opacity: focusAnim }]}
                                >
                                    <Text style={[styles.label, { color: "#FFFFFF" }]}>
                                        {label}
                                    </Text>
                                </Animated.View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: BAR_H_MARGIN,
    },
    bar: {
        flexDirection: "row",
        width: BAR_WIDTH,
        height: BAR_HEIGHT,
        borderRadius: BAR_HEIGHT / 2,
        alignItems: "center",
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    indicator: {
        position: "absolute",
        width: INDICATOR_WIDTH,
        height: 42,
        borderRadius: 21,
    },
    tab: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    tabContent: {
        alignItems: "center",
        gap: 3,
    },
    label: {
        fontSize: 10,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
    labelAbsolute: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
    },
});
