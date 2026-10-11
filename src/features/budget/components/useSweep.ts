import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * A linear 0→1 value that replays from zero whenever `key` changes (shape it with `slice`). Reduced motion
 * jumps straight to 1. `native` must stay fixed for the component's lifetime.
 */
export function useSweep(key: string, reduced: boolean | null, duration = 900, native = false): Animated.Value {
    const value = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (reduced === null) return;
        value.stopAnimation();
        if (reduced) {
            value.setValue(1);
            return;
        }
        value.setValue(0);
        const anim = Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: native });
        anim.start();
        return () => anim.stop();
    }, [key, reduced, value, duration, native]);
    return value;
}
