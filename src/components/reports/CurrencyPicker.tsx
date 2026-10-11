import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { useTheme } from "../../theme/theme";
import AppModal from "../AppModal";
import { getCurrencyName, getCurrencySymbol } from "../../utils/_helpers";
import { ReportCurrency } from "../../utils/reportCurrency";

interface CurrencyPickerProps {
    currencies: ReportCurrency[];
    selected: string;
    onSelect: (code: string) => void;
}

/** Header pill that switches which currency the report covers; only worth showing when cashbooks use several. */
export default function CurrencyPicker({ currencies, selected, onSelect }: CurrencyPickerProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [open, setOpen] = useState(false);

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Report currency: ${getCurrencyName(selected)}`}
                accessibilityHint="Choose which currency's cashbooks to report on"
                hitSlop={8}
                style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
            >
                <Text style={styles.pillText} maxFontSizeMultiplier={1.3}>
                    {getCurrencySymbol(selected)} {selected}
                </Text>
                <ChevronDown size={16} color={theme.colors.onSurfaceVariant} />
            </Pressable>

            <AppModal visible={open} onClose={() => setOpen(false)} title="Show reports in">
                <View style={styles.list}>
                    {currencies.map((c) => {
                        const isSelected = c.code === selected;
                        return (
                            <Pressable
                                key={c.code}
                                onPress={() => {
                                    onSelect(c.code);
                                    setOpen(false);
                                }}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: isSelected }}
                                accessibilityLabel={`${getCurrencyName(c.code)}, ${c.cashbooks.length} cashbook${
                                    c.cashbooks.length !== 1 ? "s" : ""
                                }`}
                                style={({ pressed }) => [
                                    styles.row,
                                    (isSelected || pressed) && { backgroundColor: theme.colors.surfaceContainerHigh },
                                ]}
                            >
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{getCurrencySymbol(c.code)}</Text>
                                </View>
                                <View style={styles.rowText}>
                                    <Text style={styles.name}>{getCurrencyName(c.code)}</Text>
                                    <Text style={styles.cashbooks} numberOfLines={1}>
                                        {c.cashbooks.join(", ")}
                                    </Text>
                                </View>
                                {isSelected && <Check size={20} color={theme.colors.primary} />}
                            </Pressable>
                        );
                    })}
                </View>
            </AppModal>
        </>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        pill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            minHeight: 40,
            paddingLeft: 14,
            paddingRight: 10,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        pillPressed: {
            backgroundColor: theme.colors.surfaceContainerHighest,
        },
        pillText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.onSurface,
        },
        list: {
            gap: 4,
            paddingBottom: 8,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            minHeight: 60,
            paddingHorizontal: 12,
            borderRadius: theme.shape.large,
        },
        badge: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceContainer,
        },
        badgeText: {
            ...theme.typescale.titleMedium,
            color: theme.colors.onSurface,
        },
        rowText: {
            flex: 1,
        },
        name: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        cashbooks: {
            ...theme.typescale.bodySmall,
            letterSpacing: 0,
            color: theme.colors.onSurfaceVariant,
        },
    });
