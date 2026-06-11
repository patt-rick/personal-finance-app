import React, { useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Check, Trash2 } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import { SenderMapping } from "../types";
import AppModal from "../../../components/AppModal";

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
        <AppModal visible={visible} onClose={onClose} title="Edit Sender" scrollable>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. MTN MoMo"
                placeholderTextColor={theme.colors.onSurfaceVariant}
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
                    theme={theme}
                />
                {businesses.map((b) => (
                    <BusinessOption
                        key={b.id}
                        label={b.name}
                        sub={b.currency}
                        selected={businessId === b.id}
                        onPress={() => setBusinessId(b.id)}
                        styles={styles}
                        theme={theme}
                    />
                ))}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                    <Trash2 size={16} color={theme.colors.error} />
                    <Text style={[styles.deleteText, { color: theme.colors.error }]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Check size={16} color={theme.colors.onPrimary} />
                    <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
            </View>
        </AppModal>
    );
}

function BusinessOption({
    label,
    sub,
    selected,
    onPress,
    styles,
    theme,
}: {
    label: string;
    sub?: string;
    selected: boolean;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
    theme: ReturnType<typeof useTheme>;
}) {
    return (
        <TouchableOpacity style={[styles.bizOption, selected && styles.bizOptionSelected]} onPress={onPress}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.bizOptionLabel, selected && styles.bizOptionLabelSelected]}>{label}</Text>
                {sub ? (
                    <Text style={[styles.bizOptionSub, selected && styles.bizOptionSubSelected]}>{sub}</Text>
                ) : null}
            </View>
            {selected ? <Check size={18} color={theme.colors.inverseOnSurface} /> : null}
        </TouchableOpacity>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        fieldLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            color: theme.colors.onSurfaceVariant,
        },
        input: {
            height: 52,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 14,
            fontSize: 15,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurface,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        senderKeyPill: {
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderRadius: theme.shape.medium,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        senderKeyLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: theme.colors.onSurfaceVariant,
        },
        senderKeyValue: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        businessList: { gap: 8 },
        bizOption: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: theme.shape.full,
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
        },
        bizOptionSelected: {
            borderColor: theme.colors.inverseSurface,
            backgroundColor: theme.colors.inverseSurface,
        },
        bizOptionLabel: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
        },
        bizOptionLabelSelected: {
            fontFamily: theme.fonts.semibold,
            color: theme.colors.inverseOnSurface,
        },
        bizOptionSub: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        bizOptionSubSelected: {
            color: theme.colors.inverseOnSurface,
            opacity: 0.7,
        },
        actions: {
            flexDirection: "row",
            gap: 10,
            marginTop: 24,
        },
        deleteBtn: {
            flex: 1,
            height: 52,
            borderRadius: theme.shape.full,
            borderWidth: 1,
            borderColor: theme.colors.error,
            backgroundColor: "transparent",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
        deleteText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
        },
        saveBtn: {
            flex: 1,
            height: 52,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
        saveText: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimary,
        },
    });
