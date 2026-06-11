import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Check, Trash2, MessageSquare, Bell } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import MoneyText from "../../../components/MoneyText";
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
    const styles = useMemo(() => createStyles(theme), [theme]);
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
        <View style={styles.card}>
            <TouchableOpacity style={styles.top} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
                <View style={styles.sourceChip}>
                    <SourceIcon size={12} color={theme.colors.onPrimaryContainer} />
                    <Text style={styles.sourceChipText}>
                        {item.draft.senderDisplay}
                    </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text
                    style={[
                        styles.confidence,
                        confidencePercent < 70 && { color: theme.colors.gold },
                    ]}
                >
                    {confidencePercent}%
                </Text>
            </TouchableOpacity>

            <View style={styles.headRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.merchant}>
                        {item.draft.merchant ?? "No merchant"}
                    </Text>
                    <Text style={styles.meta}>
                        {item.draft.category} • {item.draft.type} • routes to {business?.name ?? "—"}
                    </Text>
                </View>
                <MoneyText
                    amount={item.draft.amount}
                    symbol={symbol}
                    size={18}
                    color={item.draft.type === "income" ? theme.colors.income : theme.colors.onSurface}
                />
            </View>

            {expanded ? (
                <View style={styles.editArea}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={styles.input}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Merchant or counterparty"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.label, { marginTop: 10 }]}>Original message</Text>
                    <Text style={styles.rawText}>
                        {item.draft.rawText}
                    </Text>
                </View>
            ) : null}

            <View style={styles.actions}>
                <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
                    <Trash2 size={14} color={theme.colors.error} />
                    <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                    <Check size={14} color={theme.colors.onPrimary} />
                    <Text style={styles.confirmText}>Confirm</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        card: {
            padding: 14,
            borderRadius: 14,
            marginBottom: theme.spacing.m,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
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
            borderRadius: theme.shape.small,
            backgroundColor: theme.colors.primaryContainer,
            gap: 4,
        },
        sourceChipText: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.3,
            color: theme.colors.onPrimaryContainer,
        },
        confidence: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
            color: theme.colors.onSurfaceVariant,
        },
        headRow: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
        },
        merchant: {
            fontSize: 16,
            fontFamily: theme.fonts.semibold,
            letterSpacing: -0.2,
            color: theme.colors.onSurface,
        },
        meta: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
        editArea: {
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        label: {
            fontSize: 10,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 6,
            marginTop: 8,
            color: theme.colors.onSurfaceVariant,
        },
        input: {
            height: 48,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 14,
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurface,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        rawText: {
            padding: 10,
            borderRadius: theme.shape.medium,
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            lineHeight: 17,
            color: theme.colors.onSurfaceVariant,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        actions: {
            flexDirection: "row",
            gap: 8,
            marginTop: 12,
        },
        rejectBtn: {
            flex: 1,
            height: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderRadius: theme.shape.full,
            borderWidth: 1,
            borderColor: theme.colors.error,
            backgroundColor: "transparent",
        },
        rejectText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.error,
        },
        confirmBtn: {
            flex: 1,
            height: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primary,
        },
        confirmText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onPrimary,
        },
    });
