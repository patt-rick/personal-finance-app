import React, { useState, useMemo, useCallback } from "react";
import { hapticSuccess, hapticError } from "../utils/haptics";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ArrowLeft,
    Plus,
    ChevronDown,
    ChevronRight,
    Edit3,
    CheckCircle,
    Trash2,
} from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { Debt, DebtPayment } from "../types";
import { getCurrencySymbol } from "../utils/_helpers";
import DebtEntryModal from "../components/DebtEntryModal";
import DebtPaymentModal from "../components/DebtPaymentModal";

interface DebtTrackerScreenProps {
    onBack: () => void;
    debts: Debt[];
    onSave: (debts: Debt[]) => void;
}

const getTotalPaid = (debt: Debt) =>
    debt.payments.reduce((sum, p) => sum + p.amount, 0);

const getRemaining = (debt: Debt) =>
    Math.max(0, debt.amount - getTotalPaid(debt));

const getProgress = (debt: Debt) =>
    Math.min(1, getTotalPaid(debt) / debt.amount);

export default function DebtTrackerScreen({
    onBack,
    debts,
    onSave,
}: DebtTrackerScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
    const [showSettled, setShowSettled] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);

    const activeDebts = useMemo(
        () => debts.filter((d) => d.status === "active"),
        [debts]
    );
    const settledDebts = useMemo(
        () => debts.filter((d) => d.status === "settled"),
        [debts]
    );

    const summaryTotals = useMemo(() => {
        const owedToMe: Record<string, number> = {};
        const iOwe: Record<string, number> = {};
        activeDebts.forEach((d) => {
            const remaining = getRemaining(d);
            const bucket = d.type === "owed_to_me" ? owedToMe : iOwe;
            bucket[d.currency] = (bucket[d.currency] || 0) + remaining;
        });
        return { owedToMe, iOwe };
    }, [activeDebts]);

    const formatSummary = useCallback((totals: Record<string, number>) => {
        const entries = Object.entries(totals).filter(([, v]) => v > 0);
        if (entries.length === 0) return "0.00";
        return entries
            .map(([cur, val]) => `${getCurrencySymbol(cur)}${val.toFixed(2)}`)
            .join("  ");
    }, []);

    const handleAddDebt = useCallback(
        (data: {
            personName: string;
            amount: number;
            type: "owed_to_me" | "i_owe";
            description: string;
            dueDate: string;
            currency: string;
            editingId: string | null;
        }) => {
            let updated: Debt[];
            if (data.editingId) {
                updated = debts.map((d) =>
                    d.id === data.editingId
                        ? {
                              ...d,
                              personName: data.personName,
                              amount: data.amount,
                              type: data.type,
                              description: data.description || undefined,
                              dueDate: data.dueDate || undefined,
                              currency: data.currency,
                          }
                        : d
                );
            } else {
                const newDebt: Debt = {
                    id: Date.now().toString(),
                    personName: data.personName,
                    amount: data.amount,
                    type: data.type,
                    description: data.description || undefined,
                    dueDate: data.dueDate || undefined,
                    currency: data.currency,
                    payments: [],
                    status: "active",
                    createdAt: new Date().toISOString(),
                };
                updated = [...debts, newDebt];
            }
            onSave(updated);
            hapticSuccess();
            setShowEntryModal(false);
            setEditingDebt(null);
        },
        [debts, onSave]
    );

    const handleRecordPayment = useCallback(
        (data: { amount: number; note: string }) => {
            if (!paymentDebt) return;
            const payment: DebtPayment = {
                id: Date.now().toString(),
                amount: data.amount,
                date: new Date().toISOString(),
                note: data.note || undefined,
            };
            const totalPaidAfter =
                getTotalPaid(paymentDebt) + data.amount;
            const updated = debts.map((d) =>
                d.id === paymentDebt.id
                    ? { ...d, payments: [...d.payments, payment] }
                    : d
            );
            onSave(updated);
            hapticSuccess();
            setPaymentDebt(null);

            if (totalPaidAfter >= paymentDebt.amount) {
                Alert.alert(
                    "Debt Fully Paid",
                    "This debt has been fully paid. Mark as settled?",
                    [
                        { text: "Not Now", style: "cancel" },
                        {
                            text: "Mark Settled",
                            onPress: () => {
                                onSave(
                                    updated.map((d) =>
                                        d.id === paymentDebt.id
                                            ? { ...d, status: "settled" as const }
                                            : d
                                    )
                                );
                            },
                        },
                    ]
                );
            }
        },
        [paymentDebt, debts, onSave]
    );

    const handleMarkSettled = useCallback(
        (debtId: string) => {
            Alert.alert("Mark Settled", "Are you sure you want to mark this debt as settled?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Settle",
                    onPress: () => {
                        onSave(
                            debts.map((d) =>
                                d.id === debtId ? { ...d, status: "settled" as const } : d
                            )
                        );
                        setExpandedDebtId(null);
                    },
                },
            ]);
        },
        [debts, onSave]
    );

    const handleDelete = useCallback(
        (debtId: string) => {
            Alert.alert("Delete Debt", "Are you sure you want to delete this debt?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        onSave(debts.filter((d) => d.id !== debtId));
                        hapticError();
                        setExpandedDebtId(null);
                    },
                },
            ]);
        },
        [debts, onSave]
    );

    const renderDebtCard = (debt: Debt) => {
        const isExpanded = expandedDebtId === debt.id;
        const totalPaid = getTotalPaid(debt);
        const remaining = getRemaining(debt);
        const progress = getProgress(debt);
        const symbol = getCurrencySymbol(debt.currency);
        const isOwedToMe = debt.type === "owed_to_me";
        const accentColor = isOwedToMe ? theme.colors.income : theme.colors.expense;
        const badgeBg = isOwedToMe ? theme.colors.incomeContainer : theme.colors.expenseContainer;
        const badgeText = isOwedToMe ? theme.colors.onIncomeContainer : theme.colors.onExpenseContainer;

        return (
            <View key={debt.id} style={styles.debtCard}>
                <TouchableOpacity
                    style={styles.debtCardHeader}
                    onPress={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                    activeOpacity={0.7}
                >
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.personName}>{debt.personName}</Text>
                            <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                                <Text style={[styles.typeBadgeText, { color: badgeText }]}>
                                    {isOwedToMe ? "Owed to me" : "I owe"}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.debtAmount, { color: accentColor }]}>
                            {symbol}{debt.amount.toFixed(2)}
                        </Text>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${progress * 100}%` as any,
                                            backgroundColor: theme.colors.primary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {symbol}{totalPaid.toFixed(2)} paid · {symbol}{remaining.toFixed(2)} remaining
                            </Text>
                        </View>
                    </View>
                    {isExpanded ? (
                        <ChevronDown size={20} color={theme.colors.onSurfaceVariant} />
                    ) : (
                        <ChevronRight size={20} color={theme.colors.onSurfaceVariant} />
                    )}
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedSection}>
                        {debt.description ? (
                            <Text style={styles.debtDescription}>{debt.description}</Text>
                        ) : null}
                        {debt.dueDate ? (
                            <Text style={styles.debtDueDate}>Due: {debt.dueDate}</Text>
                        ) : null}

                        {debt.payments.length > 0 && (
                            <View style={styles.paymentHistory}>
                                <Text style={styles.paymentHistoryTitle}>Payments</Text>
                                {debt.payments.map((p) => (
                                    <View key={p.id} style={styles.paymentRow}>
                                        <Text style={styles.paymentAmount}>
                                            {symbol}{p.amount.toFixed(2)}
                                        </Text>
                                        <Text style={styles.paymentDate}>
                                            {new Date(p.date).toLocaleDateString()}
                                            {p.note ? ` — ${p.note}` : ""}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {debt.status === "active" && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                                    onPress={() => setPaymentDebt(debt)}
                                >
                                    <Text style={styles.actionBtnText}>Record Payment</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtnSmall, { borderColor: theme.colors.outline }]}
                                    onPress={() => {
                                        setEditingDebt(debt);
                                        setShowEntryModal(true);
                                    }}
                                >
                                    <Edit3 size={16} color={theme.colors.onSurface} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtnSmall, { borderColor: theme.colors.income }]}
                                    onPress={() => handleMarkSettled(debt.id)}
                                >
                                    <CheckCircle size={16} color={theme.colors.income} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtnSmall, { borderColor: theme.colors.error }]}
                                    onPress={() => handleDelete(debt.id)}
                                >
                                    <Trash2 size={16} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={onBack}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ArrowLeft size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Debts & Loans</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 160 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                        <View style={[styles.summaryIconWrap, { backgroundColor: theme.colors.incomeContainer }]}>
                            <Text style={[styles.summaryIconText, { color: theme.colors.onIncomeContainer }]}>↑</Text>
                        </View>
                        <Text style={styles.summaryLabel}>Owed to Me</Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.income }]}>
                            {formatSummary(summaryTotals.owedToMe)}
                        </Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                        <View style={[styles.summaryIconWrap, { backgroundColor: theme.colors.expenseContainer }]}>
                            <Text style={[styles.summaryIconText, { color: theme.colors.onExpenseContainer }]}>↓</Text>
                        </View>
                        <Text style={styles.summaryLabel}>I Owe</Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.expense }]}>
                            {formatSummary(summaryTotals.iOwe)}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    {activeDebts.length > 0 ? (
                        activeDebts.map(renderDebtCard)
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                No active debts. Tap + to add one.
                            </Text>
                        </View>
                    )}
                </View>

                {settledDebts.length > 0 && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.settledHeader}
                            onPress={() => setShowSettled(!showSettled)}
                        >
                            <Text style={styles.settledHeaderText}>
                                Settled ({settledDebts.length})
                            </Text>
                            {showSettled ? (
                                <ChevronDown size={18} color={theme.colors.onSurfaceVariant} />
                            ) : (
                                <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
                            )}
                        </TouchableOpacity>
                        {showSettled && settledDebts.map(renderDebtCard)}
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { bottom: Math.max(insets.bottom, 20) + 90 }]}
                onPress={() => {
                    setEditingDebt(null);
                    setShowEntryModal(true);
                }}
            >
                <Plus size={24} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>

            <DebtEntryModal
                visible={showEntryModal}
                editingDebt={editingDebt}
                onClose={() => {
                    setShowEntryModal(false);
                    setEditingDebt(null);
                }}
                onSubmit={handleAddDebt}
            />

            {paymentDebt && (
                <DebtPaymentModal
                    visible={!!paymentDebt}
                    currencySymbol={getCurrencySymbol(paymentDebt.currency)}
                    remainingAmount={getRemaining(paymentDebt)}
                    onClose={() => setPaymentDebt(null)}
                    onSubmit={handleRecordPayment}
                />
            )}
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerLow,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        headerTitle: {
            ...theme.typescale.headlineSmall,
            color: theme.colors.onSurface,
        },
        summaryRow: {
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 12,
            marginTop: 16,
        },
        summaryCard: {
            flex: 1,
            padding: 16,
            borderRadius: theme.shape.large,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        summaryIconWrap: {
            width: 32,
            height: 32,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
        },
        summaryIconText: {
            fontSize: 16,
            fontWeight: "700",
        },
        summaryLabel: {
            fontSize: 12,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
            color: theme.colors.onSurfaceVariant,
        },
        summaryValue: {
            fontSize: 18,
            fontWeight: "700",
            letterSpacing: -0.3,
        },
        section: {
            marginTop: 24,
            paddingHorizontal: 20,
        },
        debtCard: {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderRadius: theme.shape.large,
            marginBottom: 12,
            overflow: "hidden",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        debtCardHeader: {
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
        },
        personName: {
            fontSize: 15,
            fontWeight: "700",
            color: theme.colors.onSurface,
            letterSpacing: -0.1,
        },
        typeBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: theme.shape.full,
        },
        typeBadgeText: {
            fontSize: 11,
            fontWeight: "600",
        },
        debtAmount: {
            fontSize: 16,
            fontWeight: "700",
            marginTop: 4,
            letterSpacing: -0.2,
        },
        progressContainer: {
            marginTop: 10,
        },
        progressBar: {
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.surfaceContainerHighest,
            overflow: "hidden",
        },
        progressFill: {
            height: "100%",
            borderRadius: 3,
        },
        progressText: {
            fontSize: 11,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
            fontWeight: "500",
        },
        expandedSection: {
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        debtDescription: {
            fontSize: 13,
            color: theme.colors.onSurfaceVariant,
            marginTop: 12,
        },
        debtDueDate: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
            fontWeight: "500",
        },
        paymentHistory: {
            marginTop: 12,
        },
        paymentHistoryTitle: {
            fontSize: 12,
            fontWeight: "700",
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
        },
        paymentRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            gap: 10,
        },
        paymentAmount: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.income,
        },
        paymentDate: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
            flex: 1,
        },
        actionRow: {
            flexDirection: "row",
            gap: 8,
            marginTop: 14,
        },
        actionBtn: {
            flex: 1,
            height: 40,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        actionBtnText: {
            color: theme.colors.onPrimary,
            fontSize: 13,
            fontWeight: "700",
        },
        actionBtnSmall: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            borderWidth: 1.5,
            alignItems: "center",
            justifyContent: "center",
        },
        settledHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
        },
        settledHeaderText: {
            fontSize: 15,
            fontWeight: "700",
            color: theme.colors.onSurfaceVariant,
            letterSpacing: -0.1,
        },
        fab: {
            position: "absolute",
            right: 20,
            width: 56,
            height: 56,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
        emptyState: {
            padding: 40,
            alignItems: "center",
        },
        emptyText: {
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 20,
        },
    });
