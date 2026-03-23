import React, { useState, useEffect, useMemo, useCallback } from "react";
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

            setModalVisible(false);
            setEditingItem(null);
        },
        [recurringTransactions, onSave]
    );

    const renderItem = (item: RecurringTransaction) => {
        const isIncome = item.type === "income";
        const color = isIncome ? theme.colors.income : theme.colors.expense;

        return (
            <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                    <View style={[styles.itemIcon, { backgroundColor: isIncome ? theme.colors.incomeBg : theme.colors.expenseBg }]}>
                        <Repeat size={18} color={color} />
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
                        <Text style={[styles.itemAmount, { color }]}>
                            {isIncome ? "+" : "-"}
                            {item.amount.toLocaleString()}
                        </Text>
                        <View style={[styles.freqBadge, { backgroundColor: theme.colors.surface }]}>
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
                            <Pencil size={15} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleToggleActive(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            {item.isActive ? (
                                <Pause size={15} color={theme.colors.textSecondary} />
                            ) : (
                                <Play size={15} color={theme.colors.income} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
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
            <View style={[styles.headerDecoration, { height: 180 + insets.top }]} />

            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={onBack}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ArrowLeft size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Recurring</Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingBottom: Math.max(insets.bottom, 20) + 80,
                }}
                showsVerticalScrollIndicator={false}
            >
                {isEmpty ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Repeat size={32} color={theme.colors.textSecondary} />
                        </View>
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
                style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
                onPress={handleAdd}
                activeOpacity={0.8}
            >
                <Plus size={24} color="white" />
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
        headerDecoration: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.incomeBg,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            opacity: 0.6,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
        },
        backBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.colors.card,
            alignItems: "center",
            justifyContent: "center",
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: "800",
            color: theme.colors.text,
            letterSpacing: -0.3,
        },
        section: {
            marginTop: 24,
            paddingHorizontal: 20,
        },
        sectionLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textTransform: "uppercase",
            marginBottom: 10,
            marginLeft: 4,
            fontWeight: "700",
            letterSpacing: 0.8,
        },
        itemCard: {
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        itemRow: {
            flexDirection: "row",
            alignItems: "center",
        },
        itemIcon: {
            width: 42,
            height: 42,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        itemInfo: {
            flex: 1,
            marginLeft: 14,
        },
        itemTitle: {
            fontSize: 15,
            fontWeight: "600",
            color: theme.colors.text,
            letterSpacing: -0.1,
        },
        itemMeta: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        itemRight: {
            alignItems: "flex-end",
        },
        itemAmount: {
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: -0.2,
        },
        freqBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            marginTop: 4,
        },
        freqBadgeText: {
            fontSize: 10,
            fontWeight: "600",
            color: theme.colors.textSecondary,
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
            borderTopColor: theme.colors.borderLight,
        },
        nextDueText: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            fontWeight: "500",
        },
        itemActions: {
            flexDirection: "row",
            gap: 12,
        },
        actionBtn: {
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyState: {
            alignItems: "center",
            paddingTop: 80,
            paddingHorizontal: 40,
        },
        emptyIcon: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        emptyTitle: {
            fontSize: 17,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 8,
        },
        emptySubtitle: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
        },
        fab: {
            position: "absolute",
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            elevation: 4,
            shadowColor: "#2D6A4F",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
    });
