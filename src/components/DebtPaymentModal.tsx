import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";

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
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }
        if (parsed > remainingAmount) {
            Alert.alert("Error", `Amount cannot exceed remaining balance of ${currencySymbol}${remainingAmount.toFixed(2)}`);
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
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContentModern}>
                            <View style={styles.modalHeaderModern}>
                                <Text style={styles.modalTitleModern}>Record Payment</Text>
                                <TouchableOpacity onPress={handleClose}>
                                    <X size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <Text
                                style={{
                                    fontSize: 14,
                                    color: theme.colors.textSecondary,
                                    fontWeight: "500",
                                    marginBottom: 20,
                                }}
                            >
                                Remaining: {currencySymbol}
                                {remainingAmount.toFixed(2)}
                            </Text>

                            <Text style={styles.inputLabelModern}>
                                Amount ({currencySymbol})
                            </Text>
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
                                style={[
                                    styles.submitBtnModern,
                                    { backgroundColor: theme.colors.primary },
                                ]}
                                onPress={handleSubmit}
                            >
                                <Text style={styles.submitBtnTextModern}>Record Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}
