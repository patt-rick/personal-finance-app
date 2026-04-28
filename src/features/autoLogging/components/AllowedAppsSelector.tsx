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
                    placeholderTextColor={theme.colors.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleAdd}
                    returnKeyType="done"
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                    <Plus size={18} color={theme.colors.textInverse} />
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
                                <X size={14} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        </AppModal>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        inputRow: {
            flexDirection: "row",
            gap: 8,
            marginBottom: 16,
        },
        input: {
            flex: 1,
            height: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.borderLight,
            paddingHorizontal: 14,
            fontSize: 15,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
        },
        addBtn: {
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        list: {
            maxHeight: 320,
        },
        empty: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            fontStyle: "italic",
            textAlign: "center",
            paddingVertical: 24,
        },
        chip: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            marginBottom: 8,
        },
        chipText: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.text,
            flex: 1,
        },
    });
