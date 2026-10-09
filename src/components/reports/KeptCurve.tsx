import React, { useMemo, useState } from "react";
import { Animated, LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { slice } from "./motion";

interface KeptCurveProps {
    values: number[];
    color: string;
    progress: Animated.Value;
}

const TOP_PAD = 10;
const BOTTOM_PAD = 12;
const END_PAD = 28;

interface Point {
    x: number;
    y: number;
}

/** Fritsch–Carlson monotone cubic, so the curve never bulges past the values it passes through. */
function smoothPath(points: Point[]): string {
    const n = points.length;
    if (n < 2) return "";
    const dx: number[] = [];
    const slope: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        dx.push(points[i + 1].x - points[i].x);
        slope.push((points[i + 1].y - points[i].y) / dx[i]);
    }
    const tangent = [slope[0]];
    for (let i = 1; i < n - 1; i++) {
        tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
    }
    tangent.push(slope[n - 2]);
    for (let i = 0; i < n - 1; i++) {
        if (slope[i] === 0) {
            tangent[i] = 0;
            tangent[i + 1] = 0;
            continue;
        }
        const a = tangent[i] / slope[i];
        const b = tangent[i + 1] / slope[i];
        const h = a * a + b * b;
        if (h > 9) {
            const k = 3 / Math.sqrt(h);
            tangent[i] = k * a * slope[i];
            tangent[i + 1] = k * b * slope[i];
        }
    }
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < n - 1; i++) {
        const third = dx[i] / 3;
        d += ` C${points[i].x + third},${points[i].y + tangent[i] * third} ${points[i + 1].x - third},${
            points[i + 1].y - tangent[i + 1] * third
        } ${points[i + 1].x},${points[i + 1].y}`;
    }
    return d;
}

/** A soft area graph of the period's running total that fills its parent, swept in left to right. */
export default function KeptCurve({ values, color, progress }: KeptCurveProps) {
    const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
    const onLayout = (e: LayoutChangeEvent) =>
        setSize({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) });

    const shape = useMemo(() => {
        if (width === 0 || height === 0 || values.length < 2) return null;
        const lo = Math.min(0, ...values);
        const hi = Math.max(0, ...values);
        const range = hi - lo || 1;
        const usable = height - TOP_PAD - BOTTOM_PAD;
        const step = (width - END_PAD) / (values.length - 1);
        const points = values.map((v, i) => ({
            x: i * step,
            y: TOP_PAD + (1 - (v - lo) / range) * usable,
        }));
        const line = smoothPath(points);
        const last = points[points.length - 1];
        const tail = `${line} L${width},${last.y}`;
        return { line: tail, area: `${tail} L${width},${height} L0,${height} Z`, end: last };
    }, [values, width, height]);

    const reveal = useMemo(() => {
        const t = slice(progress, 0.08, 0.7);
        return {
            outer: { transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }] },
            inner: { transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) }] },
            dot: { opacity: slice(progress, 0.62, 0.78) },
        };
    }, [progress, width]);

    return (
        <View style={styles.frame} onLayout={onLayout} pointerEvents="none">
            {shape && (
                <Animated.View style={[styles.clip, reveal.outer]}>
                    <Animated.View style={[StyleSheet.absoluteFill, reveal.inner]}>
                        <Svg width={width} height={height}>
                            <Defs>
                                <LinearGradient id="keptFill" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor={color} stopOpacity={0.22} />
                                    <Stop offset="1" stopColor={color} stopOpacity={0} />
                                </LinearGradient>
                            </Defs>
                            <Path d={shape.area} fill="url(#keptFill)" />
                            <Path d={shape.line} stroke={color} strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
                        </Svg>
                    </Animated.View>
                </Animated.View>
            )}
            {shape && (
                <Animated.View style={[StyleSheet.absoluteFill, reveal.dot]}>
                    <Svg width={width} height={height}>
                        <Circle cx={shape.end.x} cy={shape.end.y} r={10} fill={color} fillOpacity={0.16} />
                        <Circle cx={shape.end.x} cy={shape.end.y} r={4} fill={color} />
                    </Svg>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    frame: {
        ...StyleSheet.absoluteFillObject,
        overflow: "hidden",
    },
    clip: {
        ...StyleSheet.absoluteFillObject,
        overflow: "hidden",
    },
});
