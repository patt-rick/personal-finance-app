import { useTheme } from "../theme/theme";
import { Business, Transaction, Category } from "../types";
import { getCurrencySymbol } from "../utils/_helpers";
import {
    Calendar,
    Car,
    Coffee,
    CreditCard,
    MinusIcon,
    MoreHorizontal,
    Plus,
    Search,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    ArrowLeft,
    Download,
    Tag,
} from "lucide-react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import React, { useState, useMemo, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    ToastAndroid,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { loadCategories, getBudgetByBusinessId } from "../utils/storage";
import { calculateBudgetData, getBudgetWarningMessage } from "../utils/budgetCalculations";
import ChartCarousel from "../components/ChartCarousel";
import WeeklyBarChart from "../components/dashboard/WeeklyBarChart";
import DonutChart from "../components/dashboard/DonutChart";
import TransactionEntryModal from "../components/TransactionEntryModal";
import TransactionDetailModal from "../components/TransactionDetailModal";
import DateRangePickerModal from "../components/DateRangePickerModal";

const CHART_COLORS = [
    "#6366F1",
    "#F59E0B",
    "#10B981",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
    "#06B6D4",
    "#84CC16",
];

export default function BusinessDetailView({
    business,
    transactions,
    allTransactions,
    onBack,
    saveTransactions,
}: {
    business: Business;
    transactions: Transaction[];
    allTransactions: Transaction[];
    onBack: () => void;
    saveTransactions: (t: Transaction[]) => void;
}) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = useMemo(() => createDashboardStyles(theme), [theme]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeModal, setActiveModal] = useState<"none" | "entry" | "detail">("none");
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [entryType, setEntryType] = useState<"income" | "expense">("income");
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [filterRange, setFilterRange] = useState<"all" | "today" | "week" | "month" | "custom">(
        "all",
    );
    const [categories, setCategories] = useState<Category[]>([]);
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    });
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showDateRangePicker, setShowDateRangePicker] = useState(false);

    useEffect(() => {
        loadCategories().then(setCategories);
    }, []);

    const filteredTransactionsByRange = useMemo(() => {
        let filtered = [...transactions];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (filterRange === "today") {
            filtered = filtered.filter((t) => new Date(t.date) >= today);
        } else if (filterRange === "week") {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            filtered = filtered.filter((t) => new Date(t.date) >= weekAgo);
        } else if (filterRange === "month") {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            filtered = filtered.filter((t) => new Date(t.date) >= monthAgo);
        } else if (filterRange === "custom") {
            filtered = filtered.filter((t) => {
                const td = new Date(t.date);
                return td >= customStartDate && td <= customEndDate;
            });
        }
        return filtered;
    }, [transactions, filterRange, customStartDate, customEndDate]);

    const filteredTransactions = filteredTransactionsByRange.filter(
        (t) =>
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.amount.toString().includes(searchQuery) ||
            t.category?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((acc, t) => acc + t.amount, 0);
    const totalBalance = totalIncome - totalExpense;
    const symbol = getCurrencySymbol(business.currency);

    const dailyChartData = useMemo(() => {
        const labels: string[] = [];
        const incomeValues: number[] = [];
        const expenseValues: number[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const dayIncome = transactions
                .filter((t) => {
                    const td = new Date(t.date);
                    return t.type === "income" && td >= dayStart && td < dayEnd;
                })
                .reduce((acc, t) => acc + t.amount, 0);

            const dayExpense = transactions
                .filter((t) => {
                    const td = new Date(t.date);
                    return t.type === "expense" && td >= dayStart && td < dayEnd;
                })
                .reduce((acc, t) => acc + t.amount, 0);

            labels.push(date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3));
            incomeValues.push(dayIncome);
            expenseValues.push(dayExpense);
        }
        return { labels, incomeValues, expenseValues };
    }, [transactions]);

    const categoryPieData = useMemo(() => {
        const catMap: Record<string, number> = {};
        transactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const cat = t.category || "Other";
                catMap[cat] = (catMap[cat] || 0) + t.amount;
            });
        const entries = Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
        const total = entries.reduce((sum, [, v]) => sum + v, 0);
        return {
            items: entries.map(([name, value], i) => ({
                value,
                color: CHART_COLORS[i % CHART_COLORS.length],
                label: name,
            })),
            total,
        };
    }, [transactions]);

    const groupedTransactions = useMemo(() => {
        const sorted = [...filteredTransactions].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const groups: { title: string; data: Transaction[] }[] = [];

        sorted.forEach((t) => {
            const date = new Date(t.date);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            let dateKey = date.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
            });
            if (date.toDateString() === today.toDateString()) dateKey = "Today";
            else if (date.toDateString() === yesterday.toDateString()) dateKey = "Yesterday";

            let group = groups.find((g) => g.title === dateKey);
            if (!group) {
                group = { title: dateKey, data: [] };
                groups.push(group);
            }
            group.data.push(t);
        });
        return groups;
    }, [filteredTransactions]);

    const checkBudgetWarning = async (categoryName: string, updatedTransactions: Transaction[]) => {
        try {
            const budget = await getBudgetByBusinessId(business.id);
            if (!budget) return;

            const budgetData = calculateBudgetData(budget, updatedTransactions, categories);
            const categoryId = categories.find((c) => c.name === categoryName)?.id;
            if (!categoryId) return;

            const categoryBudget = budgetData.find((b) => b.categoryId === categoryId);
            if (!categoryBudget) return;

            const message = getBudgetWarningMessage(
                categoryBudget.categoryName,
                categoryBudget.remaining,
                categoryBudget.percentage,
                symbol,
            );

            if (message) {
                if (Platform.OS === "android") {
                    ToastAndroid.show(message, ToastAndroid.LONG);
                } else {
                    Alert.alert("Budget Update", message);
                }
            }
        } catch (error) {
            console.error("Error checking budget:", error);
        }
    };

    const handleEntrySubmit = async (data: {
        amount: number;
        category: string;
        remark: string;
        entryType: "income" | "expense";
        editingTxId: string | null;
    }) => {
        let updatedTransactions: Transaction[];

        if (data.editingTxId) {
            updatedTransactions = allTransactions.map((t) => {
                if (t.id === data.editingTxId) {
                    return {
                        ...t,
                        amount: data.amount,
                        description: data.entryType === "income" ? "Cash In" : "Cash Out",
                        type: data.entryType,
                        category: data.category,
                        remark: data.remark,
                    };
                }
                return t;
            });
        } else {
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                description: data.entryType === "income" ? "Cash In" : "Cash Out",
                amount: data.amount,
                date: new Date().toISOString(),
                type: data.entryType,
                businessId: business.id,
                category: data.category,
                paymentMode: "Cash",
                remark: data.remark,
            };
            updatedTransactions = [...allTransactions, newTransaction];
        }

        saveTransactions(updatedTransactions);

        if (data.entryType === "expense") {
            await checkBudgetWarning(data.category, updatedTransactions);
        }

        setEditingTx(null);
        setActiveModal("none");
    };

    const handleStartEdit = () => {
        if (!selectedTx) return;
        setEntryType(selectedTx.type);
        setEditingTx(selectedTx);
        setActiveModal("entry");
    };

    const handleDeleteTx = (id: string) => {
        Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    saveTransactions(allTransactions.filter((t) => t.id !== id));
                    setActiveModal("none");
                },
            },
        ]);
    };

    const exportToCSV = async () => {
        if (filteredTransactions.length === 0) {
            Alert.alert("No transactions", "There are no transactions to export.");
            return;
        }

        try {
            const header = "Date,Type,Amount,Description,Category,Remark\n";
            const rows = filteredTransactions
                .map((t) => {
                    const date = new Date(t.date).toLocaleDateString();
                    return `${date},${t.type},${t.amount},"${(t.description || "").replace(/"/g, '""')}",${t.category || ""},"${(t.remark || "").replace(/"/g, '""')}"`;
                })
                .join("\n");

            const csvContent = header + rows;
            const fileName = `transactions_${business.name.replace(/\s+/g, "_")}_${filterRange}_${Date.now()}.csv`;
            const fileUri = FileSystem.cacheDirectory + fileName;

            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: "text/csv",
                    dialogTitle: "Export Transactions",
                    UTI: "public.comma-separated-values-text",
                });
            } else {
                Alert.alert("Error", "Sharing is not available on this device");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to export CSV");
        }
    };

    const localGetCategoryIcon = (categoryName: string | undefined, color: string) => {
        if (!categoryName) return <Tag size={20} color={color} />;
        const name = categoryName.toLowerCase();
        if (name.includes("shop")) return <ShoppingBag size={20} color={color} />;
        if (name.includes("food")) return <Coffee size={20} color={color} />;
        if (name.includes("trans")) return <Car size={20} color={color} />;
        return <Tag size={20} color={color} />;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
        >
            <View style={styles.container}>
                <View style={[styles.detailHeader, { paddingTop: Math.max(insets.top, 40) }]}>
                    <TouchableOpacity onPress={onBack} style={styles.detailBackBtn}>
                        <ArrowLeft size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.detailTitle}>{business.name}</Text>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <BalanceCard
                        symbol={symbol}
                        totalBalance={totalBalance}
                        currency={business.currency}
                        styles={styles}
                    />

                    <IncomeExpenseCards
                        symbol={symbol}
                        totalIncome={totalIncome}
                        totalExpense={totalExpense}
                        theme={theme}
                        styles={styles}
                    />

                    {transactions.length > 0 && (
                        <ChartCarousel
                            pages={[
                                {
                                    title: "Daily Cash Flow",
                                    legend: [
                                        { label: "In", color: theme.colors.income },
                                        { label: "Out", color: theme.colors.expense },
                                    ],
                                    content: (
                                        <WeeklyBarChart
                                            labels={dailyChartData.labels}
                                            incomeData={dailyChartData.incomeValues}
                                            expenseData={dailyChartData.expenseValues}
                                            currencySymbol={symbol}
                                            incomeColor={theme.colors.income}
                                            expenseColor={theme.colors.expense}
                                        />
                                    ),
                                },
                                ...(categoryPieData.items.length > 0
                                    ? [
                                          {
                                              title: "Expense Categories",
                                              content: (
                                                  <DonutChart
                                                      data={categoryPieData.items}
                                                      total={categoryPieData.total}
                                                      currencySymbol={symbol}
                                                  />
                                              ),
                                          },
                                      ]
                                    : []),
                            ]}
                        />
                    )}

                    <View style={styles.detailSearchContainer}>
                        <Search size={18} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.detailSearchInput}
                            placeholder="Search transactions..."
                            placeholderTextColor={theme.colors.placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.filterBar}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.filterRangeScroll}
                        >
                            {(["all", "today", "week", "month"] as const).map((range) => (
                                <TouchableOpacity
                                    key={range}
                                    onPress={() => setFilterRange(range)}
                                    style={[
                                        styles.filterChip,
                                        {
                                            backgroundColor:
                                                filterRange === range
                                                    ? theme.colors.primary
                                                    : theme.colors.card,
                                            borderColor:
                                                filterRange === range
                                                    ? theme.colors.primary
                                                    : theme.colors.borderLight,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            {
                                                color:
                                                    filterRange === range
                                                        ? "white"
                                                        : theme.colors.textSecondary,
                                            },
                                        ]}
                                    >
                                        {range}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                onPress={() => setShowDateRangePicker(true)}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor:
                                            filterRange === "custom"
                                                ? theme.colors.primary
                                                : theme.colors.card,
                                        borderColor:
                                            filterRange === "custom"
                                                ? theme.colors.primary
                                                : theme.colors.borderLight,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 4,
                                    },
                                ]}
                            >
                                <Calendar
                                    size={12}
                                    color={
                                        filterRange === "custom"
                                            ? "white"
                                            : theme.colors.textSecondary
                                    }
                                />
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        {
                                            color:
                                                filterRange === "custom"
                                                    ? "white"
                                                    : theme.colors.textSecondary,
                                        },
                                    ]}
                                >
                                    {filterRange === "custom"
                                        ? `${customStartDate.toLocaleDateString(undefined, { day: "numeric", month: "short" })} - ${customEndDate.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                                        : "custom"}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <TouchableOpacity onPress={exportToCSV} style={styles.exportBtn}>
                            <Download size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.detailList}>
                        <Text style={styles.listLabel}>Recent Transactions</Text>

                        {groupedTransactions.map((group) => (
                            <View key={group.title} style={{ marginBottom: 20 }}>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "500",
                                        color: theme.colors.textSecondary,
                                        marginBottom: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    {group.title}
                                </Text>
                                {group.data.map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={styles.modernTxItem}
                                        onPress={() => {
                                            setSelectedTx(t);
                                            setActiveModal("detail");
                                        }}
                                    >
                                        <View
                                            style={[
                                                styles.txIconContainer,
                                                {
                                                    backgroundColor:
                                                        t.type === "income"
                                                            ? theme.colors.incomeBg
                                                            : theme.colors.expenseBg,
                                                },
                                            ]}
                                        >
                                            {localGetCategoryIcon(
                                                t.category,
                                                t.type === "income"
                                                    ? theme.colors.income
                                                    : theme.colors.expense,
                                            )}
                                        </View>
                                        <View style={styles.txInfo}>
                                            <Text style={styles.txTitle}>
                                                {t.remark || t.description}
                                            </Text>
                                            <Text style={styles.txSubTitle}>
                                                {t.category || "General"} ·{" "}
                                                {new Date(t.date).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </Text>
                                        </View>
                                        <View style={styles.txRight}>
                                            <Text
                                                style={[
                                                    styles.txAmountModern,
                                                    t.type === "income"
                                                        ? { color: theme.colors.success }
                                                        : { color: theme.colors.error },
                                                ]}
                                            >
                                                {t.type === "income" ? "+" : "-"}
                                                {symbol}
                                                {t.amount.toLocaleString()}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}

                        {groupedTransactions.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No transactions found</Text>
                            </View>
                        )}
                        <View style={{ height: 120 }} />
                    </View>
                </ScrollView>

                <View
                    style={[
                        styles.modernBottomActions,
                        { paddingBottom: Math.max(insets.bottom, 20) },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.bigActionBtnModern,
                            { backgroundColor: theme.colors.income },
                        ]}
                        onPress={() => {
                            setEntryType("income");
                            setEditingTx(null);
                            setActiveModal("entry");
                        }}
                    >
                        <Text style={[styles.bigActionBtnTextModern, { color: "white" }]}>
                            CASH IN
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.bigActionBtnModern,
                            { backgroundColor: theme.colors.expense },
                        ]}
                        onPress={() => {
                            setEntryType("expense");
                            setEditingTx(null);
                            setActiveModal("entry");
                        }}
                    >
                        <Text style={[styles.bigActionBtnTextModern, { color: "white" }]}>
                            CASH OUT
                        </Text>
                    </TouchableOpacity>
                </View>

                <TransactionEntryModal
                    visible={activeModal === "entry"}
                    entryType={entryType}
                    editingTx={editingTx}
                    categories={categories}
                    symbol={symbol}
                    onClose={() => {
                        setActiveModal("none");
                        setEditingTx(null);
                    }}
                    onSubmit={handleEntrySubmit}
                />

                <TransactionDetailModal
                    visible={activeModal === "detail"}
                    transaction={selectedTx}
                    symbol={symbol}
                    onClose={() => setActiveModal("none")}
                    onEdit={handleStartEdit}
                    onDelete={handleDeleteTx}
                />

                <DateRangePickerModal
                    visible={showDateRangePicker}
                    startDate={customStartDate}
                    endDate={customEndDate}
                    onApply={(start, end) => {
                        setCustomStartDate(start);
                        setCustomEndDate(end);
                        setFilterRange("custom");
                        setShowDateRangePicker(false);
                    }}
                    onClose={() => setShowDateRangePicker(false)}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

function BalanceCard({
    symbol,
    totalBalance,
    currency,
    styles,
}: {
    symbol: string;
    totalBalance: number;
    currency?: string;
    styles: any;
}) {
    return (
        <LinearGradient
            colors={["#1B1E2F", "#2A2F4F", "#1A1D2B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modernBalanceCard}
        >
            <View style={styles.cardGlow} />
            <View style={styles.balanceHeader}>
                <Text style={styles.balanceTitle}>
                    {symbol}
                    {totalBalance.toLocaleString()}
                </Text>
            </View>
            <Text style={styles.balanceSubtitle}>Current Balance</Text>
            <View style={styles.cardFooter}>
                <Text style={styles.cardNumber}>{currency} Cashbook</Text>
                <View style={styles.mastercardLogo}>
                    <View style={[styles.circle, { backgroundColor: "#EB001B" }]} />
                    <View
                        style={[styles.circle, { backgroundColor: "#F79E1B", marginLeft: -10 }]}
                    />
                </View>
            </View>
        </LinearGradient>
    );
}

function IncomeExpenseCards({
    symbol,
    totalIncome,
    totalExpense,
    theme,
    styles,
}: {
    symbol: string;
    totalIncome: number;
    totalExpense: number;
    theme: any;
    styles: any;
}) {
    return (
        <View style={styles.statsContainer}>
            <View style={[styles.statCardFixed, { backgroundColor: theme.colors.incomeBg }]}>
                <View style={[styles.statIconContainer, { backgroundColor: theme.colors.income }]}>
                    <Plus size={20} color="white" />
                </View>
                <Text style={styles.statLabel}>Total In</Text>
                <Text style={styles.statValue}>
                    {symbol}
                    {totalIncome.toLocaleString()}
                </Text>
            </View>
            <View style={[styles.statCardFixed, { backgroundColor: theme.colors.expenseBg }]}>
                <View style={[styles.statIconContainer, { backgroundColor: theme.colors.expense }]}>
                    <MinusIcon size={20} color="white" />
                </View>
                <Text style={styles.statLabel}>Total Out</Text>
                <Text style={styles.statValue}>
                    {symbol}
                    {totalExpense.toLocaleString()}
                </Text>
            </View>
        </View>
    );
}

export const getCategoryIcon = (category: string | undefined, color: string) => {
    switch (category?.toLowerCase()) {
        case "shopping":
            return <ShoppingBag size={20} color={color} />;
        case "insurance":
            return <ShieldCheck size={20} color={color} />;
        case "food":
            return <Coffee size={20} color={color} />;
        case "transport":
            return <Car size={20} color={color} />;
        case "bills":
            return <Smartphone size={20} color={color} />;
        case "salary":
            return <CreditCard size={20} color={color} />;
        default:
            return <MoreHorizontal size={20} color={color} />;
    }
};
