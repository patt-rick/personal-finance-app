import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useTheme } from "../theme/theme";
import AppModal from "./AppModal";
import CashbookAppearancePicker from "./CashbookAppearancePicker";
import { CASHBOOK_COLORS } from "../features/cashbooks/appearance/palette";
import { DEFAULT_CASHBOOK_ICON } from "../features/cashbooks/appearance/resolve";

const CURRENCIES = [
    { label: "US Dollar", value: "USD", symbol: "$" },
    { label: "Ghana Cedi", value: "GHS", symbol: "₵" },
    { label: "Euro", value: "EUR", symbol: "€" },
    { label: "British Pound", value: "GBP", symbol: "£" },
    { label: "Nigerian Naira", value: "NGN", symbol: "₦" },
];

interface CreateCashbookModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (name: string, currency: string, color: string, iconKey: string) => void;
}

export default function CreateCashbookModal({
    visible,
    onClose,
    onSubmit,
}: CreateCashbookModalProps) {
    const theme = useTheme();
    const s = useMemo(() => createStyles(theme), [theme]);
    const [businessName, setBusinessName] = useState("");
    const [selectedCurrency, setSelectedCurrency] = useState("USD");
    const [color, setColor] = useState<string>(CASHBOOK_COLORS[0]);
    const [iconKey, setIconKey] = useState<string>(DEFAULT_CASHBOOK_ICON);

    const handleSubmit = () => {
        if (!businessName.trim()) {
            Alert.alert("Error", "Please enter a business name");
            return;
        }
        onSubmit(businessName.trim(), selectedCurrency, color, iconKey);
        setBusinessName("");
        setSelectedCurrency("USD");
        setColor(CASHBOOK_COLORS[0]);
        setIconKey(DEFAULT_CASHBOOK_ICON);
    };

    return (
        <AppModal visible={visible} onClose={onClose} title="New Cashbook" scrollable>
            <Text style={s.inputLabel}>Cashbook Name</Text>
            <TextInput
                style={s.input}
                placeholder="e.g. My Shop, Personal Expenses"
                value={businessName}
                onChangeText={setBusinessName}
                placeholderTextColor={theme.colors.onSurfaceVariant}
            />

            <Text style={s.inputLabel}>Currency</Text>
            <View style={s.currencyGrid}>
                {CURRENCIES.map((curr) => (
                    <TouchableOpacity
                        key={curr.value}
                        style={[s.currencyCard, selectedCurrency === curr.value && s.currencyCardActive]}
                        onPress={() => setSelectedCurrency(curr.value)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                s.currSym,
                                selectedCurrency === curr.value && { color: theme.colors.onPrimary },
                            ]}
                        >
                            {curr.symbol}
                        </Text>
                        <Text
                            style={[
                                s.currCode,
                                selectedCurrency === curr.value && {
                                    color: theme.colors.onPrimary,
                                    fontFamily: theme.fonts.semibold,
                                },
                            ]}
                        >
                            {curr.value}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <CashbookAppearancePicker
                color={color}
                iconKey={iconKey}
                onChangeColor={setColor}
                onChangeIcon={setIconKey}
            />

            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={s.submitText}>Create Cashbook</Text>
            </TouchableOpacity>
        </AppModal>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        inputLabel: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            marginTop: 12,
        },
        input: {
            height: 52,
            borderRadius: 12,
            paddingHorizontal: 14,
            fontSize: 15,
            fontFamily: theme.fonts.regular,
            marginBottom: 12,
            backgroundColor: theme.colors.surfaceContainerHigh,
            color: theme.colors.onSurface,
        },
        currencyGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 28 },
        currencyCard: {
            width: "22%",
            height: 64,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            backgroundColor: "transparent",
        },
        currencyCardActive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        currSym: {
            fontSize: 20,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        currCode: {
            fontSize: 10,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        submitBtn: {
            height: 52,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
        },
        submitText: {
            fontFamily: theme.fonts.semibold,
            fontSize: 15,
            color: theme.colors.onPrimary,
        },
    });
