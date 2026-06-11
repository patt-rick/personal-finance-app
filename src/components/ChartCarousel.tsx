import React, { useRef, useState, useCallback, useMemo } from "react";
import {
    View,
    ScrollView,
    Dimensions,
    StyleSheet,
    Text,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import { useTheme } from "../theme/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ChartPage {
    title: string;
    legend?: { label: string; color: string }[];
    content: React.ReactNode;
}

interface ChartCarouselProps {
    pages: ChartPage[];
}

export default function ChartCarousel({ pages }: ChartCarouselProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [activeIndex, setActiveIndex] = useState(0);
    const cardGap = 12;
    const cardWidth = SCREEN_WIDTH - 40; // 20px padding each side

    const snapInterval = cardWidth + cardGap;

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / snapInterval);
            if (index !== activeIndex && index >= 0 && index < pages.length) {
                setActiveIndex(index);
            }
        },
        [activeIndex, snapInterval, pages.length],
    );

    if (pages.length === 0) return null;

    // Single chart — render directly without carousel wrapper
    if (pages.length === 1) {
        const page = pages[0];
        return (
            <View style={styles.wrapper}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{page.title}</Text>
                    {page.legend && (
                        <View style={styles.legendRow}>
                            {page.legend.map((l, i) => (
                                <View key={i} style={styles.legendItem}>
                                    <View
                                        style={[styles.legendDot, { backgroundColor: l.color }]}
                                    />
                                    <Text style={styles.legendText}>{l.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
                <View style={styles.card}>{page.content}</View>
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            {/* Active page header */}
            <View style={styles.headerRow}>
                <Text style={styles.title}>
                    {pages[activeIndex].title}
                </Text>
                {pages[activeIndex].legend && (
                    <View style={styles.legendRow}>
                        {pages[activeIndex].legend!.map((l, i) => (
                            <View key={i} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                                <Text style={styles.legendText}>{l.label}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Swipeable pages */}
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={snapInterval}
                snapToAlignment="start"
                contentContainerStyle={{ gap: cardGap }}
            >
                {pages.map((page, index) => (
                    <View key={index} style={[styles.card, { width: cardWidth }]}>
                        {page.content}
                    </View>
                ))}
            </ScrollView>

            {/* Dot indicators */}
            <View style={styles.dotsRow}>
                {pages.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                backgroundColor:
                                    index === activeIndex
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                width: index === activeIndex ? 18 : 6,
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        wrapper: {
            paddingHorizontal: 20,
            marginTop: 16,
            marginBottom: 4,
        },
        headerRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
        },
        title: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            letterSpacing: -0.1,
            color: theme.colors.onSurface,
        },
        legendRow: {
            flexDirection: "row",
            gap: 10,
        },
        legendItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
        },
        legendDot: {
            width: 7,
            height: 7,
            borderRadius: 3.5,
        },
        legendText: {
            fontSize: 10,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
        },
        card: {
            borderRadius: 16,
            padding: 16,
            justifyContent: "center",
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
        },
        dotsRow: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 10,
            gap: 5,
        },
        dot: {
            height: 6,
            borderRadius: 3,
        },
    });
