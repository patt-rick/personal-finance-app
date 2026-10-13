import React, { useMemo } from "react";
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Pointer } from "lucide-react-native";
import { AppTheme, useTheme } from "../../theme/theme";
import { Placement } from "./placement";
import { TourView } from "./types";

const ARROW_SIZE = 14;

interface TourTooltipProps {
    view: TourView;
    width: number;
    /** Null until the card has been measured; it stays invisible until then. */
    placement: Placement | null;
    showNext: boolean;
    onNext: () => void;
    onSkip: () => void;
    onLayout: (event: LayoutChangeEvent) => void;
}

export default function TourTooltip({ view, width, placement, showNext, onNext, onSkip, onLayout }: TourTooltipProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const arrowX = placement?.arrowX ?? null;

    return (
        <View
            onLayout={onLayout}
            style={[
                styles.card,
                { width, top: placement?.top ?? 0, left: placement?.left ?? 0, opacity: placement ? 1 : 0 },
            ]}
        >
            {placement && arrowX !== null ? (
                <View
                    style={[
                        styles.arrow,
                        { left: arrowX - ARROW_SIZE / 2 },
                        placement.side === "below" ? { top: -ARROW_SIZE / 2 } : { bottom: -ARROW_SIZE / 2 },
                    ]}
                />
            ) : null}

            <View style={styles.titleRow}>
                <Text style={styles.title} accessibilityRole="header">
                    {view.title}
                </Text>
                {view.counter ? (
                    <Text style={styles.counter}>
                        {view.counter.index} of {view.counter.total}
                    </Text>
                ) : null}
            </View>
            <Text style={styles.body}>{view.body}</Text>

            {!showNext && !view.redirectTo ? (
                <View style={styles.hint}>
                    <Pointer size={15} color={theme.colors.primary} />
                    <Text style={styles.hintText}>Tap the highlighted button</Text>
                </View>
            ) : null}

            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={onSkip}
                    style={styles.skip}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Skip tour"
                >
                    <Text style={styles.skipText}>Skip tour</Text>
                </TouchableOpacity>
                {showNext ? (
                    <TouchableOpacity
                        onPress={onNext}
                        style={styles.next}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                    >
                        <Text style={styles.nextText}>{view.isLast ? "Got it" : "Next"}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        card: {
            position: "absolute",
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 12,
            borderRadius: theme.shape.extraLarge,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
        arrow: {
            position: "absolute",
            width: ARROW_SIZE,
            height: ARROW_SIZE,
            borderRadius: 3,
            backgroundColor: theme.colors.surfaceContainerLow,
            transform: [{ rotate: "45deg" }],
        },
        titleRow: {
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
        },
        title: {
            flex: 1,
            fontSize: 17,
            lineHeight: 24,
            fontFamily: theme.fonts.semibold,
            letterSpacing: -0.2,
            color: theme.colors.onSurface,
        },
        counter: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
            color: theme.colors.onSurfaceVariant,
        },
        body: {
            marginTop: 4,
            fontSize: 14,
            lineHeight: 21,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
        },
        hint: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
        },
        hintText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.primary,
        },
        footer: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            minHeight: 44,
        },
        skip: {
            paddingVertical: 10,
            paddingRight: 12,
        },
        skipText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
        },
        next: {
            minHeight: 44,
            paddingHorizontal: 26,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
        },
        nextText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimary,
        },
    });
