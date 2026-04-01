import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    StyleSheet,
    TouchableWithoutFeedback,
} from "react-native";
import { ArrowRightLeft, Wallet, Check } from "lucide-react-native";
import { Business, Transaction } from "../types";
import { useTheme } from "../theme/theme";
import { getCurrencySymbol } from "../utils/_helpers";

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
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={s.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={{ flex: 1 }} />
                </TouchableWithoutFeedback>
                <View style={[s.content, { backgroundColor: theme.colors.card }]}>
                    <View style={s.handle}>
                        <View style={[s.handleBar, { backgroundColor: theme.colors.border }]} />
                    </View>

                    <View style={s.header}>
                        <View style={[s.iconBadge, { backgroundColor: theme.colors.incomeBg }]}>
                            <ArrowRightLeft size={20} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: theme.colors.text }]}>
                                Transfer Transactions
                            </Text>
                            <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
                                {transferCount} transaction{transferCount !== 1 ? "s" : ""} will be
                                transferred
                            </Text>
                        </View>
                    </View>

                    <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>
                        Select destination
                    </Text>

                    <ScrollView
                        style={s.list}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {availableBusinesses.map((biz) => {
                            const bizTxCount = transactions.filter(
                                (t) => t.businessId === biz.id,
                            ).length;
                            const isSelected = selectedId === biz.id;
                            const symbol = getCurrencySymbol(biz.currency);

                            return (
                                <TouchableOpacity
                                    key={biz.id}
                                    style={[
                                        s.card,
                                        { backgroundColor: theme.colors.surface },
                                        isSelected && {
                                            backgroundColor: theme.colors.incomeBg,
                                            borderColor: theme.colors.primary,
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
                                                    : theme.colors.card,
                                            },
                                        ]}
                                    >
                                        <Wallet
                                            size={16}
                                            color={isSelected ? theme.colors.textInverse : theme.colors.primary}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.cardName, { color: theme.colors.text }]}>
                                            {biz.name}
                                        </Text>
                                        <Text
                                            style={[
                                                s.cardMeta,
                                                { color: theme.colors.textSecondary },
                                            ]}
                                        >
                                            {symbol} {biz.currency || "USD"} · {bizTxCount}{" "}
                                            transaction{bizTxCount !== 1 ? "s" : ""}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            s.radio,
                                            { borderColor: theme.colors.border },
                                            isSelected && {
                                                borderColor: theme.colors.primary,
                                                backgroundColor: theme.colors.primary,
                                            },
                                        ]}
                                    >
                                        {isSelected && <Check size={12} color={theme.colors.textInverse} />}
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
                            <ArrowRightLeft size={16} color={theme.colors.textInverse} />
                            <Text style={s.transferBtnText}>Transfer & Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
                            <Text
                                style={[s.cancelBtnText, { color: theme.colors.textSecondary }]}
                            >
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
        },
        content: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingBottom: 40,
            maxHeight: "75%",
        },
        handle: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
        handleBar: { width: 36, height: 4, borderRadius: 2 },

        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
            marginTop: 4,
        },
        iconBadge: {
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
        subtitle: { fontSize: 12, fontWeight: "500", marginTop: 2 },

        sectionLabel: {
            fontSize: 11,
            fontWeight: "600",
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
            borderWidth: 1.5,
            borderColor: "transparent",
        },
        cardIcon: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
        },
        cardName: { fontSize: 14, fontWeight: "600", letterSpacing: -0.1 },
        cardMeta: { fontSize: 11, marginTop: 2 },

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
            height: 50,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
        },
        transferBtnText: { color: theme.colors.textInverse, fontWeight: "700", fontSize: 15 },
        cancelBtn: { alignItems: "center", paddingVertical: 8 },
        cancelBtnText: { fontSize: 14, fontWeight: "600" },
    });
