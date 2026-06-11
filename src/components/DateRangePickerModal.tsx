import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Calendar } from "lucide-react-native";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTheme } from "../theme/theme";
import AppModal from "./AppModal";

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
    const styles = useMemo(() => createStyles(theme), [theme]);

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

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
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
            23,
            59,
            59,
            999,
        );
        onApply(start, end);
    };

    return (
        <AppModal
            visible={visible}
            onClose={onClose}
            title="Select Date Range"
            showHandle={false}
        >
            <View style={styles.dateFieldsRow}>
                <DateField
                    label="From"
                    date={localStart}
                    isActive={showPicker === "start"}
                    onPress={() =>
                        setShowPicker(showPicker === "start" ? null : "start")
                    }
                    formatDate={formatDate}
                    theme={theme}
                    styles={styles}
                />
                <DateField
                    label="To"
                    date={localEnd}
                    isActive={showPicker === "end"}
                    onPress={() => setShowPicker(showPicker === "end" ? null : "end")}
                    formatDate={formatDate}
                    theme={theme}
                    styles={styles}
                />
            </View>

            {showPicker && (
                <DateTimePicker
                    value={showPicker === "start" ? localStart : localEnd}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    themeVariant="dark"
                />
            )}

            <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApply}
            >
                <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
        </AppModal>
    );
}

function DateField({
    label,
    date,
    isActive,
    onPress,
    formatDate,
    theme,
    styles,
}: {
    label: string;
    date: Date;
    isActive: boolean;
    onPress: () => void;
    formatDate: (d: Date) => string;
    theme: any;
    styles: ReturnType<typeof createStyles>;
}) {
    return (
        <View style={styles.dateFieldContainer}>
            <Text style={styles.dateFieldLabel}>{label}</Text>
            <TouchableOpacity style={styles.dateFieldBtn} onPress={onPress}>
                <Calendar
                    size={16}
                    color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                    style={[
                        styles.dateFieldText,
                        { color: isActive ? theme.colors.primary : theme.colors.onSurface },
                    ]}
                >
                    {formatDate(date)}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
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
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            color: theme.colors.onSurfaceVariant,
        },
        dateFieldBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        dateFieldText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
        },
        applyBtn: {
            height: 52,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 16,
            backgroundColor: theme.colors.primary,
        },
        applyBtnText: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.1,
            color: theme.colors.onPrimary,
        },
    });
