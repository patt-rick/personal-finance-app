import React, { useState, useEffect, useMemo, useCallback } from "react";
import { hapticSuccess, hapticError, hapticLight } from "../utils/haptics";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Repeat, Pause, Play, Pencil, Trash2 } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { RecurringTransaction, RecurrenceFrequency, Business, Category } from "../types";
import { loadCategories } from "../utils/storage";
import RecurringTransactionModal from "../components/RecurringTransactionModal";
import { EmptyScene } from "../components/illustrations";

interface RecurringTransactionsScreenProps {
    onBack: () => void;
    recurringTransactions: RecurringTransaction[];
    businesses: Business[];
    onSave: (items: RecurringTransaction[]) => void;
}

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Biweekly",
    monthly: "Monthly",
    yearly: "Yearly",
};

export default function RecurringTransactionsScreen({
    onBack,
    recurringTransactions,
    businesses,
    onSave,
}: RecurringTransactionsScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);

    useEffect(() => {
        loadCategories().then(setCategories);
    }, []);

    const activeItems = useMemo(
        () => recurringTransactions.filter((r) => r.isActive),
        [recurringTransactions]
    );
    const pausedItems = useMemo(
        () => recurringTransactions.filter((r) => !r.isActive),
        [recurringTransactions]
    );

    const getBusinessName = useCallback(
        (id: string) => businesses.find((b) => b.id === id)?.name || "Unknown",
        [businesses]
    );

    const handleAdd = useCallback(() => {
        setEditingItem(null);
        setModalVisible(true);
    }, []);

    const handleEdit = useCallback((item: RecurringTransaction) => {
        setEditingItem(item);
        setModalVisible(true);
    }, []);

    const handleDelete = useCallback(
        (item: RecurringTransaction) => {
            Alert.alert("Delete Recurring", `Remove "${item.description}"?`, [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        onSave(recurringTransactions.filter((r) => r.id !== item.id));
                        hapticError();
                    },
                },
            ]);
        },
        [recurringTransactions, onSave]
    );

    const handleToggleActive = useCallback(
        (item: RecurringTransaction) => {
            const updated = recurringTransactions.map((r) =>
                r.id === item.id ? { ...r, isActive: !r.isActive } : r
            );
            onSave(updated);
            hapticLight();
        },
        [recurringTransactions, onSave]
    );

    const handleModalSubmit = useCallback(
        (data: {
            amount: number;
            type: "income" | "expense";
            businessId: string;
            category: string;
            remark: string;
            frequency: RecurrenceFrequency;
            startDate?: string;
            endDate?: string;
            editingId: string | null;
        }) => {
            const today = new Date().toISOString().split("T")[0];
            const effectiveStartDate = data.startDate || today;

            if (data.editingId) {
                const updated = recurringTransactions.map((r) =>
                    r.id === data.editingId
                        ? {
                              ...r,
                              amount: data.amount,
                              type: data.type,
                              businessId: data.businessId,
                              category: data.category,
                              remark: data.remark,
                              frequency: data.frequency,
                              startDate: effectiveStartDate,
                              nextDueDate: effectiveStartDate,
                              endDate: data.endDate,
                              description: data.category || data.remark || "Recurring",
                          }
                        : r
                );
                onSave(updated);
            } else {
                const newItem: RecurringTransaction = {
                    id: Date.now().toString(),
                    description: data.category || data.remark || "Recurring",
                    amount: data.amount,
                    type: data.type,
                    businessId: data.businessId,
                    category: data.category,
                    remark: data.remark,
                    frequency: data.frequency,
                    startDate: effectiveStartDate,
                    nextDueDate: effectiveStartDate,
                    endDate: data.endDate,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                };
                onSave([...recurringTransactions, newItem]);
            }

            hapticSuccess();
            setModalVisible(false);
            setEditingItem(null);
        },
        [recurringTransactions, onSave]
    );

    const renderItem = (item: RecurringTransaction) => {
        const isIncome = item.type === "income";
        const amountColor = isIncome ? theme.colors.income : theme.colors.onSurface;
        const iconBg = isIncome ? theme.colors.incomeContainer : theme.colors.surfaceContainerHigh;
        const iconColor = isIncome ? theme.colors.onIncomeContainer : theme.colors.onSurfaceVariant;

        return (
            <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                    <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
                        <Repeat size={18} color={iconColor} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                            {item.remark || item.description}
                        </Text>
                        <Text style={styles.itemMeta}>
                            {getBusinessName(item.businessId)}
                            {item.category ? ` · ${item.category}` : ""}
                        </Text>
                    </View>
                    <View style={styles.itemRight}>
                        <Text style={[styles.itemAmount, { color: amountColor }]}>
                            {isIncome ? "+" : "-"}
                            {item.amount.toLocaleString()}
                        </Text>
                        <View style={styles.freqBadge}>
                            <Text style={styles.freqBadgeText}>
                                {FREQUENCY_LABELS[item.frequency]}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.itemFooter}>
                    <Text style={styles.nextDueText}>
                        Next: {item.nextDueDate}
                    </Text>
                    <View style={styles.itemActions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleEdit(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Pencil size={15} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, item.isActive ? styles.actionBtnPause : styles.actionBtnPlay]}
                            onPress={() => handleToggleActive(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            {item.isActive ? (
                                <Pause size={15} color={theme.colors.onSurfaceVariant} />
                            ) : (
                                <Play size={15} color={theme.colors.onIncomeContainer} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnDelete]}
                            onPress={() => handleDelete(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Trash2 size={15} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const isEmpty = recurringTransactions.length === 0;

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
                <Text style={styles.headerTitle}>Recurring</Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingBottom: Math.max(insets.bottom, 20) + 160,
                }}
                showsVerticalScrollIndicator={false}
            >
                {isEmpty ? (
                    <View style={styles.emptyState}>
                        <EmptyScene variant="recurring" size={220} />
                        <Text style={styles.emptyTitle}>No Recurring Transactions</Text>
                        <Text style={styles.emptySubtitle}>
                            Automate repeated income or expenses by tapping the + button below.
                        </Text>
                    </View>
                ) : (
                    <>
                        {activeItems.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Active</Text>
                                {activeItems.map(renderItem)}
                            </View>
                        )}
                        {pausedItems.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Paused</Text>
                                {pausedItems.map(renderItem)}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 90 }]}
                onPress={handleAdd}
                activeOpacity={0.8}
            >
                <Plus size={24} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>

            <RecurringTransactionModal
                visible={modalVisible}
                editingItem={editingItem}
                businesses={businesses}
                categories={categories}
                onClose={() => {
                    setModalVisible(false);
                    setEditingItem(null);
                }}
                onSubmit={handleModalSubmit}
            />
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
            fontSize: 22,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        section: {
            marginTop: 24,
            paddingHorizontal: 20,
        },
        sectionLabel: {
            fontSize: 11,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            marginBottom: 10,
            marginLeft: 4,
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.8,
        },
        itemCard: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
        },
        itemRow: {
            flexDirection: "row",
            alignItems: "center",
        },
        itemIcon: {
            width: 44,
            height: 44,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        itemInfo: {
            flex: 1,
            marginLeft: 14,
        },
        itemTitle: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        itemMeta: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        itemRight: {
            alignItems: "flex-end",
        },
        itemAmount: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
        },
        freqBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: theme.shape.full,
            marginTop: 4,
            backgroundColor: theme.colors.secondaryContainer,
        },
        freqBadgeText: {
            fontSize: 10,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSecondaryContainer,
            textTransform: "uppercase",
            letterSpacing: 0.3,
        },
        itemFooter: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        nextDueText: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
            fontFamily: theme.fonts.regular,
            fontVariant: ["tabular-nums"],
        },
        itemActions: {
            flexDirection: "row",
            gap: 8,
        },
        actionBtn: {
            width: 32,
            height: 32,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.surfaceContainerHigh,
            alignItems: "center",
            justifyContent: "center",
        },
        actionBtnPause: {
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        actionBtnPlay: {
            backgroundColor: theme.colors.incomeContainer,
        },
        actionBtnDelete: {
            backgroundColor: theme.colors.errorContainer,
        },
        emptyState: {
            alignItems: "center",
            paddingTop: 80,
            paddingHorizontal: 40,
        },
        emptyIcon: {
            width: 80,
            height: 80,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.secondaryContainer,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        emptyTitle: {
            fontSize: 17,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
            marginBottom: 8,
        },
        emptySubtitle: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            lineHeight: 20,
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
    });
