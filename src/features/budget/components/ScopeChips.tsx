import React, { RefObject, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Layers } from "lucide-react-native";
import { AppTheme, useTheme } from "../../../theme/theme";
import { BudgetScope, Business } from "../../../types";
import { currencyLabel, sameScope, scopeKey } from "../scope";
import { useTourTarget } from "../../tour/hooks";

interface ScopeChipsProps {
    scopes: BudgetScope[];
    selected: BudgetScope | null;
    businesses: Business[];
    onSelect: (scope: BudgetScope) => void;
    tourScrollRef?: RefObject<ScrollView | null>;
}

export default function ScopeChips({ scopes, selected, businesses, onSelect, tourScrollRef }: ScopeChipsProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const tourTarget = useTourTarget("budget-scope", tourScrollRef);
    if (scopes.length < 2) return null;
    return (
        <View {...tourTarget}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {scopes.map((scope) => {
                    const on = !!selected && sameScope(scope, selected);
                    const label =
                        scope.kind === "currency"
                            ? "All cashbooks"
                            : businesses.find((b) => b.id === scope.businessId)?.name ?? "Cashbook";
                    const fg = on ? theme.colors.inverseOnSurface : theme.colors.onSurface;
                    return (
                        <Pressable
                            key={scopeKey(scope)}
                            onPress={() => onSelect(scope)}
                            style={[styles.chip, on && styles.chipOn]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={scope.kind === "currency" ? `All ${currencyLabel(scope.currency)} cashbooks` : label}
                        >
                            {scope.kind === "currency" && <Layers size={13} color={fg} />}
                            <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        row: {
            gap: 8,
            paddingHorizontal: 20,
            paddingBottom: 14,
        },
        chip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        chipOn: {
            backgroundColor: theme.colors.inverseSurface,
        },
        text: {
            ...theme.typescale.labelLarge,
        },
    });
