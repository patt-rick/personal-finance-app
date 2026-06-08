import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    Platform,
} from "react-native";
import { X, Calendar } from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { RecurringTransaction, RecurrenceFrequency, Business, Category } from "../types";
import { useTheme } from "../theme/theme";
import AppModal from "./AppModal";

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
        startDate?: string;
        endDate?: string;
        editingId: string | null;
    }) => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getNextDayOfWeek(dayIndex: number): string {
    const today = new Date();
    const todayDay = today.getDay();
    let diff = dayIndex - todayDay;
    if (diff < 0) diff += 7;
    const target = new Date(today);
    target.setDate(target.getDate() + diff);
    return target.toISOString().split("T")[0];
}

function getNextDayOfMonth(day: number): string {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let targetMonth = currentDay <= day ? currentMonth : currentMonth + 1;
    let targetYear = currentYear;
    if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
    }

    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(day, lastDayOfMonth);
    const target = new Date(targetYear, targetMonth, clampedDay);
    return target.toISOString().split("T")[0];
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
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [type, setType] = useState<"income" | "expense">("expense");
    const [amount, setAmount] = useState("");
    const [selectedBusiness, setSelectedBusiness] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
    const [remark, setRemark] = useState("");
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
    const [selectedDayOfMonth, setSelectedDayOfMonth] = useState<number | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
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
            const sd = new Date(editingItem.startDate);
            if (editingItem.frequency === "weekly" || editingItem.frequency === "biweekly") {
                setSelectedDayOfWeek(sd.getDay());
                setSelectedDayOfMonth(null);
                setStartDate(null);
            } else if (editingItem.frequency === "monthly") {
                setSelectedDayOfMonth(sd.getDate());
                setSelectedDayOfWeek(null);
                setStartDate(null);
            } else {
                setStartDate(sd);
                setSelectedDayOfWeek(null);
                setSelectedDayOfMonth(null);
            }
            setShowStartDatePicker(false);
        } else {
            setType("expense");
            setAmount("");
            setSelectedBusiness(businesses[0]?.id || "");
            setSelectedCategory("");
            setFrequency("monthly");
            setRemark("");
            setEndDate(null);
            setShowDatePicker(false);
            setSelectedDayOfWeek(null);
            setSelectedDayOfMonth(null);
            setStartDate(null);
            setShowStartDatePicker(false);
        }
    }, [editingItem, visible, businesses]);

    const filteredCategories = useMemo(
        () => categories.filter((c) => c.type === type),
        [categories, type],
    );

    const formatEndDate = (date: Date) =>
        date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setShowStartDatePicker(false);
        }
        if (event.type === "dismissed") return;
        if (selectedDate) {
            setStartDate(selectedDate);
        }
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }
        if (event.type === "dismissed") return;
        if (selectedDate) {
            setEndDate(selectedDate);
        }
    };

    const resolvedStartDate = useMemo((): string | undefined => {
        if (frequency === "weekly" || frequency === "biweekly") {
            return selectedDayOfWeek !== null ? getNextDayOfWeek(selectedDayOfWeek) : undefined;
        }
        if (frequency === "monthly") {
            return selectedDayOfMonth !== null ? getNextDayOfMonth(selectedDayOfMonth) : undefined;
        }
        return startDate ? startDate.toISOString().split("T")[0] : undefined;
    }, [frequency, selectedDayOfWeek, selectedDayOfMonth, startDate]);

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
            startDate: resolvedStartDate,
            endDate: endDate ? endDate.toISOString().split("T")[0] : undefined,
            editingId: editingItem?.id ?? null,
        });

        setAmount("");
        setRemark("");
        setEndDate(null);
        setShowDatePicker(false);
        setSelectedDayOfWeek(null);
        setSelectedDayOfMonth(null);
        setStartDate(null);
        setShowStartDatePicker(false);
    };

    const handleClose = () => {
        setAmount("");
        setRemark("");
        setEndDate(null);
        setShowDatePicker(false);
        setSelectedDayOfWeek(null);
        setSelectedDayOfMonth(null);
        setStartDate(null);
        setShowStartDatePicker(false);
        onClose();
    };

    const typeIsIncome = type === "income";

    return (
        <AppModal
            visible={visible}
            onClose={handleClose}
            title={editingItem ? "Edit Recurring" : "New Recurring"}
            showHandle={false}
            scrollable
        >
            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
            >
                {(["income", "expense"] as const).map((t) => {
                    const isActive = type === t;
                    const activeBg = t === "income" ? theme.colors.incomeContainer : theme.colors.expenseContainer;
                    const activeColor = t === "income" ? theme.colors.onIncomeContainer : theme.colors.onExpenseContainer;
                    return (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.chip,
                                isActive && { backgroundColor: activeBg, borderColor: activeBg },
                            ]}
                            onPress={() => setType(t)}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    isActive && { color: activeColor, fontWeight: "700" },
                                ]}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Amount</Text>
            <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
            />

            {businesses.length > 1 && (
                <>
                    <Text style={styles.fieldLabel}>Business</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipRow}
                    >
                        {businesses.map((biz) => {
                            const isActive = selectedBusiness === biz.id;
                            return (
                                <TouchableOpacity
                                    key={biz.id}
                                    style={[
                                        styles.chip,
                                        isActive && styles.chipActive,
                                    ]}
                                    onPress={() => setSelectedBusiness(biz.id)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            isActive && styles.chipTextActive,
                                        ]}
                                    >
                                        {biz.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </>
            )}

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
            >
                {filteredCategories.map((cat) => {
                    const isActive = selectedCategory === cat.name;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.chip,
                                isActive && styles.chipActive,
                            ]}
                            onPress={() => setSelectedCategory(cat.name)}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    isActive && styles.chipTextActive,
                                ]}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Frequency</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
            >
                {FREQUENCIES.map((f) => {
                    const isActive = frequency === f.value;
                    return (
                        <TouchableOpacity
                            key={f.value}
                            style={[
                                styles.chip,
                                isActive && styles.chipActive,
                            ]}
                            onPress={() => {
                                setFrequency(f.value);
                                setSelectedDayOfWeek(null);
                                setSelectedDayOfMonth(null);
                                setStartDate(null);
                                setShowStartDatePicker(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    isActive && styles.chipTextActive,
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <Text style={styles.fieldLabel}>
                Starts On{" "}
                <Text style={styles.fieldLabelOptional}>(Optional)</Text>
            </Text>
            {(frequency === "weekly" || frequency === "biweekly") && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                >
                    {DAY_LABELS.map((label, index) => {
                        const isActive = selectedDayOfWeek === index;
                        return (
                            <TouchableOpacity
                                key={label}
                                style={[
                                    styles.chip,
                                    isActive && styles.chipActive,
                                ]}
                                onPress={() =>
                                    setSelectedDayOfWeek(
                                        selectedDayOfWeek === index ? null : index,
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        isActive && styles.chipTextActive,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
            {frequency === "monthly" && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                        const isActive = selectedDayOfMonth === day;
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.chip,
                                    styles.chipDay,
                                    isActive && styles.chipActive,
                                ]}
                                onPress={() =>
                                    setSelectedDayOfMonth(
                                        selectedDayOfMonth === day ? null : day,
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        isActive && styles.chipTextActive,
                                    ]}
                                >
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
            {(frequency === "daily" || frequency === "yearly") && (
                <View style={styles.datePickerRow}>
                    <TouchableOpacity
                        style={[
                            styles.datePickerBtn,
                            showStartDatePicker && styles.datePickerBtnActive,
                        ]}
                        onPress={() => setShowStartDatePicker(!showStartDatePicker)}
                    >
                        <Calendar
                            size={16}
                            color={startDate ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                        <Text
                            style={[
                                styles.datePickerText,
                                startDate && styles.datePickerTextSelected,
                            ]}
                        >
                            {startDate ? formatEndDate(startDate) : "Starts today"}
                        </Text>
                    </TouchableOpacity>
                    {startDate && (
                        <TouchableOpacity
                            onPress={() => {
                                setStartDate(null);
                                setShowStartDatePicker(false);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <X size={20} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                    )}
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate || new Date()}
                            mode="date"
                            display={Platform.OS === "ios" ? "inline" : "default"}
                            onChange={handleStartDateChange}
                            minimumDate={new Date()}
                        />
                    )}
                </View>
            )}

            <Text style={styles.fieldLabel}>Remark</Text>
            <TextInput
                style={styles.textInput}
                placeholder="What is this for?"
                placeholderTextColor={theme.colors.placeholder}
                value={remark}
                onChangeText={setRemark}
            />

            <Text style={styles.fieldLabel}>End Date (Optional)</Text>
            <View style={styles.datePickerRow}>
                <TouchableOpacity
                    style={[
                        styles.datePickerBtn,
                        showDatePicker && styles.datePickerBtnActive,
                    ]}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                >
                    <Calendar
                        size={16}
                        color={endDate ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text
                        style={[
                            styles.datePickerText,
                            endDate && styles.datePickerTextSelected,
                        ]}
                    >
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
                        <X size={20} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                )}
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
                    styles.submitBtn,
                    {
                        backgroundColor: typeIsIncome
                            ? theme.colors.incomeContainer
                            : theme.colors.expenseContainer,
                    },
                ]}
                onPress={handleSubmit}
            >
                <Text
                    style={[
                        styles.submitBtnText,
                        {
                            color: typeIsIncome
                                ? theme.colors.onIncomeContainer
                                : theme.colors.onExpenseContainer,
                        },
                    ]}
                >
                    {editingItem ? "Update" : "Create"}
                </Text>
            </TouchableOpacity>
        </AppModal>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        fieldLabel: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 8,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        fieldLabelOptional: {
            fontWeight: "400",
            color: theme.colors.onSurfaceVariant,
            textTransform: "none",
        },
        chipRow: {
            flexDirection: "row",
            marginBottom: 24,
        },
        chip: {
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: theme.shape.small,
            backgroundColor: "transparent",
            marginRight: 8,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
        },
        chipDay: {
            minWidth: 40,
            paddingHorizontal: 8,
            alignItems: "center",
        },
        chipActive: {
            backgroundColor: theme.colors.secondaryContainer,
            borderColor: theme.colors.secondaryContainer,
        },
        chipText: {
            fontSize: 13,
            color: theme.colors.onSurfaceVariant,
            fontWeight: "500",
        },
        chipTextActive: {
            color: theme.colors.onSecondaryContainer,
            fontWeight: "600",
        },
        amountInput: {
            fontSize: 38,
            fontWeight: "800",
            color: theme.colors.onSurface,
            borderBottomWidth: 2,
            borderBottomColor: theme.colors.outline,
            paddingVertical: 8,
            marginBottom: 24,
        },
        textInput: {
            height: 52,
            borderRadius: theme.shape.medium,
            borderWidth: 1,
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surfaceContainerHighest,
            paddingHorizontal: 16,
            fontSize: 14,
            color: theme.colors.onSurface,
            marginBottom: 24,
        },
        datePickerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
        },
        datePickerBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            height: 52,
            borderRadius: theme.shape.medium,
            borderWidth: 1,
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surfaceContainerHighest,
            paddingHorizontal: 16,
        },
        datePickerBtnActive: {
            borderColor: theme.colors.primary,
        },
        datePickerText: {
            fontSize: 14,
            color: theme.colors.placeholder,
            fontWeight: "400",
        },
        datePickerTextSelected: {
            color: theme.colors.onSurface,
            fontWeight: "600",
        },
        submitBtn: {
            height: 56,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 4,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        submitBtnText: {
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.3,
        },
    });
