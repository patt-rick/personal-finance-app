import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, BackHandler, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOATING_TAB_HEIGHT } from "../../components/FloatingTabBar";
import { useReducedMotion } from "../../components/reports/motion";
import { useTourView } from "./hooks";
import { locateTarget } from "./measure";
import { placeTooltip, Rect } from "./placement";
import Spotlight from "./Spotlight";
import { getTarget, subscribeTargets } from "./targetRegistry";
import { nextStep, skipTour } from "./tourStore";
import TourTooltip from "./TourTooltip";
import { TourView } from "./types";

const REMEASURE_MS = 500;
const GIVE_UP_MS = 1500;
const MAX_TOOLTIP_WIDTH = 340;
const EDGE = 12;

const sameRect = (a: Rect | null, b: Rect) =>
    !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

function useScreenReader(): boolean {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isScreenReaderEnabled()
            .then((on) => alive && setEnabled(on))
            .catch(() => {});
        const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setEnabled);
        return () => {
            alive = false;
            sub.remove();
        };
    }, []);
    return enabled;
}

/**
 * Wraps the navigator. It keeps the tab bar in its own native layer so the tour overlay draws above it, and hides the app from
 * screen readers while a step that blocks it is showing.
 */
export function TourShield({ children }: { children: React.ReactNode }) {
    const view = useTourView();
    const hidden = view?.kind === "info";
    return (
        <View
            style={styles.shield}
            collapsable={false}
            importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
            accessibilityElementsHidden={hidden}
        >
            {children}
        </View>
    );
}

export default function TourHost() {
    const view = useTourView();
    if (!view) return null;
    return <TourLayer key={view.key} view={view} />;
}

function TourLayer({ view }: { view: TourView }) {
    const insets = useSafeAreaInsets();
    const reduced = useReducedMotion();
    const screenReader = useScreenReader();
    const rootRef = useRef<View>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const [rect, setRect] = useState<Rect | null>(null);
    const [gaveUp, setGaveUp] = useState(false);
    const [tooltipHeight, setTooltipHeight] = useState(0);

    const tabBarTop = size ? size.height - FLOATING_TAB_HEIGHT - Math.max(insets.bottom, 8) : 0;
    const width = size?.width ?? 0;

    useEffect(() => {
        const target = view.target;
        if (!target || !size) return;
        let cancel = () => {};
        const locate = () => {
            cancel();
            const entry = getTarget(target);
            if (!entry || !rootRef.current) return;
            cancel = locateTarget(entry, rootRef.current, { top: insets.top, bottom: tabBarTop }, (next) => {
                if (!next || next.x + next.width <= 0 || next.x >= width) return;
                setRect((prev) => (sameRect(prev, next) ? prev : next));
            });
        };
        locate();
        const unsubscribe = subscribeTargets(locate);
        const remeasure = setTimeout(locate, REMEASURE_MS);
        const giveUp = setTimeout(() => setGaveUp(true), GIVE_UP_MS);
        return () => {
            cancel();
            unsubscribe();
            clearTimeout(remeasure);
            clearTimeout(giveUp);
        };
    }, [view.target, size, width, insets.top, tabBarTop]);

    useEffect(() => {
        if (reduced === null) return;
        if (reduced) {
            opacity.setValue(1);
            return;
        }
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }, [reduced, opacity]);

    useEffect(() => {
        AccessibilityInfo.announceForAccessibility(`${view.title}. ${view.body}`);
    }, [view.title, view.body]);

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            skipTour();
            return true;
        });
        return () => sub.remove();
    }, []);

    // A step whose element never turns up is shown as a plain centred card with Next, so the user is never stuck on it.
    const lost = !!view.target && !rect && gaveUp;
    const waiting = !!view.target && !rect && !gaveUp;
    const target = lost ? null : rect;
    const pad = view.shape === "pill" ? 4 : 8;
    const hole = target && {
        x: target.x - pad,
        y: target.y - pad,
        width: target.width + pad * 2,
        height: target.height + pad * 2,
    };
    const tooltipWidth = Math.min(Math.max(0, width - 32), MAX_TOOLTIP_WIDTH);
    const inTabBar = !!target && target.y + target.height / 2 > tabBarTop;
    const placement =
        size && tooltipHeight > 0
            ? placeTooltip({
                  target: hole,
                  tooltip: { width: tooltipWidth, height: tooltipHeight },
                  screen: size,
                  bounds: {
                      top: insets.top + EDGE,
                      bottom: inTabBar ? size.height - Math.max(insets.bottom, 8) - EDGE : tabBarTop - EDGE,
                  },
              })
            : null;

    return (
        <View
            ref={rootRef}
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
            collapsable={false}
            onLayout={(e) => {
                const { width: w, height: h } = e.nativeEvent.layout;
                setSize((prev) => (prev && prev.width === w && prev.height === h ? prev : { width: w, height: h }));
            }}
        >
            {size ? (
                <>
                    <Spotlight
                        size={size}
                        hole={hole}
                        passThrough={view.kind === "action" ? target : null}
                        shape={view.shape}
                        pulse={reduced === false}
                        opacity={opacity}
                    />
                    {waiting ? null : (
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="box-none">
                            <TourTooltip
                                view={view}
                                width={tooltipWidth}
                                placement={placement}
                                showNext={view.kind === "info" || lost || screenReader}
                                onNext={nextStep}
                                onSkip={skipTour}
                                onLayout={(e) => setTooltipHeight(e.nativeEvent.layout.height)}
                            />
                        </Animated.View>
                    )}
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    shield: { flex: 1 },
});
