import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useTheme } from "../theme/theme";
import AppModal from "./AppModal";

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
    onSubmit: (name: string, currency: string) => void;
}

export default function CreateCashbookModal({
    visible,
    onClose,
    onSubmit,
}: CreateCashbookModalProps) {
    const theme = useTheme();
    const [businessName, setBusinessName] = useState("");
    const [selectedCurrency, setSelectedCurrency] = useState("USD");

    const handleSubmit = () => {
        if (!businessName.trim()) {
            Alert.alert("Error", "Please enter a business name");
            return;
        }
        onSubmit(businessName.trim(), selectedCurrency);
        setBusinessName("");
        setSelectedCurrency("USD");
    };

    return (
        <AppModal visible={visible} onClose={onClose} title="New Cashbook" scrollable>
            <Text style={[s.inputLabel, { color: theme.colors.onSurfaceVariant }]}>Cashbook Name</Text>
            <TextInput
                style={[s.input, {
                    color: theme.colors.onSurface,
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surfaceContainerHighest,
                }]}
                placeholder="e.g. My Shop, Personal Expenses"
                value={businessName}
                onChangeText={setBusinessName}
                placeholderTextColor={theme.colors.onSurfaceVariant}
            />

            <Text style={[s.inputLabel, { color: theme.colors.onSurfaceVariant }]}>Currency</Text>
            <View style={s.currencyGrid}>
                {CURRENCIES.map((curr) => (
                    <TouchableOpacity
                        key={curr.value}
                        style={[
                            s.currencyCard,
                            { backgroundColor: theme.colors.surfaceContainerHigh },
                            selectedCurrency === curr.value && {
                                backgroundColor: theme.colors.secondaryContainer,
                                borderColor: theme.colors.secondaryContainer,
                            },
                        ]}
                        onPress={() => setSelectedCurrency(curr.value)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                s.currSym,
                                { color: theme.colors.onSurface },
                                selectedCurrency === curr.value && {
                                    color: theme.colors.onSecondaryContainer,
                                },
                            ]}
                        >
                            {curr.symbol}
                        </Text>
                        <Text
                            style={[
                                s.currCode,
                                { color: theme.colors.onSurfaceVariant },
                                selectedCurrency === curr.value && {
                                    color: theme.colors.onSecondaryContainer,
                                },
                            ]}
                        >
                            {curr.value}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSubmit}
                activeOpacity={0.85}
            >
                <Text style={[s.submitText, { color: theme.colors.onPrimary }]}>
                    Create Cashbook
                </Text>
            </TouchableOpacity>
        </AppModal>
    );
}

const s = StyleSheet.create({
    inputLabel: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        fontSize: 15,
        marginBottom: 12,
    },
    currencyGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 28 },
    currencyCard: {
        width: "22%",
        height: 64,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "transparent",
    },
    currSym: { fontSize: 20, fontWeight: "700" },
    currCode: { fontSize: 10, fontWeight: "600", marginTop: 2 },
    submitBtn: { height: 52, borderRadius: 999, alignItems: "center", justifyContent: "center" },
    submitText: { fontWeight: "700", fontSize: 15 },
});
