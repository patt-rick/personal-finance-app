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
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import { X, Calendar } from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Debt } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { getCurrencySymbol } from "../utils/_helpers";

interface DebtEntryModalProps {
    visible: boolean;
    editingDebt: Debt | null;
    onClose: () => void;
    onSubmit: (data: {
        personName: string;
        amount: number;
        type: "owed_to_me" | "i_owe";
        description: string;
        dueDate: string;
        currency: string;
        editingId: string | null;
    }) => void;
}

const CURRENCIES = ["USD", "GHS", "EUR", "GBP"] as const;

export default function DebtEntryModal({
    visible,
    editingDebt,
    onClose,
    onSubmit,
}: DebtEntryModalProps) {
    const theme = useTheme();
    const styles = React.useMemo(() => createDashboardStyles(theme), [theme]);

    const [personName, setPersonName] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"owed_to_me" | "i_owe">("owed_to_me");
    const [currency, setCurrency] = useState("USD");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (editingDebt) {
            setPersonName(editingDebt.personName);
            setAmount(editingDebt.amount.toString());
            setType(editingDebt.type);
            setCurrency(editingDebt.currency);
            setDescription(editingDebt.description || "");
            setDueDate(editingDebt.dueDate ? new Date(editingDebt.dueDate) : null);
            setShowDatePicker(false);
        } else {
            resetForm();
        }
    }, [editingDebt, visible]);

    const resetForm = () => {
        setPersonName("");
        setAmount("");
        setType("owed_to_me");
        setCurrency("USD");
        setDescription("");
        setDueDate(null);
        setShowDatePicker(false);
    };

    const formatDueDate = (date: Date) =>
        date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }
        if (event.type === "dismissed") return;
        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    const handleSubmit = () => {
        if (!personName.trim()) {
            Alert.alert("Error", "Please enter a person name");
            return;
        }
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }
        onSubmit({
            personName: personName.trim(),
            amount: parseFloat(amount),
            type,
            description: description.trim(),
            dueDate: dueDate ? dueDate.toISOString().split("T")[0] : "",
            currency,
            editingId: editingDebt?.id ?? null,
        });
        resetForm();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const isOwedToMe = type === "owed_to_me";
    const accentColor = isOwedToMe ? theme.colors.income : theme.colors.expense;

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
                                <Text style={styles.modalTitleModern}>
                                    {editingDebt ? "Edit Debt" : "New Debt"}
                                </Text>
                                <TouchableOpacity onPress={handleClose}>
                                    <X size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.inputLabelModern}>Person Name</Text>
                                <TextInput
                                    style={styles.modalInputModern}
                                    placeholder="Who is this debt with?"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={personName}
                                    onChangeText={setPersonName}
                                    autoFocus
                                />

                                <Text style={styles.inputLabelModern}>
                                    Amount ({getCurrencySymbol(currency)})
                                </Text>
                                <TextInput
                                    style={styles.modalInputLargeModern}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.placeholder}
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                />

                                <Text style={styles.inputLabelModern}>Type</Text>
                                <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            alignItems: "center",
                                            backgroundColor: isOwedToMe
                                                ? theme.colors.incomeBg
                                                : theme.colors.surface,
                                            borderWidth: 1.5,
                                            borderColor: isOwedToMe
                                                ? theme.colors.income
                                                : theme.colors.border,
                                        }}
                                        onPress={() => setType("owed_to_me")}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: isOwedToMe
                                                    ? theme.colors.income
                                                    : theme.colors.textSecondary,
                                            }}
                                        >
                                            Owed to Me
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            alignItems: "center",
                                            backgroundColor: !isOwedToMe
                                                ? theme.colors.expenseBg
                                                : theme.colors.surface,
                                            borderWidth: 1.5,
                                            borderColor: !isOwedToMe
                                                ? theme.colors.expense
                                                : theme.colors.border,
                                        }}
                                        onPress={() => setType("i_owe")}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: !isOwedToMe
                                                    ? theme.colors.expense
                                                    : theme.colors.textSecondary,
                                            }}
                                        >
                                            I Owe
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.inputLabelModern}>Currency</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.categoryPicker}
                                >
                                    {CURRENCIES.map((c) => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[
                                                styles.categoryChip,
                                                currency === c && styles.categoryChipActive,
                                            ]}
                                            onPress={() => setCurrency(c)}
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryChipText,
                                                    currency === c && styles.categoryChipTextActive,
                                                ]}
                                            >
                                                {getCurrencySymbol(c)} {c}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.inputLabelModern}>Description (Optional)</Text>
                                <TextInput
                                    style={styles.modalInputModern}
                                    placeholder="What is this debt for?"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={description}
                                    onChangeText={setDescription}
                                />

                                <Text style={styles.inputLabelModern}>Due Date (Optional)</Text>
                                <View style={{ marginBottom: 24 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 10,
                                                height: 48,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: showDatePicker ? theme.colors.primary : theme.colors.border,
                                                backgroundColor: theme.colors.background,
                                                paddingHorizontal: 16,
                                            }}
                                            onPress={() => setShowDatePicker(!showDatePicker)}
                                        >
                                            <Calendar
                                                size={16}
                                                color={dueDate ? theme.colors.primary : theme.colors.textSecondary}
                                            />
                                            <Text style={{
                                                fontSize: 14,
                                                color: dueDate ? theme.colors.text : theme.colors.placeholder,
                                                fontWeight: dueDate ? "600" : "400",
                                            }}>
                                                {dueDate ? formatDueDate(dueDate) : "No due date"}
                                            </Text>
                                        </TouchableOpacity>
                                        {dueDate && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setDueDate(null);
                                                    setShowDatePicker(false);
                                                }}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <X size={20} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={dueDate || new Date()}
                                            mode="date"
                                            display={Platform.OS === "ios" ? "inline" : "default"}
                                            onChange={handleDateChange}
                                        />
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.submitBtnModern,
                                        { backgroundColor: accentColor },
                                    ]}
                                    onPress={handleSubmit}
                                >
                                    <Text style={styles.submitBtnTextModern}>Save Debt</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}
