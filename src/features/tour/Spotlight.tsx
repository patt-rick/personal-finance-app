import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../../theme/theme";
import { Rect } from "./placement";

const SCRIM_OPACITY = 0.6;
const RECT_RADIUS = 16;

interface SpotlightProps {
    size: { width: number; height: number };
    /** Padded cutout to draw; null dims the whole screen. */
    hole: Rect | null;
    /** Unpadded target; when set, touches inside it reach the app underneath. */
    passThrough: Rect | null;
    shape: "rect" | "pill";
    pulse: boolean;
    opacity: Animated.Value;
}

const noop = () => {};

function holePath({ x, y, width, height }: Rect, radius: number): string {
    const r = Math.min(radius, width / 2, height / 2);
    const right = x + width;
    const bottom = y + height;
    return [
        `M${x + r} ${y}`,
        `H${right - r}`,
        `A${r} ${r} 0 0 1 ${right} ${y + r}`,
        `V${bottom - r}`,
        `A${r} ${r} 0 0 1 ${right - r} ${bottom}`,
        `H${x + r}`,
        `A${r} ${r} 0 0 1 ${x} ${bottom - r}`,
        `V${y + r}`,
        `A${r} ${r} 0 0 1 ${x + r} ${y}`,
        "Z",
    ].join("");
}

function Blocker({ style }: { style: object }) {
    return (
        <Pressable
            onPress={noop}
            android_disableSound
            style={[styles.blocker, style]}
            accessible={false}
            importantForAccessibility="no"
        />
    );
}

export default function Spotlight({ size, hole, passThrough, shape, pulse, opacity }: SpotlightProps) {
    const theme = useTheme();
    const beat = useRef(new Animated.Value(0)).current;
    const radius = hole ? (shape === "pill" ? hole.height / 2 : RECT_RADIUS) : 0;

    useEffect(() => {
        if (!pulse) return;
        const loop = Animated.loop(
            Animated.timing(beat, { toValue: 1, duration: 1400, useNativeDriver: true }),
        );
        loop.start();
        return () => loop.stop();
    }, [pulse, beat]);

    const path = useMemo(() => {
        const screen = `M0 0H${size.width}V${size.height}H0Z`;
        return hole ? screen + holePath(hole, radius) : screen;
    }, [size.width, size.height, hole, radius]);

    const ring = hole && {
        left: hole.x,
        top: hole.y,
        width: hole.width,
        height: hole.height,
        borderRadius: Math.min(radius, hole.width / 2, hole.height / 2),
        borderColor: theme.colors.primary,
    };

    return (
        <>
            {passThrough ? (
                <>
                    <Blocker style={{ top: 0, left: 0, right: 0, height: Math.max(0, passThrough.y) }} />
                    <Blocker style={{ top: passThrough.y + passThrough.height, left: 0, right: 0, bottom: 0 }} />
                    <Blocker
                        style={{
                            top: passThrough.y,
                            left: 0,
                            width: Math.max(0, passThrough.x),
                            height: passThrough.height,
                        }}
                    />
                    <Blocker
                        style={{
                            top: passThrough.y,
                            left: passThrough.x + passThrough.width,
                            right: 0,
                            height: passThrough.height,
                        }}
                    />
                </>
            ) : (
                <Blocker style={StyleSheet.absoluteFillObject} />
            )}

            <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
                <Svg width={size.width} height={size.height}>
                    <Path d={path} fill={theme.colors.scrim} fillOpacity={SCRIM_OPACITY} fillRule="evenodd" />
                </Svg>
                {ring && passThrough ? (
                    <>
                        <View style={[styles.ring, ring]} />
                        {pulse ? (
                            <Animated.View
                                style={[
                                    styles.ring,
                                    ring,
                                    {
                                        opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
                                        transform: [
                                            { scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) },
                                        ],
                                    },
                                ]}
                            />
                        ) : null}
                    </>
                ) : null}
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    blocker: { position: "absolute" },
    ring: { position: "absolute", borderWidth: 2 },
});
