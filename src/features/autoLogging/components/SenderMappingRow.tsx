import React from "react";
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
    const routeLabel = business ? business.name : mapping.businessId ? "Cashbook missing" : "Unassigned";
    const routeColor = business
        ? theme.colors.success
        : mapping.businessId
            ? theme.colors.error
            : theme.colors.textSecondary;

    return (
        <TouchableOpacity
            style={[
                styles.row,
                { borderBottomColor: theme.colors.borderLight },
                last && { borderBottomWidth: 0 },
            ]}
            onPress={onPress}
        >
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.incomeBg }]}>
                <Radio size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{mapping.displayName}</Text>
                <View style={styles.metaRow}>
                    <Text style={[styles.meta, { color: routeColor }]}>{routeLabel}</Text>
                    {mapping.autoCreated ? (
                        <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>Auto</Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: -0.1,
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
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});
