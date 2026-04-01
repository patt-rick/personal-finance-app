import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Platform,
    StyleSheet,
} from "react-native";
import { X, Calendar } from "lucide-react-native";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";

interface DateRangePickerModalProps {
    visible: boolean;
    startDate: Date;
    endDate: Date;
    onApply: (start: Date, end: Date) => void;
    onClose: () => void;
}

export default function DateRangePickerModal({
    visible,
    startDate,
    endDate,
    onApply,
    onClose,
}: DateRangePickerModalProps) {
    const theme = useTheme();
    const dashStyles = useMemo(() => createDashboardStyles(theme), [theme]);

    const [localStart, setLocalStart] = useState(startDate);
    const [localEnd, setLocalEnd] = useState(endDate);
    const [showPicker, setShowPicker] = useState<"start" | "end" | null>(null);

    useEffect(() => {
        if (visible) {
            setLocalStart(startDate);
            setLocalEnd(endDate);
            setShowPicker(null);
        }
    }, [visible, startDate, endDate]);

    const handleDateChange = (
        event: DateTimePickerEvent,
        selectedDate?: Date,
    ) => {
        if (Platform.OS === "android") {
            setShowPicker(null);
        }

        if (event.type === "dismissed") return;
        if (!selectedDate) return;

        if (showPicker === "start") {
            setLocalStart(selectedDate);
            if (selectedDate > localEnd) {
                setLocalEnd(selectedDate);
            }
        } else if (showPicker === "end") {
            if (selectedDate < localStart) {
                setLocalEnd(localStart);
            } else {
                setLocalEnd(selectedDate);
            }
        }
    };

    const formatDate = (date: Date) =>
        date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    const handleApply = () => {
        const start = new Date(
            localStart.getFullYear(),
            localStart.getMonth(),
            localStart.getDate(),
        );
        const end = new Date(
            localEnd.getFullYear(),
            localEnd.getMonth(),
            localEnd.getDate(),
            23, 59, 59, 999,
        );
        onApply(start, end);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={dashStyles.modalOverlay}>
                <View style={dashStyles.modalContentModern}>
                    <View style={dashStyles.modalHeaderModern}>
                        <Text style={dashStyles.modalTitleModern}>
                            Select Date Range
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dateFieldsRow}>
                        <DateField
                            label="From"
                            date={localStart}
                            isActive={showPicker === "start"}
                            onPress={() =>
                                setShowPicker(
                                    showPicker === "start" ? null : "start",
                                )
                            }
                            formatDate={formatDate}
                            theme={theme}
                        />
                        <DateField
                            label="To"
                            date={localEnd}
                            isActive={showPicker === "end"}
                            onPress={() =>
                                setShowPicker(
                                    showPicker === "end" ? null : "end",
                                )
                            }
                            formatDate={formatDate}
                            theme={theme}
                        />
                    </View>

                    {showPicker && (
                        <DateTimePicker
                            value={
                                showPicker === "start" ? localStart : localEnd
                            }
                            mode="date"
                            display={
                                Platform.OS === "ios" ? "inline" : "default"
                            }
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                            themeVariant="dark"
                        />
                    )}

                    <TouchableOpacity
                        style={[
                            styles.applyBtn,
                            { backgroundColor: theme.colors.primary },
                        ]}
                        onPress={handleApply}
                    >
                        <Text style={[styles.applyBtnText, { color: theme.colors.textInverse }]}>Apply</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function DateField({
    label,
    date,
    isActive,
    onPress,
    formatDate,
    theme,
}: {
    label: string;
    date: Date;
    isActive: boolean;
    onPress: () => void;
    formatDate: (d: Date) => string;
    theme: any;
}) {
    return (
        <View style={styles.dateFieldContainer}>
            <Text
                style={[styles.dateFieldLabel, { color: theme.colors.textSecondary }]}
            >
                {label}
            </Text>
            <TouchableOpacity
                style={[
                    styles.dateFieldBtn,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: isActive
                            ? theme.colors.primary
                            : theme.colors.borderLight,
                    },
                ]}
                onPress={onPress}
            >
                <Calendar
                    size={16}
                    color={
                        isActive
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                    }
                />
                <Text
                    style={[
                        styles.dateFieldText,
                        {
                            color: isActive
                                ? theme.colors.primary
                                : theme.colors.text,
                        },
                    ]}
                >
                    {formatDate(date)}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    dateFieldsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    dateFieldContainer: {
        flex: 1,
    },
    dateFieldLabel: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    dateFieldBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    dateFieldText: {
        fontSize: 14,
        fontWeight: "600",
    },
    applyBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 16,
    },
    applyBtnText: {
        fontSize: 16,
        fontWeight: "700",
    },
});
