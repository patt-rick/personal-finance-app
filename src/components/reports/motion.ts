import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

// Points on an ease-out cubic. Native-driven interpolations drop `easing`, so curves are baked into ranges.
const EASE_OUT_STOPS = [0, 0.25, 0.5, 0.75, 1];
const EASE_OUT_VALUES = EASE_OUT_STOPS.map((x) => 1 - Math.pow(1 - x, 3));

/** `null` until the OS answers, so nothing animates before we know motion is allowed. */
export function useReducedMotion(): boolean | null {
    const [reduced, setReduced] = useState<boolean | null>(null);
    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((v) => alive && setReduced(v))
            .catch(() => alive && setReduced(false));
        const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
        return () => {
            alive = false;
            sub.remove();
        };
    }, []);
    return reduced;
}

/**
 * A linear 0→1 progress value (shape it with `slice`) that plays once, the first time `active` is true and the motion preference is
 * known. With reduced motion it jumps straight to 1.
 */
export function useReveal(
    active: boolean,
    reduced: boolean | null,
    {
        delay = 0,
        duration = 600,
    }: { delay?: number; duration?: number } = {},
): Animated.Value {
    const progress = useRef(new Animated.Value(0)).current;
    const played = useRef(false);
    useEffect(() => {
        if (played.current || !active || reduced === null) return;
        played.current = true;
        if (reduced) {
            progress.setValue(1);
            return;
        }
        Animated.timing(progress, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
        }).start();
    }, [active, reduced, progress, delay, duration]);
    useEffect(() => () => progress.stopAnimation(), [progress]);
    return progress;
}

/** Counts from 0 to `target` on the JS thread once `start` is true; whole units while running. */
export function useCountUp(
    target: number,
    start: boolean,
    reduced: boolean | null,
    { delay = 0, duration = 700 }: { delay?: number; duration?: number } = {},
): number {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!start || reduced === null) return;
        if (reduced || target === 0) {
            setValue(target);
            return;
        }
        let frame = 0;
        let startedAt: number | null = null;
        const tick = (ts: number) => {
            if (startedAt === null) startedAt = ts;
            const t = Math.min((ts - startedAt) / duration, 1);
            setValue(t < 1 ? Math.floor(target * (1 - Math.pow(1 - t, 3))) : target);
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        const timer = setTimeout(() => {
            frame = requestAnimationFrame(tick);
        }, delay);
        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(frame);
        };
    }, [target, start, reduced, delay, duration]);
    return value;
}

/** Maps a [from, to] slice of a linear timeline onto an eased 0→1. */
export function slice(progress: Animated.Value, from: number, to: number) {
    return progress.interpolate({
        inputRange: EASE_OUT_STOPS.map((x) => from + x * (to - from)),
        outputRange: EASE_OUT_VALUES,
        extrapolate: "clamp",
    });
}

/** Fade + short rise over a slice of a progress value. */
export function riseStyle(progress: Animated.Value, from = 0, to = 1, distance = 10) {
    const t = slice(progress, from, to);
    return {
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
    };
}
