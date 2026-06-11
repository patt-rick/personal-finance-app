import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Keyboard,
    StyleSheet,
} from "react-native";
import { Transaction, Category } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import AppModal from "./AppModal";

interface TransactionEntryModalProps {
    visible: boolean;
    entryType: "income" | "expense";
    editingTx: Transaction | null;
    categories: Category[];
    symbol: string;
    showTypeToggle?: boolean;
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
    showTypeToggle,
    onClose,
    onSubmit,
}: TransactionEntryModalProps) {
    const theme = useTheme();
    const styles = React.useMemo(() => createDashboardStyles(theme), [theme]);

    const defaultCategoryForType = (t: "income" | "expense") =>
        t === "income" ? "Other Income" : "Other Expense";

    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(
        defaultCategoryForType(entryType),
    );
    const [currentType, setCurrentType] = useState<"income" | "expense">(entryType);

    useEffect(() => {
        if (editingTx) {
            setAmount(editingTx.amount.toString());
            setSelectedCategory(
                editingTx.category || defaultCategoryForType(editingTx.type),
            );
            setRemark(editingTx.remark || "");
            setCurrentType(editingTx.type);
        } else {
            setAmount("");
            setRemark("");
            setSelectedCategory(defaultCategoryForType(entryType));
            setCurrentType(entryType);
        }
    }, [editingTx, visible, entryType]);

    const handleTypeChange = (next: "income" | "expense") => {
        if (next === currentType) return;
        setCurrentType(next);
        const stillValid = categories.some(
            (c) => c.type === next && c.name === selectedCategory,
        );
        if (!stillValid) setSelectedCategory(defaultCategoryForType(next));
    };

    const handleSubmit = () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }
        onSubmit({
            amount: parseFloat(amount),
            category: selectedCategory,
            remark,
            entryType: currentType,
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

    const title = editingTx
        ? "Edit Transaction"
        : entryType === "income"
        ? "New Income"
        : "New Expense";

    return (
        <AppModal
            visible={visible}
            onClose={handleClose}
            title={title}
            showHandle={false}
            scrollable
        >
            {editingTx || showTypeToggle ? (
                <View style={s.typeToggleRow}>
                    {(["income", "expense"] as const).map((t) => {
                        const active = currentType === t;
                        const activeBg =
                            t === "income" ? theme.colors.incomeContainer : theme.colors.expenseContainer;
                        const activeText =
                            t === "income" ? theme.colors.onIncomeContainer : theme.colors.onExpenseContainer;
                        return (
                            <TouchableOpacity
                                key={t}
                                onPress={() => handleTypeChange(t)}
                                style={[
                                    s.typeToggleBtn,
                                    {
                                        backgroundColor: active
                                            ? activeBg
                                            : theme.colors.surfaceContainerHigh,
                                        borderWidth: 0,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        s.typeToggleText,
                                        {
                                            color: active
                                                ? activeText
                                                : theme.colors.onSurfaceVariant,
                                            fontWeight: active ? "700" : "500",
                                        },
                                    ]}
                                >
                                    {t === "income" ? "Income" : "Expense"}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ) : null}

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
                    .filter((c) => c.type === currentType)
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
                        backgroundColor: theme.colors.primary,
                    },
                ]}
                onPress={handleSubmit}
            >
                <Text style={styles.submitBtnTextModern}>Save Entry</Text>
            </TouchableOpacity>
        </AppModal>
    );
}

const s = StyleSheet.create({
    typeToggleRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 20,
    },
    typeToggleBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    typeToggleText: {
        fontSize: 14,
        letterSpacing: 0.1,
    },
});
