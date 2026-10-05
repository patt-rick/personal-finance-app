import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, Wallet } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";

const CURRENCIES = [
    { label: "US Dollar", value: "USD", symbol: "$" },
    { label: "Ghana Cedi", value: "GHS", symbol: "₵" },
    { label: "Euro", value: "EUR", symbol: "€" },
    { label: "British Pound", value: "GBP", symbol: "£" },
    { label: "Nigerian Naira", value: "NGN", symbol: "₦" },
];

export function SectionLabel({ label }: { label: string }) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    return <Text style={styles.sectionLabel}>{label}</Text>;
}

export function NavRow({
    icon,
    iconBg,
    title,
    subtitle,
    onPress,
    last,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    last?: boolean;
}) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    return (
        <TouchableOpacity style={[styles.navRow, last && { borderBottomWidth: 0 }]} onPress={onPress}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={styles.navTitle}>{title}</Text>
                <Text style={styles.navSubtitle}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
    );
}

export function CurrencyRow({ current, onChange }: { current: string; onChange: (value: string) => void }) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    return (
        <View style={styles.currencyRow}>
            <View style={styles.currencyHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Wallet size={18} color={theme.colors.onSecondaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.navTitle}>Default Currency</Text>
                    <Text style={styles.navSubtitle}>For auto-created cashbooks</Text>
                </View>
            </View>
            <View style={styles.currencyGrid}>
                {CURRENCIES.map((c) => {
                    const selected = current === c.value;
                    return (
                        <TouchableOpacity
                            key={c.value}
                            style={[
                                styles.currencyCard,
                                selected && {
                                    backgroundColor: theme.colors.primary,
                                    borderColor: theme.colors.primary,
                                },
                            ]}
                            onPress={() => onChange(c.value)}
                        >
                            <Text style={[styles.currencySymbol, selected && { color: theme.colors.onPrimary }]}>
                                {c.symbol}
                            </Text>
                            <Text style={[styles.currencyCode, selected && { color: theme.colors.onPrimary }]}>
                                {c.value}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        sectionLabel: {
            fontSize: 11,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            marginTop: 24,
            marginBottom: 10,
            marginLeft: 4,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.8,
        },
        navRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.borderLight,
        },
        iconCircle: {
            width: 38,
            height: 38,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
        },
        navTitle: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        navSubtitle: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            marginTop: 1,
            color: theme.colors.onSurfaceVariant,
        },
        currencyRow: {
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.borderLight,
        },
        currencyHeader: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
        },
        currencyGrid: {
            flexDirection: "row",
            gap: 8,
        },
        currencyCard: {
            flex: 1,
            height: 56,
            borderRadius: theme.shape.medium,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
        },
        currencySymbol: {
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
            color: theme.colors.onSurfaceVariant,
        },
        currencyCode: {
            fontSize: 10,
            fontFamily: theme.fonts.semibold,
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
    });
