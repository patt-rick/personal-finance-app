import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, Inbox } from "lucide-react-native";
import { useTheme } from "../../theme/theme";

interface Props {
    count: number;
    onPress: () => void;
}

export default function PendingReviewBanner({ count, onPress }: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    if (count <= 0) return null;

    const title = count === 1 ? "1 entry to review" : `${count} entries to review`;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${title}. Open the review queue.`}
        >
            <View style={styles.iconCircle}>
                <Inbox size={18} color={theme.colors.gold} />
            </View>
            <View style={styles.textWrap}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.body} numberOfLines={2}>
                    Auto-logged messages we weren't sure about. Confirm or discard them.
                </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        card: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginHorizontal: 20,
            marginTop: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 16,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
        },
        iconCircle: {
            width: 38,
            height: 38,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.goldContainer,
        },
        textWrap: {
            flex: 1,
        },
        title: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        body: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 17,
            marginTop: 2,
        },
    });
