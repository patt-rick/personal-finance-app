import React, { useState, useMemo, useRef, useEffect } from "react";
import { hapticSuccess, hapticError } from "../utils/haptics";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    StyleSheet,
    Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Wallet, Landmark, ArrowRightLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { Business, Transaction } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { getCurrencySymbol } from "../utils/_helpers";
import CashbookDetailSheet from "../components/CashbookDetailSheet";
import CreateCashbookModal from "../components/CreateCashbookModal";
import TransferCashbookModal from "../components/TransferCashbookModal";
import TourOverlay from "../components/TourOverlay";
import { EmptyScene } from "../components/illustrations";
import MoneyText from "../components/MoneyText";

interface BusinessesScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    saveBusinesses: (businesses: Business[]) => void;
    saveTransactions: (transactions: Transaction[]) => void;
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
}

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ActivityDots({ transactions, theme }: { transactions: Transaction[]; theme: any }) {
    const now = new Date();
    const dots = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const hasActivity = transactions.some((t) => {
            const d = new Date(t.date);
            return d >= dayStart && d < dayEnd;
        });

        dots.push(
            <View
                key={i}
                style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: hasActivity
                        ? theme.colors.primary
                        : theme.colors.outlineVariant,
                }}
            />,
        );
    }
    return <View style={{ flexDirection: "row", gap: 3, marginTop: 6 }}>{dots}</View>;
}

function AnimatedCard({
    children,
    index,
}: {
    children: React.ReactNode;
    index: number;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 350,
                delay: index * 55,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 350,
                delay: index * 55,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
            {children}
        </Animated.View>
    );
}

function SummaryStrip({
    businesses,
    transactions,
    theme,
    summaryStyles,
}: {
    businesses: Business[];
    transactions: Transaction[];
    theme: any;
    summaryStyles: ReturnType<typeof createSummaryStyles>;
}) {
    const totals = useMemo(() => {
        const byCurrency: Record<
            string,
            { income: number; expense: number; symbol: string }
        > = {};

        const bizCurrencyMap: Record<string, string> = {};
        for (const biz of businesses) {
            bizCurrencyMap[biz.id] = biz.currency || "USD";
        }

        for (const t of transactions) {
            const cur = bizCurrencyMap[t.businessId] || "USD";
            if (!byCurrency[cur]) {
                byCurrency[cur] = {
                    income: 0,
                    expense: 0,
                    symbol: getCurrencySymbol(cur),
                };
            }
            if (t.type === "income") byCurrency[cur].income += t.amount;
            else byCurrency[cur].expense += t.amount;
        }

        const entries = Object.entries(byCurrency);
        if (entries.length === 0) return null;

        if (entries.length === 1) {
            const [, v] = entries[0];
            return {
                income: `${v.symbol}${v.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                expense: `${v.symbol}${v.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                balance: v.income - v.expense,
                balanceStr: `${v.symbol}${Math.abs(v.income - v.expense).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            };
        }

        let totalIncome = 0;
        let totalExpense = 0;
        for (const [, v] of entries) {
            totalIncome += v.income;
            totalExpense += v.expense;
        }
        const balance = totalIncome - totalExpense;
        return {
            income: `${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            expense: `${totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            balance,
            balanceStr: `${Math.abs(balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        };
    }, [businesses, transactions]);

    if (!totals || businesses.length === 0) return null;

    return (
        <View
            style={[
                summaryStyles.strip,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
        >
            <View style={summaryStyles.item}>
                <View style={[summaryStyles.dot, { backgroundColor: theme.colors.income }]} />
                <View>
                    <Text style={[summaryStyles.label, { color: theme.colors.onSurfaceVariant }]}>
                        Income
                    </Text>
                    <Text style={[summaryStyles.value, { color: theme.colors.onSurface }]}>
                        {totals.income}
                    </Text>
                </View>
            </View>
            <View style={[summaryStyles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={summaryStyles.item}>
                <View style={[summaryStyles.dot, { backgroundColor: theme.colors.expense }]} />
                <View>
                    <Text style={[summaryStyles.label, { color: theme.colors.onSurfaceVariant }]}>
                        Expense
                    </Text>
                    <Text style={[summaryStyles.value, { color: theme.colors.onSurface }]}>
                        {totals.expense}
                    </Text>
                </View>
            </View>
            <View style={[summaryStyles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={summaryStyles.item}>
                <View
                    style={[
                        summaryStyles.dot,
                        {
                            backgroundColor:
                                totals.balance >= 0
                                    ? theme.colors.income
                                    : theme.colors.onSurfaceVariant,
                        },
                    ]}
                />
                <View>
                    <Text style={[summaryStyles.label, { color: theme.colors.onSurfaceVariant }]}>
                        Net
                    </Text>
                    <Text
                        style={[
                            summaryStyles.value,
                            {
                                color:
                                    totals.balance >= 0
                                        ? theme.colors.income
                                        : theme.colors.onSurface,
                            },
                        ]}
                    >
                        {totals.balance >= 0 ? "+" : "-"}
                        {totals.balanceStr}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const createSummaryStyles = (theme: any) => StyleSheet.create({
    strip: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    item: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    divider: {
        width: 1,
        height: 28,
        marginHorizontal: 8,
    },
    label: {
        fontSize: 9,
        fontFamily: theme.fonts.semibold,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    value: {
        fontSize: 13,
        fontFamily: theme.fonts.semibold,
        fontVariant: ["tabular-nums"],
        marginTop: 1,
    },
});

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
    const summaryStl = useMemo(() => createSummaryStyles(theme), [theme]);

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [sheetBusiness, setSheetBusiness] = useState<Business | null>(null);
    const [transferModalBusinessId, setTransferModalBusinessId] = useState<string | null>(null);

    const handleCreateCashbook = (
        name: string,
        currency: string,
        color: string,
        iconKey: string,
    ) => {
        const newBusiness: Business = {
            id: Date.now().toString(),
            name,
            createdAt: new Date().toISOString(),
            currency,
            color,
            icon: iconKey,
            memberCount: 1,
        };
        saveBusinesses([...businesses, newBusiness]);
        hapticSuccess();
        setCreateModalVisible(false);
    };

    const removeBusiness = (businessId: string) => {
        saveBusinesses(businesses.filter((b) => b.id !== businessId));
        hapticError();
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

    const handleUpdateCurrency = (businessId: string, newCurrency: string) => {
        const updated = businesses.map((b) => (b.id === businessId ? { ...b, currency: newCurrency } : b));
        saveBusinesses(updated);
        setSheetBusiness((prev) => (prev ? { ...prev, currency: newCurrency } : null));
    };

    return (
        <View style={styles.container}>
            <View style={[s.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <View>
                    <Text style={[s.headerTitle, { color: theme.colors.onSurface }]}>
                        Cashbooks
                    </Text>
                    <Text style={[s.headerSub, { color: theme.colors.onSurfaceVariant }]}>
                        {businesses.length} book{businesses.length !== 1 ? "s" : ""}
                    </Text>
                </View>
            </View>

            <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: 100 }}>
                <SummaryStrip
                    businesses={businesses}
                    transactions={transactions}
                    theme={theme}
                    summaryStyles={summaryStl}
                />

                {businesses.map((biz, index) => {
                    const bizTx = transactions.filter((t) => t.businessId === biz.id);
                    const income = bizTx
                        .filter((t) => t.type === "income")
                        .reduce((a, t) => a + t.amount, 0);
                    const expense = bizTx
                        .filter((t) => t.type === "expense")
                        .reduce((a, t) => a + t.amount, 0);
                    const balance = income - expense;
                    const symbol = getCurrencySymbol(biz.currency);

                    const lastTx = [...bizTx].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )[0];
                    const lastDate = lastTx
                        ? formatRelativeDate(lastTx.date)
                        : "No activity";

                    return (
                        <AnimatedCard key={biz.id} index={index}>
                            <TouchableOpacity
                                style={s.card}
                                onPress={() => setSheetBusiness(biz)}
                                activeOpacity={0.7}
                            >
                                <View style={s.cardTop}>
                                    <View
                                        style={[
                                            s.cardIcon,
                                            {
                                                backgroundColor:
                                                    balance >= 0
                                                        ? theme.colors.incomeContainer
                                                        : theme.colors.surfaceContainerHigh,
                                            },
                                        ]}
                                    >
                                        <Wallet
                                            size={17}
                                            strokeWidth={2}
                                            color={
                                                balance >= 0
                                                    ? theme.colors.income
                                                    : theme.colors.onSurfaceVariant
                                            }
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.cardName, { color: theme.colors.onSurface }]}>
                                            {biz.name}
                                        </Text>
                                        <Text style={[s.cardMeta, { color: theme.colors.onSurfaceVariant }]}>
                                            {bizTx.length} txn{bizTx.length !== 1 ? "s" : ""}{" "}
                                            · {lastDate} · {biz.currency || "USD"}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <MoneyText
                                            amount={balance}
                                            symbol={symbol}
                                            sign={balance >= 0 ? "+" : "-"}
                                            size={14}
                                            color={
                                                balance >= 0
                                                    ? theme.colors.income
                                                    : theme.colors.onSurface
                                            }
                                        />
                                        <ActivityDots transactions={bizTx} theme={theme} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </AnimatedCard>
                    );
                })}
                {businesses.length === 0 && (
                    <View style={s.empty}>
                        <EmptyScene variant="cashbooks" size={224} />
                        <Text style={[s.emptyTitle, { color: theme.colors.onSurface }]}>
                            Create your first cashbook
                        </Text>
                        <Text style={[s.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                            Cashbooks help you track finances for different businesses or
                            accounts separately
                        </Text>
                        <TouchableOpacity
                            style={[s.emptyBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={() => setCreateModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Plus size={18} color={theme.colors.onPrimary} />
                            <Text style={s.emptyBtnText}>New Cashbook</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                style={s.fab}
                onPress={() => setCreateModalVisible(true)}
                activeOpacity={0.85}
            >
                <Plus size={22} color={theme.colors.onPrimary} />
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
                onUpdateCurrency={handleUpdateCurrency}
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

        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
        },
        headerTitle: {
            fontSize: 22,
            fontFamily: theme.fonts.semibold,
        },
        headerSub: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            marginTop: 2,
        },

        card: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 14,
            marginBottom: 10,
            padding: 13,
        },
        cardTop: {
            flexDirection: "row",
            alignItems: "center",
        },
        cardIcon: {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
        },
        cardName: { fontSize: 14, fontFamily: theme.fonts.semibold },
        cardMeta: { fontSize: 11, fontFamily: theme.fonts.regular, marginTop: 2 },

        empty: {
            padding: 40,
            alignItems: "center",
        },
        emptyIconOuter: {
            width: 96,
            height: 96,
            borderRadius: theme.shape.extraLarge,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
        },
        emptyIconInner: {
            width: 64,
            height: 64,
            borderRadius: theme.shape.large,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyTitle: {
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            marginBottom: 8,
        },
        emptyText: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 24,
            paddingHorizontal: 12,
        },
        emptyBtn: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 28,
            borderRadius: theme.shape.full,
            gap: 8,
            minHeight: 52,
        },
        emptyBtnText: {
            color: theme.colors.onPrimary,
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
        },

        fab: {
            position: "absolute",
            right: 20,
            bottom: 100,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
    });
