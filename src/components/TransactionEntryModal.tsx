import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Keyboard,
    StyleSheet,
} from "react-native";
import { Plus, Check, X } from "lucide-react-native";
import { appAlert } from "./dialog";
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
    onCreateCategory?: (
        name: string,
        type: "income" | "expense",
    ) => Promise<Category>;
    onSubmit: (data: {
        amount: number;
        category: string;
        remark: string;
        entryType: "income" | "expense";
        editingTxId: string | null;
        fee?: number;
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
    onCreateCategory,
    onSubmit,
}: TransactionEntryModalProps) {
    const theme = useTheme();
    const styles = React.useMemo(() => createDashboardStyles(theme), [theme]);

    const defaultCategoryForType = (t: "income" | "expense") =>
        t === "income" ? "Other Income" : "Other Expense";

    const [amount, setAmount] = useState("");
    const [fee, setFee] = useState("");
    const [remark, setRemark] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(
        defaultCategoryForType(entryType),
    );
    const [currentType, setCurrentType] = useState<"income" | "expense">(entryType);
    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);

    const closeCategoryInput = () => {
        setAddingCategory(false);
        setNewCategoryName("");
        setSavingCategory(false);
    };

    useEffect(() => {
        if (editingTx) {
            setAmount(editingTx.amount.toString());
            setFee(editingTx.fee?.toString() ?? "");
            setSelectedCategory(
                editingTx.category || defaultCategoryForType(editingTx.type),
            );
            setRemark(editingTx.remark || "");
            setCurrentType(editingTx.type);
        } else {
            setAmount("");
            setFee("");
            setRemark("");
            setSelectedCategory(defaultCategoryForType(entryType));
            setCurrentType(entryType);
        }
        closeCategoryInput();
    }, [editingTx, visible, entryType]);

    const handleTypeChange = (next: "income" | "expense") => {
        if (next === currentType) return;
        closeCategoryInput();
        setCurrentType(next);
        if (next === "income") setFee("");
        const stillValid = categories.some(
            (c) => c.type === next && c.name === selectedCategory,
        );
        if (!stillValid) setSelectedCategory(defaultCategoryForType(next));
    };

    const handleSubmit = () => {
        if (!amount || isNaN(parseFloat(amount))) {
            appAlert("Error", "Please enter a valid amount");
            return;
        }
        if (currentType === "expense" && fee.trim() !== "") {
            const parsedFee = parseFloat(fee);
            if (!Number.isFinite(parsedFee) || parsedFee < 0) {
                appAlert("Error", "Please enter a valid fee");
                return;
            }
        }
        onSubmit({
            amount: parseFloat(amount),
            category: selectedCategory,
            remark,
            entryType: currentType,
            editingTxId: editingTx?.id ?? null,
            fee:
                currentType === "expense" &&
                fee.trim() !== "" &&
                Number.isFinite(parseFloat(fee))
                    ? parseFloat(fee)
                    : undefined,
        });
        Keyboard.dismiss();
        setAmount("");
        setFee("");
        setRemark("");
    };

    const handleClose = () => {
        Keyboard.dismiss();
        setAmount("");
        setFee("");
        setRemark("");
        closeCategoryInput();
        onClose();
    };

    const handleCreateCategory = async () => {
        if (savingCategory) return;
        const trimmed = newCategoryName.trim();
        if (!trimmed || !onCreateCategory) {
            closeCategoryInput();
            return;
        }
        try {
            setSavingCategory(true);
            const created = await onCreateCategory(trimmed, currentType);
            setSelectedCategory(created.name);
            Keyboard.dismiss();
            closeCategoryInput();
        } catch {
            appAlert("Error", "Could not save category. Please try again.");
        } finally {
            setSavingCategory(false);
        }
    };

    const title = editingTx
        ? "Edit Transaction"
        : currentType === "income"
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

            {currentType === "expense" ? (
                <>
                    <Text style={styles.inputLabelModern}>Fee / tax ({symbol})</Text>
                    <TextInput
                        style={styles.modalInputModern}
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.placeholder}
                        keyboardType="decimal-pad"
                        value={fee}
                        onChangeText={setFee}
                    />
                </>
            ) : null}

            <Text style={styles.inputLabelModern}>Category</Text>
            {addingCategory ? (
                <View style={s.catInputRow}>
                    <TextInput
                        style={[
                            s.catInput,
                            {
                                backgroundColor: theme.colors.surfaceContainerHigh,
                                color: theme.colors.onSurface,
                            },
                        ]}
                        placeholder="New category name"
                        placeholderTextColor={theme.colors.placeholder}
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                        maxLength={30}
                        autoFocus
                        editable={!savingCategory}
                        returnKeyType="done"
                        onSubmitEditing={handleCreateCategory}
                    />
                    <TouchableOpacity
                        style={[s.catIconBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={handleCreateCategory}
                        disabled={savingCategory}
                    >
                        <Check size={18} color={theme.colors.onPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            s.catIconBtn,
                            { backgroundColor: theme.colors.surfaceContainerHigh },
                        ]}
                        onPress={closeCategoryInput}
                        disabled={savingCategory}
                    >
                        <X size={18} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                </View>
            ) : (
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
                                    selectedCategory === cat.name &&
                                        styles.categoryChipActive,
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
                    {onCreateCategory ? (
                        <TouchableOpacity
                            style={[styles.categoryChip, s.addChip]}
                            onPress={() => setAddingCategory(true)}
                        >
                            <Plus size={14} color={theme.colors.primary} />
                            <Text
                                style={[
                                    styles.categoryChipText,
                                    { color: theme.colors.primary },
                                ]}
                            >
                                New
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </ScrollView>
            )}

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
    addChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    catInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 24,
    },
    catInput: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    catIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
});
