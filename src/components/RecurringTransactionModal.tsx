import React, { useState, useEffect, useMemo } from "react";
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
import { RecurringTransaction, RecurrenceFrequency, Business, Category } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";

interface RecurringTransactionModalProps {
    visible: boolean;
    editingItem: RecurringTransaction | null;
    businesses: Business[];
    categories: Category[];
    onClose: () => void;
    onSubmit: (data: {
        amount: number;
        type: "income" | "expense";
        businessId: string;
        category: string;
        remark: string;
        frequency: RecurrenceFrequency;
        endDate?: string;
        editingId: string | null;
    }) => void;
}

const FREQUENCIES: { label: string; value: RecurrenceFrequency }[] = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Biweekly", value: "biweekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
];

export default function RecurringTransactionModal({
    visible,
    editingItem,
    businesses,
    categories,
    onClose,
    onSubmit,
}: RecurringTransactionModalProps) {
    const theme = useTheme();
    const styles = useMemo(() => createDashboardStyles(theme), [theme]);

    const [type, setType] = useState<"income" | "expense">("expense");
    const [amount, setAmount] = useState("");
    const [selectedBusiness, setSelectedBusiness] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
    const [remark, setRemark] = useState("");
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (editingItem) {
            setType(editingItem.type);
            setAmount(editingItem.amount.toString());
            setSelectedBusiness(editingItem.businessId);
            setSelectedCategory(editingItem.category || "");
            setFrequency(editingItem.frequency);
            setRemark(editingItem.remark || "");
            setEndDate(editingItem.endDate ? new Date(editingItem.endDate) : null);
            setShowDatePicker(false);
        } else {
            setType("expense");
            setAmount("");
            setSelectedBusiness(businesses[0]?.id || "");
            setSelectedCategory("");
            setFrequency("monthly");
            setRemark("");
            setEndDate(null);
            setShowDatePicker(false);
        }
    }, [editingItem, visible, businesses]);

    const filteredCategories = useMemo(
        () => categories.filter((c) => c.type === type),
        [categories, type]
    );

    const formatEndDate = (date: Date) =>
        date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }
        if (event.type === "dismissed") return;
        if (selectedDate) {
            setEndDate(selectedDate);
        }
    };

    const handleSubmit = () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }
        if (!selectedBusiness) {
            Alert.alert("Error", "Please select a business");
            return;
        }

        onSubmit({
            amount: parseFloat(amount),
            type,
            businessId: selectedBusiness,
            category: selectedCategory,
            remark,
            frequency,
            endDate: endDate ? endDate.toISOString().split("T")[0] : undefined,
            editingId: editingItem?.id ?? null,
        });

        setAmount("");
        setRemark("");
        setEndDate(null);
        setShowDatePicker(false);
    };

    const handleClose = () => {
        setAmount("");
        setRemark("");
        setEndDate(null);
        setShowDatePicker(false);
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
                        <ScrollView
                            style={{ maxHeight: "90%" }}
                            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.modalContentModern}>
                                <View style={styles.modalHeaderModern}>
                                    <Text style={styles.modalTitleModern}>
                                        {editingItem ? "Edit Recurring" : "New Recurring"}
                                    </Text>
                                    <TouchableOpacity onPress={handleClose}>
                                        <X size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.inputLabelModern}>Type</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.categoryPicker}
                                >
                                    {(["income", "expense"] as const).map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[
                                                styles.categoryChip,
                                                type === t && {
                                                    backgroundColor:
                                                        t === "income"
                                                            ? theme.colors.income
                                                            : theme.colors.expense,
                                                    borderColor:
                                                        t === "income"
                                                            ? theme.colors.income
                                                            : theme.colors.expense,
                                                },
                                            ]}
                                            onPress={() => setType(t)}
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryChipText,
                                                    type === t && styles.categoryChipTextActive,
                                                ]}
                                            >
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.inputLabelModern}>Amount</Text>
                                <TextInput
                                    style={styles.modalInputLargeModern}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.placeholder}
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                />

                                {businesses.length > 1 && (
                                    <>
                                        <Text style={styles.inputLabelModern}>Business</Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.categoryPicker}
                                        >
                                            {businesses.map((biz) => (
                                                <TouchableOpacity
                                                    key={biz.id}
                                                    style={[
                                                        styles.categoryChip,
                                                        selectedBusiness === biz.id &&
                                                            styles.categoryChipActive,
                                                    ]}
                                                    onPress={() => setSelectedBusiness(biz.id)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.categoryChipText,
                                                            selectedBusiness === biz.id &&
                                                                styles.categoryChipTextActive,
                                                        ]}
                                                    >
                                                        {biz.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </>
                                )}

                                <Text style={styles.inputLabelModern}>Category</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.categoryPicker}
                                >
                                    {filteredCategories.map((cat) => (
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
                                </ScrollView>

                                <Text style={styles.inputLabelModern}>Frequency</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.categoryPicker}
                                >
                                    {FREQUENCIES.map((f) => (
                                        <TouchableOpacity
                                            key={f.value}
                                            style={[
                                                styles.categoryChip,
                                                frequency === f.value &&
                                                    styles.categoryChipActive,
                                            ]}
                                            onPress={() => setFrequency(f.value)}
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryChipText,
                                                    frequency === f.value &&
                                                        styles.categoryChipTextActive,
                                                ]}
                                            >
                                                {f.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.inputLabelModern}>Remark</Text>
                                <TextInput
                                    style={styles.modalInputModern}
                                    placeholder="What is this for?"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={remark}
                                    onChangeText={setRemark}
                                />

                                <Text style={styles.inputLabelModern}>End Date (Optional)</Text>
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
                                                color={endDate ? theme.colors.primary : theme.colors.textSecondary}
                                            />
                                            <Text style={{
                                                fontSize: 14,
                                                color: endDate ? theme.colors.text : theme.colors.placeholder,
                                                fontWeight: endDate ? "600" : "400",
                                            }}>
                                                {endDate ? formatEndDate(endDate) : "No end date"}
                                            </Text>
                                        </TouchableOpacity>
                                        {endDate && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEndDate(null);
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
                                            value={endDate || new Date()}
                                            mode="date"
                                            display={Platform.OS === "ios" ? "inline" : "default"}
                                            onChange={handleDateChange}
                                            minimumDate={new Date()}
                                        />
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.submitBtnModern,
                                        {
                                            backgroundColor:
                                                type === "income"
                                                    ? theme.colors.income
                                                    : theme.colors.expense,
                                        },
                                    ]}
                                    onPress={handleSubmit}
                                >
                                    <Text style={styles.submitBtnTextModern}>
                                        {editingItem ? "Update" : "Create"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}
