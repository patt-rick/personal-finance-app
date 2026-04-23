import React, { useEffect, useMemo, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { Check, Trash2, X } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import { SenderMapping } from "../types";

interface Props {
    visible: boolean;
    mapping: SenderMapping | null;
    businesses: Business[];
    onClose: () => void;
    onSave: (patch: { displayName: string; businessId: string | null }) => void;
    onDelete: () => void;
}

export default function SenderMappingEditor({
    visible,
    mapping,
    businesses,
    onClose,
    onSave,
    onDelete,
}: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [displayName, setDisplayName] = useState("");
    const [businessId, setBusinessId] = useState<string | null>(null);

    useEffect(() => {
        if (mapping) {
            setDisplayName(mapping.displayName);
            setBusinessId(mapping.businessId);
        }
    }, [mapping]);

    if (!mapping) return null;

    const handleSave = () => {
        const trimmed = displayName.trim();
        if (!trimmed) return;
        onSave({ displayName: trimmed, businessId });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={{ flex: 1 }} />
                </TouchableWithoutFeedback>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={styles.sheet}>
                        <View style={styles.handle}>
                            <View style={styles.handleBar} />
                        </View>

                        <View style={styles.header}>
                            <Text style={styles.title}>Edit Sender</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={12}>
                                <X size={22} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.fieldLabel}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="e.g. MTN MoMo"
                                placeholderTextColor={theme.colors.placeholder}
                            />

                            <View style={styles.senderKeyPill}>
                                <Text style={styles.senderKeyLabel}>Sender key</Text>
                                <Text style={styles.senderKeyValue}>{mapping.senderKey}</Text>
                            </View>

                            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Route To Cashbook</Text>
                            <View style={styles.businessList}>
                                <BusinessOption
                                    label="Unassigned — auto-create per message"
                                    selected={businessId === null}
                                    onPress={() => setBusinessId(null)}
                                    styles={styles}
                                />
                                {businesses.map((b) => (
                                    <BusinessOption
                                        key={b.id}
                                        label={b.name}
                                        sub={b.currency}
                                        selected={businessId === b.id}
                                        onPress={() => setBusinessId(b.id)}
                                        styles={styles}
                                    />
                                ))}
                            </View>

                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                                    <Trash2 size={16} color={theme.colors.error} />
                                    <Text style={[styles.deleteText, { color: theme.colors.error }]}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                    <Check size={16} color={theme.colors.textInverse} />
                                    <Text style={styles.saveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

function BusinessOption({
    label,
    sub,
    selected,
    onPress,
    styles,
}: {
    label: string;
    sub?: string;
    selected: boolean;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
}) {
    return (
        <TouchableOpacity style={[styles.bizOption, selected && styles.bizOptionSelected]} onPress={onPress}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.bizOptionLabel, selected && styles.bizOptionLabelSelected]}>{label}</Text>
                {sub ? <Text style={styles.bizOptionSub}>{sub}</Text> : null}
            </View>
            {selected ? <Check size={18} color={styles.checkColor.color} /> : null}
        </TouchableOpacity>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
        sheet: {
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingBottom: 32,
            maxHeight: "85%",
        },
        handle: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
        handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.border },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
        },
        title: {
            fontSize: 20,
            fontWeight: "800",
            letterSpacing: -0.3,
            color: theme.colors.text,
        },
        fieldLabel: {
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            color: theme.colors.textSecondary,
        },
        input: {
            height: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.borderLight,
            paddingHorizontal: 14,
            fontSize: 15,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
        },
        senderKeyPill: {
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        senderKeyLabel: {
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: theme.colors.textSecondary,
        },
        senderKeyValue: {
            fontSize: 13,
            fontWeight: "700",
            color: theme.colors.primary,
        },
        businessList: { gap: 8 },
        bizOption: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            borderWidth: 1.5,
            borderColor: "transparent",
        },
        bizOptionSelected: {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.incomeBg,
        },
        bizOptionLabel: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.text,
        },
        bizOptionLabelSelected: {
            color: theme.colors.primary,
        },
        bizOptionSub: {
            fontSize: 11,
            fontWeight: "500",
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        actions: {
            flexDirection: "row",
            gap: 10,
            marginTop: 24,
        },
        deleteBtn: {
            flex: 1,
            height: 48,
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
        deleteText: {
            fontSize: 14,
            fontWeight: "700",
        },
        saveBtn: {
            flex: 1,
            height: 48,
            borderRadius: 14,
            backgroundColor: theme.colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
        saveText: {
            fontSize: 14,
            fontWeight: "700",
            color: theme.colors.textInverse,
        },
        checkColor: { color: theme.colors.primary },
    });
