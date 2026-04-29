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
            <Text style={[s.inputLabel, { color: theme.colors.textSecondary }]}>Cashbook Name</Text>
            <TextInput
                style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="e.g. My Shop, Personal Expenses"
                value={businessName}
                onChangeText={setBusinessName}
                placeholderTextColor={theme.colors.placeholder}
            />

            <Text style={[s.inputLabel, { color: theme.colors.textSecondary }]}>Currency</Text>
            <View style={s.currencyGrid}>
                {CURRENCIES.map((curr) => (
                    <TouchableOpacity
                        key={curr.value}
                        style={[
                            s.currencyCard,
                            { backgroundColor: theme.colors.surface },
                            selectedCurrency === curr.value && {
                                backgroundColor: theme.colors.primary,
                                borderColor: theme.colors.primary,
                            },
                        ]}
                        onPress={() => setSelectedCurrency(curr.value)}
                    >
                        <Text
                            style={[
                                s.currSym,
                                { color: theme.colors.text },
                                selectedCurrency === curr.value && {
                                    color: theme.colors.textInverse,
                                },
                            ]}
                        >
                            {curr.symbol}
                        </Text>
                        <Text
                            style={[
                                s.currCode,
                                { color: theme.colors.textSecondary },
                                selectedCurrency === curr.value && {
                                    color: theme.colors.textInverse,
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
            >
                <Text style={[s.submitText, { color: theme.colors.textInverse }]}>
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
        height: 48,
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
    submitBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    submitText: { fontWeight: "700", fontSize: 15 },
});
