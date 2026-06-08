import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, Radio } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import { SenderMapping } from "../types";

interface Props {
    mapping: SenderMapping;
    business: Business | undefined;
    onPress: () => void;
    last?: boolean;
}

export default function SenderMappingRow({ mapping, business, onPress, last }: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const routeLabel = business ? business.name : mapping.businessId ? "Cashbook missing" : "Unassigned";
    const routeColor = business
        ? theme.colors.income
        : mapping.businessId
            ? theme.colors.error
            : theme.colors.onSurfaceVariant;

    return (
        <TouchableOpacity
            style={[
                styles.row,
                last && { borderBottomWidth: 0 },
            ]}
            onPress={onPress}
        >
            <View style={styles.iconCircle}>
                <Radio size={18} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>{mapping.displayName}</Text>
                <View style={styles.metaRow}>
                    <Text style={[styles.meta, { color: routeColor }]}>{routeLabel}</Text>
                    {mapping.autoCreated ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Auto</Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        row: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.l,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
        },
        title: {
            fontSize: 15,
            fontWeight: "600",
            letterSpacing: -0.1,
            color: theme.colors.onSurface,
        },
        metaRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 3,
        },
        meta: {
            fontSize: 12,
            fontWeight: "500",
        },
        badge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: theme.shape.small,
            backgroundColor: theme.colors.secondaryContainer,
        },
        badgeText: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.3,
            color: theme.colors.onSecondaryContainer,
        },
    });
