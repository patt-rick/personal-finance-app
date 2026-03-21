import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, ChevronRight, Wallet, Landmark, ArrowRightLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { Business, Transaction } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { getCurrencySymbol } from "../utils/_helpers";
import CashbookDetailSheet from "../components/CashbookDetailSheet";
import CreateCashbookModal from "../components/CreateCashbookModal";
import TransferCashbookModal from "../components/TransferCashbookModal";
import TourOverlay from "../components/TourOverlay";

interface BusinessesScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    saveBusinesses: (businesses: Business[]) => void;
    saveTransactions: (transactions: Transaction[]) => void;
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
}

export default function BusinessesScreen({
    businesses,
    transactions,
    saveBusinesses,
    saveTransactions,
    currentBusiness,
    setCurrentBusiness,
}: BusinessesScreenProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const theme = useTheme();
    const styles = useMemo(() => createDashboardStyles(theme), [theme]);
    const s = useMemo(() => createLocalStyles(theme), [theme]);

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [sheetBusiness, setSheetBusiness] = useState<Business | null>(null);
    const [transferModalBusinessId, setTransferModalBusinessId] = useState<string | null>(null);

    const handleCreateCashbook = (name: string, currency: string) => {
        const newBusiness: Business = {
            id: Date.now().toString(),
            name,
            createdAt: new Date().toISOString(),
            currency,
            memberCount: 1,
        };
        saveBusinesses([...businesses, newBusiness]);
        setCreateModalVisible(false);
    };

    const removeBusiness = (businessId: string) => {
        saveBusinesses(businesses.filter((b) => b.id !== businessId));
        if (currentBusiness?.id === businessId) setCurrentBusiness(null);
        setSheetBusiness(null);
    };

    const deleteBusiness = (businessId: string) => {
        const txCount = transactions.filter((t) => t.businessId === businessId).length;
        const hasOtherCashbooks = businesses.filter((b) => b.id !== businessId).length > 0;

        if (txCount === 0) {
            Alert.alert("Delete Cashbook", "This cashbook has no transactions. Delete it?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => removeBusiness(businessId) },
            ]);
            return;
        }

        const buttons: any[] = [{ text: "Cancel", style: "cancel" }];

        if (hasOtherCashbooks) {
            buttons.push({
                text: "Transfer",
                onPress: () => setTransferModalBusinessId(businessId),
            });
        }

        buttons.push({
            text: "Delete All",
            style: "destructive",
            onPress: () => {
                saveTransactions(transactions.filter((t) => t.businessId !== businessId));
                removeBusiness(businessId);
            },
        });

        Alert.alert(
            "Delete Cashbook",
            `This cashbook has ${txCount} transaction${txCount !== 1 ? "s" : ""}. Would you like to transfer them to another cashbook or delete everything?`,
            buttons,
        );
    };

    const handleTransfer = (targetBusinessId: string) => {
        if (!transferModalBusinessId) return;
        const updated = transactions.map((t) =>
            t.businessId === transferModalBusinessId ? { ...t, businessId: targetBusinessId } : t,
        );
        saveTransactions(updated);
        removeBusiness(transferModalBusinessId);
        setTransferModalBusinessId(null);
    };

    const handleRename = (businessId: string, newName: string) => {
        const updated = businesses.map((b) => (b.id === businessId ? { ...b, name: newName } : b));
        saveBusinesses(updated);
        setSheetBusiness((prev) => (prev ? { ...prev, name: newName } : null));
    };

    return (
        <View style={styles.container}>
            <View style={[styles.headerDecoration, { height: 240 + insets.top }]} />

            <View style={[styles.modernHeader, { paddingTop: Math.max(insets.top, 40) }]}>
                <View>
                    <Text style={styles.greetingText}>Manage businesses,</Text>
                    <Text style={styles.userNameText}>Cashbooks</Text>
                </View>
            </View>

            <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: 100 }}>
                {businesses.map((biz) => {
                    const bizTx = transactions.filter((t) => t.businessId === biz.id);
                    const balance = bizTx.reduce(
                        (a, t) => (t.type === "income" ? a + t.amount : a - t.amount),
                        0,
                    );
                    const symbol = getCurrencySymbol(biz.currency);
                    const isActive = currentBusiness?.id === biz.id;

                    return (
                        <TouchableOpacity
                            key={biz.id}
                            style={[s.card, { backgroundColor: theme.colors.card }]}
                            onPress={() => setSheetBusiness(biz)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    s.cardIcon,
                                    {
                                        backgroundColor: isActive
                                            ? theme.colors.primary
                                            : theme.colors.surface,
                                    },
                                ]}
                            >
                                <Wallet
                                    size={20}
                                    color={isActive ? "#fff" : theme.colors.primary}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.cardName, { color: theme.colors.text }]}>
                                    {biz.name}
                                </Text>
                                <Text style={[s.cardMeta, { color: theme.colors.textSecondary }]}>
                                    {bizTx.length} transaction{bizTx.length !== 1 ? "s" : ""} ·{" "}
                                    {biz.currency || "USD"}
                                </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text
                                    style={[
                                        s.cardBalance,
                                        {
                                            color:
                                                balance >= 0
                                                    ? theme.colors.success
                                                    : theme.colors.error,
                                        },
                                    ]}
                                >
                                    {balance >= 0 ? "+" : ""}
                                    {symbol}
                                    {Math.abs(balance).toLocaleString()}
                                </Text>
                                <ChevronRight
                                    size={16}
                                    color={theme.colors.textSecondary}
                                    style={{ marginTop: 2 }}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
                {businesses.length === 0 && (
                    <View style={s.empty}>
                        <Wallet size={48} color={theme.colors.placeholder} />
                        <Text style={[s.emptyTitle, { color: theme.colors.text }]}>
                            No cashbooks yet
                        </Text>
                        <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>
                            Tap the + button to create your first cashbook
                        </Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity style={s.fab} onPress={() => setCreateModalVisible(true)}>
                <Plus size={24} color="white" />
            </TouchableOpacity>

            <CashbookDetailSheet
                business={sheetBusiness}
                transactions={transactions}
                onClose={() => setSheetBusiness(null)}
                onOpenCashbook={(biz) => {
                    setCurrentBusiness(biz);
                    navigation.navigate("Dashboard" as never);
                }}
                onDelete={deleteBusiness}
                onRename={handleRename}
            />

            <CreateCashbookModal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onSubmit={handleCreateCashbook}
            />

            <TransferCashbookModal
                visible={!!transferModalBusinessId}
                businesses={businesses}
                transactions={transactions}
                deletingBusinessId={transferModalBusinessId || ""}
                onTransfer={handleTransfer}
                onClose={() => setTransferModalBusinessId(null)}
            />

            <TourOverlay
                page="cashbooks"
                steps={[
                    {
                        title: "Your Cashbooks",
                        icon: <Landmark size={24} color={theme.colors.primary} />,
                        description:
                            "Cashbooks let you track finances for different businesses or accounts separately. Each one has its own transactions and currency.",
                    },
                    {
                        title: "Create & Manage",
                        icon: <Plus size={24} color={theme.colors.primary} />,
                        description:
                            "Tap the + button to create a new cashbook. Tap any existing cashbook to view details, rename it, or delete it.",
                    },
                    {
                        title: "Transfer Between Cashbooks",
                        icon: <ArrowRightLeft size={24} color={theme.colors.primary} />,
                        description:
                            "When deleting a cashbook, you can transfer its transactions to another cashbook instead of losing them.",
                    },
                ]}
            />
        </View>
    );
}

const createLocalStyles = (theme: any) =>
    StyleSheet.create({
        list: { flex: 1, paddingHorizontal: 20 },

        card: {
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderRadius: 14,
            marginBottom: 10,
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        cardIcon: {
            width: 42,
            height: 42,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
        },
        cardName: { fontSize: 15, fontWeight: "600", letterSpacing: -0.1 },
        cardMeta: { fontSize: 11, marginTop: 2 },
        cardBalance: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },

        empty: { padding: 48, alignItems: "center", gap: 8 },
        emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
        emptyText: { fontSize: 13, textAlign: "center" },

        fab: {
            position: "absolute",
            right: 20,
            bottom: 24,
            width: 54,
            height: 54,
            borderRadius: 16,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            elevation: 6,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
        },
    });
