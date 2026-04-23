import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Check, Trash2, MessageSquare, Bell } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import { ReviewItem } from "../types";
import { getCurrencySymbol } from "../../../utils/_helpers";
import { ConfirmEdits } from "../hooks/useAutoLogQueue";

interface Props {
    item: ReviewItem;
    business: Business | undefined;
    onConfirm: (edits?: Partial<ConfirmEdits>) => void;
    onReject: () => void;
}

export default function ReviewItemCard({ item, business, onConfirm, onReject }: Props) {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const [amount, setAmount] = useState(item.draft.amount.toString());
    const [description, setDescription] = useState(item.draft.merchant ?? "");

    const symbol = getCurrencySymbol(business?.currency ?? item.draft.currencyCode ?? undefined);
    const SourceIcon = item.draft.source === "sms" ? MessageSquare : Bell;

    const handleConfirm = () => {
        const parsedAmount = parseFloat(amount);
        const edits: Partial<ConfirmEdits> = {};
        if (Number.isFinite(parsedAmount) && parsedAmount !== item.draft.amount) edits.amount = parsedAmount;
        if (description.trim() && description.trim() !== item.draft.merchant) edits.description = description.trim();
        onConfirm(Object.keys(edits).length ? edits : undefined);
    };

    const confidencePercent = Math.round(item.draft.confidence * 100);

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity style={styles.top} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
                <View style={[styles.sourceChip, { backgroundColor: theme.colors.incomeBg }]}>
                    <SourceIcon size={12} color={theme.colors.primary} />
                    <Text style={[styles.sourceChipText, { color: theme.colors.primary }]}>
                        {item.draft.senderDisplay}
                    </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={[styles.confidence, { color: theme.colors.textSecondary }]}>{confidencePercent}%</Text>
            </TouchableOpacity>

            <View style={styles.headRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.merchant, { color: theme.colors.text }]}>
                        {item.draft.merchant ?? "No merchant"}
                    </Text>
                    <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                        {item.draft.category} • {item.draft.type} • routes to {business?.name ?? "—"}
                    </Text>
                </View>
                <Text
                    style={[
                        styles.amount,
                        {
                            color: item.draft.type === "income" ? theme.colors.success : theme.colors.text,
                        },
                    ]}
                >
                    {symbol}{item.draft.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
            </View>

            {expanded ? (
                <View style={styles.editArea}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount</Text>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                    />
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Description</Text>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Merchant or counterparty"
                        placeholderTextColor={theme.colors.placeholder}
                    />
                    <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>Original message</Text>
                    <Text style={[styles.rawText, { color: theme.colors.textSecondary, backgroundColor: theme.colors.surface }]}>
                        {item.draft.rawText}
                    </Text>
                </View>
            ) : null}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.rejectBtn, { backgroundColor: theme.colors.surface }]}
                    onPress={onReject}
                >
                    <Trash2 size={14} color={theme.colors.error} />
                    <Text style={[styles.rejectText, { color: theme.colors.error }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleConfirm}
                >
                    <Check size={14} color={theme.colors.textInverse} />
                    <Text style={[styles.confirmText, { color: theme.colors.textInverse }]}>Confirm</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
    },
    top: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    sourceChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    sourceChipText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    confidence: {
        fontSize: 11,
        fontWeight: "700",
    },
    headRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    merchant: {
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    meta: {
        fontSize: 11,
        fontWeight: "500",
        marginTop: 2,
    },
    amount: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: -0.3,
    },
    editArea: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "transparent",
    },
    label: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    rawText: {
        padding: 10,
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 17,
    },
    actions: {
        flexDirection: "row",
        gap: 8,
        marginTop: 12,
    },
    rejectBtn: {
        flex: 1,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
    },
    rejectText: {
        fontSize: 13,
        fontWeight: "700",
    },
    confirmBtn: {
        flex: 1,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
    },
    confirmText: {
        fontSize: 13,
        fontWeight: "700",
    },
});
