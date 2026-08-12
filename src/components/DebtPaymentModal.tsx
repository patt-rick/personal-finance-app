import React, { useState, useEffect } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { appAlert } from "./dialog";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import AppModal from "./AppModal";

interface DebtPaymentModalProps {
    visible: boolean;
    currencySymbol: string;
    remainingAmount: number;
    onClose: () => void;
    onSubmit: (data: { amount: number; note: string }) => void;
}

export default function DebtPaymentModal({
    visible,
    currencySymbol,
    remainingAmount,
    onClose,
    onSubmit,
}: DebtPaymentModalProps) {
    const theme = useTheme();
    const styles = React.useMemo(() => createDashboardStyles(theme), [theme]);

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    useEffect(() => {
        if (visible) {
            setAmount("");
            setNote("");
        }
    }, [visible]);

    const handleSubmit = () => {
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) {
            appAlert("Error", "Please enter a valid amount");
            return;
        }
        if (parsed > remainingAmount) {
            appAlert(
                "Error",
                `Amount cannot exceed remaining balance of ${currencySymbol}${remainingAmount.toFixed(2)}`,
            );
            return;
        }
        onSubmit({ amount: parsed, note: note.trim() });
        setAmount("");
        setNote("");
    };

    const handleClose = () => {
        setAmount("");
        setNote("");
        onClose();
    };

    return (
        <AppModal
            visible={visible}
            onClose={handleClose}
            title="Record Payment"
            showHandle={false}
            scrollable
        >
            <Text
                style={{
                    ...theme.typescale.bodyMedium,
                    color: theme.colors.onSurfaceVariant,
                    fontVariant: ["tabular-nums"],
                    marginBottom: 20,
                }}
            >
                Remaining: {currencySymbol}
                {remainingAmount.toFixed(2)}
            </Text>

            <Text style={styles.inputLabelModern}>Amount ({currencySymbol})</Text>
            <TextInput
                style={styles.modalInputLargeModern}
                placeholder="0.00"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
            />

            <Text style={styles.inputLabelModern}>Note (Optional)</Text>
            <TextInput
                style={styles.modalInputModern}
                placeholder="Payment note..."
                placeholderTextColor={theme.colors.placeholder}
                value={note}
                onChangeText={setNote}
            />

            <TouchableOpacity
                style={[styles.submitBtnModern, { backgroundColor: theme.colors.primary }]}
                onPress={handleSubmit}
            >
                <Text style={styles.submitBtnTextModern}>Record Payment</Text>
            </TouchableOpacity>
        </AppModal>
    );
}
