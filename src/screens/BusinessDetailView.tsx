import { useTheme } from "../theme/theme";
import { Business, Transaction, Category, Budget } from "../types";
import { getCurrencySymbol } from "../utils/_helpers";
import {
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
    X,
    Calendar,
    Tag,
    Info,
    Trash2,
    MessageSquare,
    ArrowLeft,
    Pencil,
    Download,
    Filter,
    Trash,
} from "lucide-react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import React, { useState, useMemo, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ToastAndroid,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { loadCategories, getBudgetByBusinessId } from "../utils/storage";
import { calculateBudgetData, getBudgetWarningMessage } from "../utils/budgetCalculations";
import { BarChart, PieChart } from "react-native-gifted-charts";
import ChartCarousel from "../components/ChartCarousel";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CHART_COLORS = [
    "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#06B6D4", "#84CC16",
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
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [entryType, setEntryType] = useState<"income" | "expense">("income");
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Others");
    const [filterRange, setFilterRange] = useState<"all" | "today" | "week" | "month">("all");
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await loadCategories();
        setCategories(data);
    };

    const filteredTransactionsByRange = useMemo(() => {
        let filtered = [...transactions];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (filterRange === "today") {
            filtered = filtered.filter((t) => {
                const d = new Date(t.date);
                return d >= today;
            });
        } else if (filterRange === "week") {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            filtered = filtered.filter((t) => new Date(t.date) >= weekAgo);
        } else if (filterRange === "month") {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            filtered = filtered.filter((t) => new Date(t.date) >= monthAgo);
        }
        return filtered;
    }, [transactions, filterRange]);

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

    // --- Chart data: Daily bar chart for last 7 days ---
    const dailyBarData = useMemo(() => {
        const days = [];
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

            const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
            days.push(
                { value: dayIncome, label: dayLabel, spacing: 4, labelWidth: 32, labelTextStyle: { color: theme.colors.textSecondary, fontSize: 10 }, frontColor: "#6366F1" },
                { value: dayExpense, frontColor: "#F59E0B" },
            );
        }
        return days;
    }, [transactions, theme]);

    // --- Chart data: Category donut ---
    const categoryPieData = useMemo(() => {
        const catMap: Record<string, number> = {};
        transactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const cat = t.category || "Other";
                catMap[cat] = (catMap[cat] || 0) + t.amount;
            });
        return Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value], i) => ({
                value,
                color: CHART_COLORS[i % CHART_COLORS.length],
                text: name,
            }));
    }, [transactions]);

    /* Group transactions by date */
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

    const handleAddEntry = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }

        if (editingTxId) {
            // Update existing transaction
            const updatedTransactions = allTransactions.map((t) => {
                if (t.id === editingTxId) {
                    return {
                        ...t,
                        amount: parseFloat(amount),
                        description: entryType === "income" ? "Cash In" : "Cash Out",
                        type: entryType,
                        category: selectedCategory,
                        remark: remark,
                    };
                }
                return t;
            });
            saveTransactions(updatedTransactions);

            // Check budget and show notification for expenses
            if (entryType === "expense") {
                try {
                    const budget = await getBudgetByBusinessId(business.id);
                    if (budget) {
                        const budgetData = calculateBudgetData(
                            budget,
                            updatedTransactions,
                            categories,
                        );

                        // Find the category budget
                        const categoryId = categories.find((c) => c.name === selectedCategory)?.id;

                        if (categoryId) {
                            const categoryBudget = budgetData.find(
                                (b) => b.categoryId === categoryId,
                            );

                            if (categoryBudget) {
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
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error checking budget:", error);
                }
            }

            setEditingTxId(null);
        } else {
            // Create new transaction
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                description: entryType === "income" ? "Cash In" : "Cash Out",
                amount: parseFloat(amount),
                date: new Date().toISOString(),
                type: entryType,
                businessId: business.id,
                category: selectedCategory,
                paymentMode: "Cash",
                remark: remark,
            };
            saveTransactions([...allTransactions, newTransaction]);

            // Check budget and show notification for expenses
            if (entryType === "expense") {
                try {
                    const budget = await getBudgetByBusinessId(business.id);
                    if (budget) {
                        const budgetData = calculateBudgetData(
                            budget,
                            [...allTransactions, newTransaction],
                            categories,
                        );

                        // Find the category budget
                        const categoryId = categories.find((c) => c.name === selectedCategory)?.id;

                        if (categoryId) {
                            const categoryBudget = budgetData.find(
                                (b) => b.categoryId === categoryId,
                            );

                            if (categoryBudget) {
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
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error checking budget:", error);
                }
            }
        }

        setAmount("");
        setRemark("");
        setActiveModal("none");
    };

    const handleStartEdit = () => {
        if (!selectedTx) return;
        setEntryType(selectedTx.type);
        setAmount(selectedTx.amount.toString());
        setSelectedCategory(selectedTx.category || "Others");
        setRemark(selectedTx.remark || "");
        setEditingTxId(selectedTx.id);
        setActiveModal("entry");
    };

    const handeCloseModal = () => {
        setActiveModal("none");
        setEditingTxId(null);
        setAmount("");
        setRemark("");
    };

    const handleDeleteTx = (id: string) => {
        Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    const updated = allTransactions.filter((t) => t.id !== id);
                    saveTransactions(updated);
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

    // Helper to get icon based on category name
    const getCategoryIcon = (categoryName: string | undefined, color: string) => {
        if (!categoryName) return <Tag size={20} color={color} />;

        // Simple mapping based on name
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
                {/* Detail Header */}
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
                    {/* Balance Card */}
                    <LinearGradient
                        colors={[
                            "#1B1E2F", // deep navy
                            "#2A2F4F", // soft mid
                            "#1A1D2B", // dark edge
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modernBalanceCard}
                    >
                        {/* Soft highlight */}
                        <View style={styles.cardGlow} />

                        <View style={styles.balanceHeader}>
                            <Text style={styles.balanceTitle}>
                                {symbol}
                                {totalBalance.toLocaleString()}
                            </Text>
                            <MoreHorizontal color="white" size={24} />
                        </View>

                        <Text style={styles.balanceSubtitle}>Current Balance</Text>

                        <View style={styles.cardFooter}>
                            <Text style={styles.cardNumber}>{business.currency} Cashbook</Text>

                            <View style={styles.mastercardLogo}>
                                <View style={[styles.circle, { backgroundColor: "#EB001B" }]} />
                                <View
                                    style={[
                                        styles.circle,
                                        { backgroundColor: "#F79E1B", marginLeft: -10 },
                                    ]}
                                />
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Income/Expense Cards */}
                    <View style={styles.statsContainer}>
                        <View
                            style={[
                                styles.statCardFixed,
                                { backgroundColor: theme.colors.incomeBg },
                            ]}
                        >
                            <View
                                style={[
                                    styles.statIconContainer,
                                    { backgroundColor: theme.colors.income },
                                ]}
                            >
                                <Plus size={20} color="white" />
                            </View>
                            <Text style={styles.statLabel}>Total In</Text>
                            <Text style={styles.statValue}>
                                {symbol}
                                {totalIncome.toLocaleString()}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.statCardFixed,
                                { backgroundColor: theme.colors.expenseBg },
                            ]}
                        >
                            <View
                                style={[
                                    styles.statIconContainer,
                                    { backgroundColor: theme.colors.expense },
                                ]}
                            >
                                <MinusIcon size={20} color="white" />
                            </View>
                            <Text style={styles.statLabel}>Total Out</Text>
                            <Text style={styles.statValue}>
                                {symbol}
                                {totalExpense.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Analytics Charts Carousel */}
                    {transactions.length > 0 && (
                        <ChartCarousel
                            pages={[
                                {
                                    title: "Daily Cash Flow",
                                    legend: [
                                        { label: "In", color: "#6366F1" },
                                        { label: "Out", color: "#F59E0B" },
                                    ],
                                    content: (
                                        <BarChart
                                            data={dailyBarData}
                                            barWidth={10}
                                            spacing={14}
                                            roundedTop
                                            roundedBottom
                                            xAxisThickness={0}
                                            yAxisThickness={0}
                                            yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 9 }}
                                            noOfSections={4}
                                            height={120}
                                            width={SCREEN_WIDTH - 100}
                                            hideRules
                                            isAnimated
                                        />
                                    ),
                                },
                                ...(categoryPieData.length > 0
                                    ? [
                                          {
                                              title: "Expense Categories",
                                              content: (
                                                  <View style={bdvStyles.pieRow}>
                                                      <PieChart
                                                          data={categoryPieData}
                                                          donut
                                                          radius={55}
                                                          innerRadius={35}
                                                          innerCircleColor={theme.colors.card}
                                                          centerLabelComponent={() => (
                                                              <View style={{ alignItems: "center" }}>
                                                                  <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>
                                                                      {symbol}{totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                  </Text>
                                                                  <Text style={{ fontSize: 9, color: theme.colors.textSecondary }}>Total</Text>
                                                              </View>
                                                          )}
                                                      />
                                                      <View style={bdvStyles.pieLegend}>
                                                          {categoryPieData.map((item, index) => (
                                                              <View key={index} style={bdvStyles.pieLegendRow}>
                                                                  <View style={[bdvStyles.legendDot, { backgroundColor: item.color }]} />
                                                                  <Text style={[bdvStyles.pieLegendText, { color: theme.colors.text }]} numberOfLines={1}>
                                                                      {item.text}
                                                                  </Text>
                                                                  <Text style={[bdvStyles.pieLegendAmt, { color: theme.colors.textSecondary }]}>
                                                                      {symbol}{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                  </Text>
                                                              </View>
                                                          ))}
                                                      </View>
                                                  </View>
                                              ),
                                          },
                                      ]
                                    : []),
                            ]}
                        />
                    )}

                    {/* Search Input */}
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

                    {/* Filter & Export Bar */}
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
                        </ScrollView>

                        <TouchableOpacity onPress={exportToCSV} style={styles.exportBtn}>
                            <Download size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Transaction List */}
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
                                            {getCategoryIcon(
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

                {/* Bottom Actions */}
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
                            setEditingTxId(null);
                            setAmount("");
                            setRemark("");
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
                            setEditingTxId(null);
                            setAmount("");
                            setRemark("");
                            setActiveModal("entry");
                        }}
                    >
                        <Text style={[styles.bigActionBtnTextModern, { color: "white" }]}>
                            CASH OUT
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Entry Modal */}
                <Modal visible={activeModal === "entry"} animationType="slide" transparent>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1 }}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContentModern}>
                                    <View style={styles.modalHeaderModern}>
                                        <Text style={styles.modalTitleModern}>
                                            {editingTxId
                                                ? "Edit Transaction"
                                                : entryType === "income"
                                                  ? "New Income"
                                                  : "New Expense"}
                                        </Text>
                                        <TouchableOpacity onPress={handeCloseModal}>
                                            <X size={24} color={theme.colors.text} />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.inputLabelModern}>Amount ({symbol})</Text>
                                    <TextInput
                                        style={styles.modalInputLargeModern}
                                        placeholder="0.00"
                                        placeholderTextColor={theme.colors.placeholder}
                                        keyboardType="decimal-pad"
                                        value={amount}
                                        onChangeText={setAmount}
                                        autoFocus
                                    />

                                    <Text style={styles.inputLabelModern}>Category</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.categoryPicker}
                                    >
                                        {categories
                                            .filter((c) => c.type === entryType)
                                            .map((cat) => (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    style={[
                                                        styles.categoryChip,
                                                        selectedCategory === cat.name &&
                                                            styles.categoryChipActive,
                                                    ]}
                                                    onPress={() => setSelectedCategory(cat.name)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.categoryChipText,
                                                            selectedCategory === cat.name &&
                                                                styles.categoryChipTextActive,
                                                        ]}
                                                    >
                                                        {cat.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                    </ScrollView>

                                    <Text style={styles.inputLabelModern}>Remark</Text>
                                    <TextInput
                                        style={styles.modalInputModern}
                                        placeholder="What was this for?"
                                        placeholderTextColor={theme.colors.placeholder}
                                        value={remark}
                                        onChangeText={setRemark}
                                    />

                                    <TouchableOpacity
                                        style={[
                                            styles.submitBtnModern,
                                            {
                                                backgroundColor:
                                                    entryType === "income"
                                                        ? theme.colors.income
                                                        : theme.colors.expense,
                                            },
                                        ]}
                                        onPress={handleAddEntry}
                                    >
                                        <Text style={styles.submitBtnTextModern}>Save Entry</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Transaction Detail Modal */}
                <Modal visible={activeModal === "detail"} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.txDetailCard}>
                            <TouchableOpacity
                                style={{ alignSelf: "flex-end", padding: 10, marginTop: -10 }}
                                onPress={() => setActiveModal("none")}
                            >
                                <X size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>

                            {selectedTx && (
                                <>
                                    <View style={styles.txDetailHeader}>
                                        <View
                                            style={[
                                                styles.txDetailTypeBadge,
                                                {
                                                    backgroundColor:
                                                        selectedTx.type === "income"
                                                            ? theme.colors.success + "20"
                                                            : theme.colors.error + "20",
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        selectedTx.type === "income"
                                                            ? theme.colors.success
                                                            : theme.colors.error,
                                                    fontWeight: "bold",
                                                    fontSize: 12,
                                                }}
                                            >
                                                {selectedTx.type.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.txDetailAmount}>
                                            {selectedTx.type === "income" ? "+" : "-"}
                                            {symbol}
                                            {selectedTx.amount.toLocaleString()}
                                        </Text>
                                        <Text style={styles.txDetailDescription}>
                                            {selectedTx.description}
                                        </Text>
                                    </View>

                                    <View style={styles.txDetailInfoSection}>
                                        <View style={styles.txDetailRow}>
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 10,
                                                }}
                                            >
                                                <Tag size={18} color={theme.colors.textSecondary} />
                                                <Text style={styles.txDetailLabel}>Category</Text>
                                            </View>
                                            <Text style={styles.txDetailValue}>
                                                {selectedTx.category}
                                            </Text>
                                        </View>

                                        <View style={styles.txDetailRow}>
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 10,
                                                }}
                                            >
                                                <Calendar
                                                    size={18}
                                                    color={theme.colors.textSecondary}
                                                />
                                                <Text style={styles.txDetailLabel}>
                                                    Date & Time
                                                </Text>
                                            </View>
                                            <Text style={styles.txDetailValue}>
                                                {new Date(selectedTx.date).toLocaleDateString()}{" "}
                                                {new Date(selectedTx.date).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </Text>
                                        </View>

                                        <View style={styles.txDetailRow}>
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 10,
                                                }}
                                            >
                                                <Info
                                                    size={18}
                                                    color={theme.colors.textSecondary}
                                                />
                                                <Text style={styles.txDetailLabel}>Mode</Text>
                                            </View>
                                            <Text style={styles.txDetailValue}>
                                                {selectedTx.paymentMode || "Cash"}
                                            </Text>
                                        </View>

                                        {selectedTx.remark ? (
                                            <View
                                                style={[
                                                    styles.txDetailRow,
                                                    { alignItems: "flex-start" },
                                                ]}
                                            >
                                                <View
                                                    style={{
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 10,
                                                    }}
                                                >
                                                    <MessageSquare
                                                        size={18}
                                                        color={theme.colors.textSecondary}
                                                    />
                                                    <Text style={styles.txDetailLabel}>Remark</Text>
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.txDetailValue,
                                                        {
                                                            flex: 1,
                                                            textAlign: "right",
                                                            marginLeft: 20,
                                                        },
                                                    ]}
                                                >
                                                    {selectedTx.remark}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>

                                    <View style={styles.txDetailActions}>
                                        <TouchableOpacity
                                            style={styles.txDetailDeleteBtn}
                                            onPress={() => handleDeleteTx(selectedTx.id)}
                                        >
                                            <Text
                                                style={{
                                                    color: theme.colors.error,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                <Trash size={20} color={theme.colors.error} />
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.txDetailDeleteBtn,
                                                { borderColor: theme.colors.primary },
                                            ]}
                                            onPress={handleStartEdit}
                                        >
                                            <Text
                                                style={{
                                                    color: theme.colors.primary,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                <Pencil size={20} color={theme.colors.primary} />
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.txDetailCloseBtn}
                                            onPress={() => setActiveModal("none")}
                                        >
                                            <Text style={{ color: "white", fontWeight: "bold" }}>
                                                Done
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    );
}

const bdvStyles = StyleSheet.create({
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pieRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    pieLegend: {
        flex: 1,
        marginLeft: 16,
        gap: 6,
    },
    pieLegendRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    pieLegendText: {
        fontSize: 12,
        fontWeight: "600",
        flex: 1,
    },
    pieLegendAmt: {
        fontSize: 11,
    },
});

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
