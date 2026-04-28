import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
} from "react-native";
import { X, Calendar } from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { RecurringTransaction, RecurrenceFrequency, Business, Category } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
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
    const styles = useMemo(() => createDashboardStyles(theme), [theme]);

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

    return (
        <AppModal
            visible={visible}
            onClose={handleClose}
            title={editingItem ? "Edit Recurring" : "New Recurring"}
            showHandle={false}
            scrollable
        >
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
                                                frequency === f.value && styles.categoryChipActive,
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

                                <Text style={styles.inputLabelModern}>
                                    Starts On{" "}
                                    <Text
                                        style={{
                                            fontWeight: "400",
                                            color: theme.colors.textSecondary,
                                        }}
                                    >
                                        (Optional)
                                    </Text>
                                </Text>
                                {(frequency === "weekly" || frequency === "biweekly") && (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.categoryPicker}
                                    >
                                        {DAY_LABELS.map((label, index) => (
                                            <TouchableOpacity
                                                key={label}
                                                style={[
                                                    styles.categoryChip,
                                                    selectedDayOfWeek === index &&
                                                        styles.categoryChipActive,
                                                ]}
                                                onPress={() =>
                                                    setSelectedDayOfWeek(
                                                        selectedDayOfWeek === index ? null : index,
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryChipText,
                                                        selectedDayOfWeek === index &&
                                                            styles.categoryChipTextActive,
                                                    ]}
                                                >
                                                    {label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                                {frequency === "monthly" && (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.categoryPicker}
                                    >
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                            <TouchableOpacity
                                                key={day}
                                                style={[
                                                    styles.categoryChip,
                                                    { minWidth: 40, paddingHorizontal: 8 },
                                                    selectedDayOfMonth === day &&
                                                        styles.categoryChipActive,
                                                ]}
                                                onPress={() =>
                                                    setSelectedDayOfMonth(
                                                        selectedDayOfMonth === day ? null : day,
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryChipText,
                                                        selectedDayOfMonth === day &&
                                                            styles.categoryChipTextActive,
                                                    ]}
                                                >
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                                {(frequency === "daily" || frequency === "yearly") && (
                                    <View style={{ marginBottom: 8 }}>
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <TouchableOpacity
                                                style={{
                                                    flex: 1,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    height: 48,
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: showStartDatePicker
                                                        ? theme.colors.primary
                                                        : theme.colors.border,
                                                    backgroundColor: theme.colors.background,
                                                    paddingHorizontal: 16,
                                                }}
                                                onPress={() =>
                                                    setShowStartDatePicker(!showStartDatePicker)
                                                }
                                            >
                                                <Calendar
                                                    size={16}
                                                    color={
                                                        startDate
                                                            ? theme.colors.primary
                                                            : theme.colors.textSecondary
                                                    }
                                                />
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        color: startDate
                                                            ? theme.colors.text
                                                            : theme.colors.placeholder,
                                                        fontWeight: startDate ? "600" : "400",
                                                    }}
                                                >
                                                    {startDate
                                                        ? formatEndDate(startDate)
                                                        : "Starts today"}
                                                </Text>
                                            </TouchableOpacity>
                                            {startDate && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setStartDate(null);
                                                        setShowStartDatePicker(false);
                                                    }}
                                                    hitSlop={{
                                                        top: 8,
                                                        bottom: 8,
                                                        left: 8,
                                                        right: 8,
                                                    }}
                                                >
                                                    <X
                                                        size={20}
                                                        color={theme.colors.textSecondary}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        {showStartDatePicker && (
                                            <DateTimePicker
                                                value={startDate || new Date()}
                                                mode="date"
                                                display={
                                                    Platform.OS === "ios" ? "inline" : "default"
                                                }
                                                onChange={handleStartDateChange}
                                                minimumDate={new Date()}
                                            />
                                        )}
                                    </View>
                                )}

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
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 10,
                                                height: 48,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: showDatePicker
                                                    ? theme.colors.primary
                                                    : theme.colors.border,
                                                backgroundColor: theme.colors.background,
                                                paddingHorizontal: 16,
                                            }}
                                            onPress={() => setShowDatePicker(!showDatePicker)}
                                        >
                                            <Calendar
                                                size={16}
                                                color={
                                                    endDate
                                                        ? theme.colors.primary
                                                        : theme.colors.textSecondary
                                                }
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    color: endDate
                                                        ? theme.colors.text
                                                        : theme.colors.placeholder,
                                                    fontWeight: endDate ? "600" : "400",
                                                }}
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
        </AppModal>
    );
}
