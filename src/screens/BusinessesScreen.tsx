import React, { useState, useMemo, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Bell, ChevronRight, Wallet } from "lucide-react-native";
import { Business, Transaction } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { getCurrencySymbol } from "../utils/_helpers";
import CashbookDetailSheet from "../components/CashbookDetailSheet";
import CreateCashbookModal from "../components/CreateCashbookModal";

interface BusinessesScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    saveBusinesses: (businesses: Business[]) => void;
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
}

export default function BusinessesScreen({
    businesses,
    transactions,
    saveBusinesses,
    currentBusiness,
    setCurrentBusiness,
}: BusinessesScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = useMemo(() => createDashboardStyles(theme), [theme]);
    const s = useMemo(() => createLocalStyles(theme), [theme]);

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [sheetBusiness, setSheetBusiness] = useState<Business | null>(null);

    const navigation = useNavigation();

    useEffect(() => {
        if (sheetBusiness || createModalVisible) {
            navigation.setOptions({ tabBarStyle: { display: "none" } });
        } else {
            navigation.setOptions({
                tabBarStyle: {
                    borderTopWidth: 1,
                    paddingTop: 8,
                    backgroundColor: theme.colors.card,
                    borderTopColor: theme.colors.border,
                },
            });
        }
    }, [sheetBusiness, createModalVisible, navigation, theme]);

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

    const deleteBusiness = (businessId: string) => {
        Alert.alert(
            "Delete Cashbook",
            "This will permanently delete this cashbook. Associated transactions will remain unassigned.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        saveBusinesses(businesses.filter((b) => b.id !== businessId));
                        if (currentBusiness?.id === businessId) setCurrentBusiness(null);
                        setSheetBusiness(null);
                    },
                },
            ],
        );
    };

    const handleRename = (businessId: string, newName: string) => {
        const updated = businesses.map((b) =>
            b.id === businessId ? { ...b, name: newName } : b,
        );
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
                <TouchableOpacity style={styles.notificationBtn} onPress={() => {}}>
                    <Bell size={22} color={theme.colors.primary} />
                </TouchableOpacity>
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
                onOpenCashbook={setCurrentBusiness}
                onDelete={deleteBusiness}
                onRename={handleRename}
            />

            <CreateCashbookModal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onSubmit={handleCreateCashbook}
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
