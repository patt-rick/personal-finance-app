import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    StyleSheet,
} from "react-native";
import { X, Calendar } from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Debt } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { getCurrencySymbol } from "../utils/_helpers";
import AppModal from "./AppModal";

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

const CURRENCIES = ["USD", "GHS", "EUR", "GBP", "NGN"] as const;

export default function DebtEntryModal({
    visible,
    editingDebt,
    onClose,
    onSubmit,
}: DebtEntryModalProps) {
    const theme = useTheme();
    const dashStyles = React.useMemo(() => createDashboardStyles(theme), [theme]);
    const styles = React.useMemo(() => createStyles(theme), [theme]);

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

    return (
        <AppModal
            visible={visible}
            onClose={handleClose}
            title={editingDebt ? "Edit Debt" : "New Debt"}
            showHandle={false}
            scrollable
        >
            <Text style={dashStyles.inputLabelModern}>Person Name</Text>
            <TextInput
                style={dashStyles.modalInputModern}
                placeholder="Who is this debt with?"
                placeholderTextColor={theme.colors.placeholder}
                value={personName}
                onChangeText={setPersonName}
                autoFocus
            />

            <Text style={dashStyles.inputLabelModern}>
                Amount ({getCurrencySymbol(currency)})
            </Text>
            <TextInput
                style={dashStyles.modalInputLargeModern}
                placeholder="0.00"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
            />

            <Text style={dashStyles.inputLabelModern}>Type</Text>
            <View style={styles.typeRow}>
                <TouchableOpacity
                    style={[
                        styles.typeBtn,
                        isOwedToMe
                            ? styles.typeBtnActiveIncome
                            : styles.typeBtnInactive,
                    ]}
                    onPress={() => setType("owed_to_me")}
                >
                    <Text
                        style={[
                            styles.typeBtnText,
                            isOwedToMe ? styles.typeBtnTextActive : null,
                            { color: isOwedToMe ? theme.colors.onIncomeContainer : theme.colors.onSurfaceVariant },
                        ]}
                    >
                        Owed to Me
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.typeBtn,
                        !isOwedToMe
                            ? styles.typeBtnActiveExpense
                            : styles.typeBtnInactive,
                    ]}
                    onPress={() => setType("i_owe")}
                >
                    <Text
                        style={[
                            styles.typeBtnText,
                            !isOwedToMe ? styles.typeBtnTextActive : null,
                            { color: !isOwedToMe ? theme.colors.onGoldContainer : theme.colors.onSurfaceVariant },
                        ]}
                    >
                        I Owe
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={dashStyles.inputLabelModern}>Currency</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={dashStyles.categoryPicker}
            >
                {CURRENCIES.map((c) => (
                    <TouchableOpacity
                        key={c}
                        style={[
                            dashStyles.categoryChip,
                            currency === c && dashStyles.categoryChipActive,
                        ]}
                        onPress={() => setCurrency(c)}
                    >
                        <Text
                            style={[
                                dashStyles.categoryChipText,
                                currency === c && dashStyles.categoryChipTextActive,
                            ]}
                        >
                            {getCurrencySymbol(c)} {c}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={dashStyles.inputLabelModern}>Description (Optional)</Text>
            <TextInput
                style={dashStyles.modalInputModern}
                placeholder="What is this debt for?"
                placeholderTextColor={theme.colors.placeholder}
                value={description}
                onChangeText={setDescription}
            />

            <Text style={dashStyles.inputLabelModern}>Due Date (Optional)</Text>
            <View style={styles.dateFieldWrap}>
                <View style={styles.dateRow}>
                    <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => setShowDatePicker(!showDatePicker)}
                    >
                        <Calendar
                            size={16}
                            color={dueDate ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                        <Text
                            style={[
                                styles.dateBtnText,
                                { color: dueDate ? theme.colors.onSurface : theme.colors.placeholder },
                            ]}
                        >
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
                            <X size={20} color={theme.colors.onSurfaceVariant} />
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
                style={[dashStyles.submitBtnModern, { backgroundColor: theme.colors.primary }]}
                onPress={handleSubmit}
            >
                <Text style={dashStyles.submitBtnTextModern}>Save Debt</Text>
            </TouchableOpacity>
        </AppModal>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        typeRow: {
            flexDirection: "row",
            gap: 10,
            marginBottom: 24,
        },
        typeBtn: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: theme.shape.full,
            alignItems: "center",
            borderWidth: 1,
        },
        typeBtnInactive: {
            backgroundColor: "transparent",
            borderColor: theme.colors.outlineVariant,
        },
        typeBtnActiveIncome: {
            backgroundColor: theme.colors.incomeContainer,
            borderColor: theme.colors.incomeContainer,
        },
        typeBtnActiveExpense: {
            backgroundColor: theme.colors.goldContainer,
            borderColor: theme.colors.goldContainer,
        },
        typeBtnText: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
        },
        typeBtnTextActive: {
            fontFamily: theme.fonts.semibold,
        },
        dateFieldWrap: {
            marginBottom: 24,
        },
        dateRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        dateBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            height: 52,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerHigh,
            paddingHorizontal: 16,
        },
        dateBtnText: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
        },
    });
