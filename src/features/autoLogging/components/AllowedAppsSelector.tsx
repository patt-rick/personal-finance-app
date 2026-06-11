import React, { useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Plus, X } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import AppModal from "../../../components/AppModal";

interface Props {
    visible: boolean;
    title: string;
    placeholder: string;
    values: string[];
    onClose: () => void;
    onChange: (values: string[]) => void;
}

export default function AllowedAppsSelector({
    visible,
    title,
    placeholder,
    values,
    onClose,
    onChange,
}: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [draft, setDraft] = useState("");

    const handleAdd = () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        if (values.includes(trimmed)) {
            setDraft("");
            return;
        }
        onChange([...values, trimmed]);
        setDraft("");
    };

    const handleRemove = (value: string) => {
        onChange(values.filter((v) => v !== value));
    };

    return (
        <AppModal visible={visible} onClose={onClose} title={title}>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleAdd}
                    returnKeyType="done"
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                    <Plus size={18} color={theme.colors.onPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {values.length === 0 ? (
                    <Text style={styles.empty}>Nothing added yet.</Text>
                ) : (
                    values.map((value) => (
                        <View key={value} style={styles.chip}>
                            <Text style={styles.chipText}>{value}</Text>
                            <TouchableOpacity onPress={() => handleRemove(value)} hitSlop={8}>
                                <X size={14} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        </AppModal>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        inputRow: {
            flexDirection: "row",
            gap: 8,
            marginBottom: 16,
        },
        input: {
            flex: 1,
            height: 52,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 14,
            fontSize: 15,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurface,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        addBtn: {
            width: 52,
            height: 52,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        list: {
            maxHeight: 320,
        },
        empty: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            paddingVertical: 24,
        },
        chip: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: theme.colors.card,
            marginBottom: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
        },
        chipText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            flex: 1,
        },
    });
