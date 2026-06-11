import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from "react-native";
import { ArrowRightLeft, Wallet, Check } from "lucide-react-native";
import { Business, Transaction } from "../types";
import { useTheme } from "../theme/theme";
import { getCurrencySymbol } from "../utils/_helpers";
import AppModal from "./AppModal";

interface TransferCashbookModalProps {
    visible: boolean;
    businesses: Business[];
    transactions: Transaction[];
    deletingBusinessId: string;
    onTransfer: (targetBusinessId: string) => void;
    onClose: () => void;
}

export default function TransferCashbookModal({
    visible,
    businesses,
    transactions,
    deletingBusinessId,
    onTransfer,
    onClose,
}: TransferCashbookModalProps) {
    const theme = useTheme();
    const s = useMemo(() => createStyles(theme), [theme]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const transferCount = useMemo(
        () => transactions.filter((t) => t.businessId === deletingBusinessId).length,
        [transactions, deletingBusinessId],
    );

    const availableBusinesses = useMemo(
        () => businesses.filter((b) => b.id !== deletingBusinessId),
        [businesses, deletingBusinessId],
    );

    const handleTransfer = () => {
        if (selectedId) {
            onTransfer(selectedId);
            setSelectedId(null);
        }
    };

    const handleClose = () => {
        setSelectedId(null);
        onClose();
    };

    return (
        <AppModal visible={visible} onClose={handleClose} maxHeight="75%">
            <View style={s.header}>
                <View style={[s.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <ArrowRightLeft size={20} color={theme.colors.onPrimaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.title, { color: theme.colors.onSurface }]}>
                        Transfer Transactions
                    </Text>
                    <Text style={[s.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        {transferCount} transaction{transferCount !== 1 ? "s" : ""} will be transferred
                    </Text>
                </View>
            </View>

            <Text style={[s.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Select destination
            </Text>

            <ScrollView style={s.list} showsVerticalScrollIndicator={false} bounces={false}>
                {availableBusinesses.map((biz) => {
                    const bizTxCount = transactions.filter((t) => t.businessId === biz.id).length;
                    const isSelected = selectedId === biz.id;
                    const symbol = getCurrencySymbol(biz.currency);

                    return (
                        <TouchableOpacity
                            key={biz.id}
                            style={[
                                s.card,
                                isSelected && {
                                    backgroundColor: theme.colors.inverseSurface,
                                    borderColor: theme.colors.inverseSurface,
                                },
                            ]}
                            onPress={() => setSelectedId(biz.id)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    s.cardIcon,
                                    {
                                        backgroundColor: isSelected
                                            ? theme.colors.primary
                                            : theme.colors.surfaceContainerHigh,
                                    },
                                ]}
                            >
                                <Wallet
                                    size={16}
                                    color={
                                        isSelected
                                            ? theme.colors.onPrimary
                                            : theme.colors.onSurfaceVariant
                                    }
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.cardName, {
                                    color: isSelected
                                        ? theme.colors.inverseOnSurface
                                        : theme.colors.onSurface,
                                }]}>
                                    {biz.name}
                                </Text>
                                <Text style={[s.cardMeta, {
                                    color: isSelected
                                        ? theme.colors.inverseOnSurface
                                        : theme.colors.onSurfaceVariant,
                                }]}>
                                    {symbol} {biz.currency || "USD"} · {bizTxCount}{" "}
                                    transaction{bizTxCount !== 1 ? "s" : ""}
                                </Text>
                            </View>
                            <View
                                style={[
                                    s.radio,
                                    { borderColor: theme.colors.outline },
                                    isSelected && {
                                        borderColor: theme.colors.primary,
                                        backgroundColor: theme.colors.primary,
                                    },
                                ]}
                            >
                                {isSelected && <Check size={12} color={theme.colors.onPrimary} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={s.actions}>
                <TouchableOpacity
                    style={[
                        s.transferBtn,
                        { backgroundColor: theme.colors.primary },
                        !selectedId && { opacity: 0.4 },
                    ]}
                    onPress={handleTransfer}
                    disabled={!selectedId}
                >
                    <ArrowRightLeft size={16} color={theme.colors.onPrimary} />
                    <Text style={s.transferBtnText}>Transfer & Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
                    <Text style={[s.cancelBtnText, { color: theme.colors.onSurfaceVariant }]}>
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </AppModal>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
        },
        iconBadge: {
            width: 44,
            height: 44,
            borderRadius: theme.shape.medium,
            alignItems: "center",
            justifyContent: "center",
        },
        title: { fontSize: 18, fontFamily: theme.fonts.semibold, letterSpacing: -0.3 },
        subtitle: { fontSize: 12, fontFamily: theme.fonts.regular, marginTop: 2 },

        sectionLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 10,
        },

        list: { flexGrow: 0 },

        card: {
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderRadius: 14,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            backgroundColor: "transparent",
        },
        cardIcon: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
        },
        cardName: { fontSize: 14, fontFamily: theme.fonts.semibold, letterSpacing: -0.1 },
        cardMeta: { fontSize: 11, fontFamily: theme.fonts.regular, marginTop: 2 },

        radio: {
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 8,
        },

        actions: { marginTop: 16, gap: 10 },
        transferBtn: {
            height: 52,
            borderRadius: theme.shape.full,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
        },
        transferBtnText: {
            color: theme.colors.onPrimary,
            fontFamily: theme.fonts.semibold,
            fontSize: 15,
        },
        cancelBtn: { alignItems: "center", paddingVertical: 8 },
        cancelBtnText: { fontSize: 14, fontFamily: theme.fonts.semibold },
    });
