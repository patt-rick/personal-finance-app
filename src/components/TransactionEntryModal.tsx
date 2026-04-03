import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from "react-native";
import { X } from "lucide-react-native";
import { Transaction, Category } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";

interface TransactionEntryModalProps {
    visible: boolean;
    entryType: "income" | "expense";
    editingTx: Transaction | null;
    categories: Category[];
    symbol: string;
    onClose: () => void;
    onSubmit: (data: {
        amount: number;
        category: string;
        remark: string;
        entryType: "income" | "expense";
        editingTxId: string | null;
    }) => void;
}

export default function TransactionEntryModal({
    visible,
    entryType,
    editingTx,
    categories,
    symbol,
    onClose,
    onSubmit,
}: TransactionEntryModalProps) {
    const theme = useTheme();
    const styles = React.useMemo(() => createDashboardStyles(theme), [theme]);

    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Others");

    useEffect(() => {
        if (editingTx) {
            setAmount(editingTx.amount.toString());
            setSelectedCategory(editingTx.category || "Others");
            setRemark(editingTx.remark || "");
        } else {
            setAmount("");
            setRemark("");
            setSelectedCategory("Others");
        }
    }, [editingTx, visible]);

    const handleSubmit = () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }
        onSubmit({
            amount: parseFloat(amount),
            category: selectedCategory,
            remark,
            entryType,
            editingTxId: editingTx?.id ?? null,
        });
        Keyboard.dismiss();
        setAmount("");
        setRemark("");
    };

    const handleClose = () => {
        Keyboard.dismiss();
        setAmount("");
        setRemark("");
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContentModern}>
                            <View style={styles.modalHeaderModern}>
                                <Text style={styles.modalTitleModern}>
                                    {editingTx
                                        ? "Edit Transaction"
                                        : entryType === "income"
                                          ? "New Income"
                                          : "New Expense"}
                                </Text>
                                <TouchableOpacity onPress={handleClose}>
                                    <X size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabelModern}>Amount ({symbol})</Text>
                            <TextInput
                                style={styles.modalInputLargeModern}
                                placeholder="0.00"
                                placeholderTextColor={theme.colors.placeholder}
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={setAmount}
                                autoFocus
                            />

                            <Text style={styles.inputLabelModern}>Category</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.categoryPicker}
                                keyboardShouldPersistTaps="always"
                            >
                                {categories
                                    .filter((c) => c.type === entryType)
                                    .map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.categoryChip,
                                                selectedCategory === cat.name && styles.categoryChipActive,
                                            ]}
                                            onPress={() => setSelectedCategory(cat.name)}
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryChipText,
                                                    selectedCategory === cat.name &&
                                                        styles.categoryChipTextActive,
                                                ]}
                                            >
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>

                            <Text style={styles.inputLabelModern}>Remark</Text>
                            <TextInput
                                style={styles.modalInputModern}
                                placeholder="What was this for?"
                                placeholderTextColor={theme.colors.placeholder}
                                value={remark}
                                onChangeText={setRemark}
                            />

                            <TouchableOpacity
                                style={[
                                    styles.submitBtnModern,
                                    {
                                        backgroundColor:
                                            entryType === "income"
                                                ? theme.colors.income
                                                : theme.colors.expense,
                                    },
                                ]}
                                onPress={handleSubmit}
                            >
                                <Text style={styles.submitBtnTextModern}>Save Entry</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
