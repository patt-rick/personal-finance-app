import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import CashbookIconBadge from "../../../components/CashbookIconBadge";
import { cashbookCurrency } from "../../../utils/transfers";

interface Props {
    businesses: Business[];
    selectedId: string | null;
    messageCurrency: string | null;
    onSelect: (id: string) => void;
}

export default function ReviewCashbookPicker({ businesses, selectedId, messageCurrency, onSelect }: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const selected = businesses.find((b) => b.id === selectedId);
    const mismatch =
        selected && messageCurrency && cashbookCurrency(selected) !== messageCurrency
            ? `${selected.name} uses ${cashbookCurrency(selected)}, but this message is in ${messageCurrency}.`
            : null;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Cashbook</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                keyboardShouldPersistTaps="handled"
                accessibilityRole="radiogroup"
            >
                {businesses.map((b) => {
                    const active = b.id === selectedId;
                    return (
                        <TouchableOpacity
                            key={b.id}
                            style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                            onPress={() => onSelect(b.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 9, bottom: 9 }}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                            accessibilityLabel={`Save to ${b.name}`}
                        >
                            <CashbookIconBadge business={b} size={22} />
                            <Text
                                style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}
                                numberOfLines={1}
                            >
                                {b.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
            {mismatch ? <Text style={styles.warning}>{mismatch}</Text> : null}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        container: {
            marginTop: 6,
        },
        label: {
            fontSize: 10,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 6,
            color: theme.colors.onSurfaceVariant,
        },
        row: {
            gap: 8,
        },
        chip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            maxWidth: 180,
            paddingLeft: 4,
            paddingRight: 12,
            paddingVertical: 4,
            borderRadius: theme.shape.full,
            borderWidth: 1,
        },
        chipInactive: {
            borderColor: theme.colors.outlineVariant,
        },
        chipActive: {
            backgroundColor: theme.colors.inverseSurface,
            borderColor: theme.colors.inverseSurface,
        },
        chipText: {
            fontSize: 13,
            flexShrink: 1,
        },
        chipTextInactive: {
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
        },
        chipTextActive: {
            fontFamily: theme.fonts.semibold,
            color: theme.colors.inverseOnSurface,
        },
        warning: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            lineHeight: 15,
            marginTop: 6,
            color: theme.colors.gold,
        },
    });
