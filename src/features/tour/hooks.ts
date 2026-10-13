import { RefObject, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { ScrollView } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { notifyTargetChanged, registerTarget } from "./targetRegistry";
import { getTourView, requestTour, setSheetOpen, subscribeTour, withdrawTour } from "./tourStore";
import { TargetId, TourId, TourView } from "./types";

const REQUEST_DELAY_MS = 600;

/**
 * Marks an element as something a tour step can point at. Spread the result onto a host component (View, TouchableOpacity,
 * Animated.View). Pass the enclosing vertical ScrollView's ref when the element can be scrolled off screen.
 */
export function useTourTarget(id: TargetId, scrollRef?: RefObject<ScrollView | null>) {
    const ref = useRef<any>(null);
    useEffect(() => registerTarget(id, { ref, scrollRef }), [id, scrollRef]);
    return useMemo(() => ({ ref, onLayout: notifyTargetChanged, collapsable: false as const }), []);
}

export type TourTargetProps = ReturnType<typeof useTourTarget>;

/** Asks for a tour while the screen is focused and `eligible`; the store decides whether and when it actually starts. */
export function useTourRequest(id: TourId, eligible: boolean): void {
    const focused = useIsFocused();
    useEffect(() => {
        if (!focused || !eligible) return;
        const timer = setTimeout(() => requestTour(id), REQUEST_DELAY_MS);
        return () => {
            clearTimeout(timer);
            withdrawTour(id);
        };
    }, [id, focused, eligible]);
}

/** Tells the tour a sheet is covering the screen, so the overlay steps aside until it closes. */
export function useTourSheet(key: string, open: boolean): void {
    useEffect(() => {
        setSheetOpen(key, open);
        return () => setSheetOpen(key, false);
    }, [key, open]);
}

export function useTourView(): TourView | null {
    return useSyncExternalStore(subscribeTour, getTourView);
}
