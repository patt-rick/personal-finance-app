import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowDown, Check, Wallet } from "lucide-react-native";
import { Business } from "../types";
import { useTheme } from "../theme/theme";
import { getTransferTargets, validateTransfer } from "../utils/transfers";
import AppModal from "./AppModal";
import ListCard from "./ListCard";

interface TransferModalProps {
    visible: boolean;
    from: Business;
    businesses: Business[];
    symbol: string;
    onClose: () => void;
    onSubmit: (data: { to: Business; amount: number; remark: string }) => void;
}

export default function TransferModal({
    visible,
    from,
    businesses,
    symbol,
    onClose,
    onSubmit,
}: TransferModalProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const targets = useMemo(() => getTransferTargets(from, businesses), [from, businesses]);

    const [toId, setToId] = useState<string | null>(null);
    const [amountText, setAmountText] = useState("");
    const [remark, setRemark] = useState("");

    useEffect(() => {
        if (!visible) {
            setToId(null);
            setAmountText("");
            setRemark("");
        } else if (targets.length === 1) {
            setToId(targets[0].id);
        }
    }, [visible, targets]);

    const to = targets.find((b) => b.id === toId) ?? null;
    const amount = parseFloat(amountText);
    const canSubmit = !!to && validateTransfer(from, to, amount) === null;

    const handleAmountChange = (text: string) => {
        const cleaned = text.replace(/[^0-9.]/g, "");
        const firstDot = cleaned.indexOf(".");
        setAmountText(
            firstDot === -1
                ? cleaned
                : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, ""),
        );
    };

    const handleSubmit = () => {
        if (!to || !canSubmit) return;
        onSubmit({ to, amount, remark: remark.trim() });
    };

    return (
        <AppModal visible={visible} onClose={onClose} title="Transfer" scrollable>
            {targets.length === 0 ? (
                <Text style={styles.emptyText}>
                    No other cashbook uses {from.currency || "USD"}. Transfers only work between
                    cashbooks with the same currency.
                </Text>
            ) : (
                <>
                    <Text style={styles.fieldLabel}>From</Text>
                    <View style={styles.fromRow}>
                        <View style={styles.iconCircle}>
                            <Wallet size={16} color={theme.colors.onPrimaryContainer} />
                        </View>
                        <Text style={styles.fromName}>{from.name}</Text>
                        <Text style={styles.currencyTag}>{from.currency || "USD"}</Text>
                    </View>

                    <View style={styles.arrowRow}>
                        <ArrowDown size={16} color={theme.colors.onSurfaceVariant} />
                    </View>

                    <Text style={styles.fieldLabel}>To</Text>
                    <ListCard>
                        {targets.map((b) => {
                            const selected = b.id === toId;
                            return (
                                <TouchableOpacity
                                    key={b.id}
                                    style={styles.targetRow}
                                    onPress={() => setToId(b.id)}
                                >
                                    <Text
                                        style={[
                                            styles.targetName,
                                            selected && { color: theme.colors.primary },
                                        ]}
                                    >
                                        {b.name}
                                    </Text>
                                    {selected ? (
                                        <Check size={18} color={theme.colors.primary} />
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </ListCard>

                    <Text style={styles.fieldLabel}>Amount</Text>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountSymbol}>{symbol}</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amountText}
                            onChangeText={handleAmountChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.placeholder}
                        />
                    </View>

                    <Text style={styles.fieldLabel}>Note (optional)</Text>
                    <TextInput
                        style={styles.remarkInput}
                        value={remark}
                        onChangeText={setRemark}
                        placeholder="e.g. Monthly savings"
                        placeholderTextColor={theme.colors.placeholder}
                    />

                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            {
                                backgroundColor: canSubmit
                                    ? theme.colors.primary
                                    : theme.colors.surfaceContainerHighest,
                            },
                        ]}
                        disabled={!canSubmit}
                        onPress={handleSubmit}
                    >
                        <Text
                            style={[
                                styles.submitText,
                                {
                                    color: canSubmit
                                        ? theme.colors.onPrimary
                                        : theme.colors.onSurfaceVariant,
                                },
                            ]}
                        >
                            Transfer
                        </Text>
                    </TouchableOpacity>
                </>
            )}
        </AppModal>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        emptyText: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 21,
            paddingBottom: 16,
        },
        fieldLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginTop: 16,
            marginBottom: 8,
        },
        fromRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        iconCircle: {
            width: 30,
            height: 30,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primaryContainer,
        },
        fromName: {
            flex: 1,
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        currencyTag: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
        },
        arrowRow: {
            alignItems: "center",
            marginTop: 10,
            marginBottom: -6,
        },
        targetRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 14,
        },
        targetName: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        amountRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderRadius: 12,
            paddingHorizontal: 14,
        },
        amountSymbol: {
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            marginRight: 6,
        },
        amountInput: {
            flex: 1,
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            paddingVertical: 14,
        },
        remarkInput: {
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurface,
        },
        submitBtn: {
            height: 50,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 22,
            marginBottom: 8,
        },
        submitText: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.2,
        },
    });
