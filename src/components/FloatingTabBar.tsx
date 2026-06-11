import React, { useEffect, useRef } from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, BookOpen, PieChart, SlidersHorizontal, Plus } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TAB_COUNT = 4;
const BAR_H_MARGIN = 20;
const BAR_WIDTH = SCREEN_WIDTH - BAR_H_MARGIN * 2;
const BAR_HEIGHT = 64;
const FAB_AREA = 56;
const FAB_SIZE = 38;
const TABS_WIDTH = BAR_WIDTH - FAB_AREA;
const TAB_WIDTH = TABS_WIDTH / TAB_COUNT;
const DOT_SIZE = 4;
const DOT_OFFSET = (TAB_WIDTH - DOT_SIZE) / 2;

export const FLOATING_TAB_HEIGHT = BAR_HEIGHT + 24;

const TAB_ICONS = [Home, BookOpen, PieChart, SlidersHorizontal];
const TAB_LABELS = ["Home", "Books", "Budget", "Settings"];

interface FloatingTabBarExtraProps {
    onQuickAdd: () => void;
}

export default function FloatingTabBar({
    state,
    navigation,
    onQuickAdd,
}: BottomTabBarProps & FloatingTabBarExtraProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const dotX = useRef(new Animated.Value(state.index * TAB_WIDTH + DOT_OFFSET)).current;
    const focusAnims = useRef(
        state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0)),
    ).current;

    useEffect(() => {
        Animated.spring(dotX, {
            toValue: state.index * TAB_WIDTH + DOT_OFFSET,
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
    }, [state.index, dotX, focusAnims]);

    const bottomPadding = Math.max(insets.bottom, 8);

    return (
        <View style={[styles.wrapper, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
            <View
                style={[
                    styles.bar,
                    theme.elevation.level2,
                    {
                        backgroundColor: theme.colors.inverseSurface,
                        shadowColor: theme.colors.shadow,
                    },
                ]}
            >
                <View style={styles.tabs}>
                    <Animated.View
                        style={[
                            styles.dot,
                            { transform: [{ translateX: dotX }] },
                        ]}
                    />
                    {state.routes.map((route, index) => {
                        const isFocused = state.index === index;
                        const Icon = TAB_ICONS[index];
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
                                accessibilityLabel={TAB_LABELS[index] ?? route.name}
                                onPress={onPress}
                                activeOpacity={0.7}
                                style={styles.tab}
                            >
                                <View>
                                    <Animated.View
                                        style={{
                                            opacity: focusAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 0],
                                            }),
                                        }}
                                    >
                                        <Icon size={21} color={theme.colors.outline} strokeWidth={2} />
                                    </Animated.View>
                                    <Animated.View
                                        style={[StyleSheet.absoluteFill, { opacity: focusAnim }]}
                                    >
                                        <Icon
                                            size={21}
                                            color={theme.colors.inverseOnSurface}
                                            strokeWidth={2}
                                        />
                                    </Animated.View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Add transaction"
                    onPress={onQuickAdd}
                    activeOpacity={0.8}
                    style={styles.fab}
                >
                    <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
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
        paddingRight: (FAB_AREA - FAB_SIZE) / 2,
    },
    tabs: {
        flexDirection: "row",
        width: TABS_WIDTH,
        height: "100%",
        alignItems: "center",
    },
    tab: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    dot: {
        position: "absolute",
        bottom: 13,
        left: 0,
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: "#0066FF",
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        backgroundColor: "#0066FF",
        alignItems: "center",
        justifyContent: "center",
    },
});
