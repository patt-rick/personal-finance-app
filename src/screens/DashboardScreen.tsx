import { getCurrencySymbol } from "../utils/_helpers";
import { Users } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { Business, Transaction, UserProfile } from "../types";
import BusinessDetailView from "./BusinessDetailView";
import BalanceCard, { CurrencyBalance } from "../components/dashboard/BalanceCard";
import ChartCarousel from "../components/ChartCarousel";
import WeeklyBarChart from "../components/dashboard/WeeklyBarChart";
import DonutChart from "../components/dashboard/DonutChart";

function DashboardHome({
    businesses,
    transactions,
    setCurrentBusiness,
    userProfile,
}: {
    businesses: Business[];
    transactions: Transaction[];
    setCurrentBusiness: (b: Business) => void;
    userProfile: UserProfile | null;
}) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    const currencyBalances = useMemo<CurrencyBalance[]>(() => {
        const map: Record<string, { income: number; expense: number }> = {};
        const bizCurrencyMap: Record<string, string> = {};
        for (const biz of businesses) {
            bizCurrencyMap[biz.id] = biz.currency || "USD";
        }
        for (const t of transactions) {
            const c = bizCurrencyMap[t.businessId] || "USD";
            if (!map[c]) map[c] = { income: 0, expense: 0 };
            if (t.type === "income") map[c].income += t.amount;
            else map[c].expense += t.amount;
        }
        const keys = Object.keys(map);
        if (keys.length === 0) return [{ currency: "USD", income: 0, expense: 0, balance: 0 }];
        return keys.map((c) => ({
            currency: c,
            income: map[c].income,
            expense: map[c].expense,
            balance: map[c].income - map[c].expense,
        }));
    }, [businesses, transactions]);

    const [activeCurrencyIndex, setActiveCurrencyIndex] = useState(0);
    const activeCurrency = currencyBalances[activeCurrencyIndex] ?? currencyBalances[0];

    const activeBizIds = useMemo(() => {
        const currency = activeCurrency.currency;
        return new Set(
            businesses.filter((b) => (b.currency || "USD") === currency).map((b) => b.id),
        );
    }, [businesses, activeCurrency.currency]);

    const filteredTransactions = useMemo(
        () => transactions.filter((t) => activeBizIds.has(t.businessId)),
        [transactions, activeBizIds],
    );

    const weeklyGrowth = useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const thisWeekNet = filteredTransactions
            .filter((t) => new Date(t.date) >= weekAgo)
            .reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount), 0);
        const lastWeekNet = filteredTransactions
            .filter((t) => {
                const d = new Date(t.date);
                return d >= twoWeeksAgo && d < weekAgo;
            })
            .reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount), 0);

        if (lastWeekNet === 0) return 0;
        return ((thisWeekNet - lastWeekNet) / Math.abs(lastWeekNet)) * 100;
    }, [filteredTransactions]);

    const weeklyChartData = useMemo(() => {
        const labels: string[] = [];
        const incomeValues: number[] = [];
        const expenseValues: number[] = [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const dayIncome = filteredTransactions
                .filter((t) => {
                    const td = new Date(t.date);
                    return t.type === "income" && td >= dayStart && td < dayEnd;
                })
                .reduce((acc, t) => acc + t.amount, 0);

            const dayExpense = filteredTransactions
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
    }, [filteredTransactions]);

    const currencySymbol = getCurrencySymbol(activeCurrency.currency);

    const pieData = useMemo(() => {
        const income = filteredTransactions
            .filter((t) => t.type === "income")
            .reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTransactions
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => acc + t.amount, 0);
        const total = income + expense;

        const items = [
            { value: income, color: theme.colors.income, label: "Income" },
            { value: expense, color: theme.colors.expense, label: "Expense" },
        ].filter((d) => d.value > 0);

        return { items, total };
    }, [filteredTransactions]);

    const chartPages = useMemo(() => {
        const pages: {
            title: string;
            legend?: { label: string; color: string }[];
            content: React.ReactNode;
        }[] = [];

        if (filteredTransactions.length > 0) {
            pages.push({
                title: "Last 7 Days",
                legend: [
                    { label: "Income", color: theme.colors.income },
                    { label: "Expense", color: theme.colors.expense },
                ],
                content: (
                    <WeeklyBarChart
                        labels={weeklyChartData.labels}
                        incomeData={weeklyChartData.incomeValues}
                        expenseData={weeklyChartData.expenseValues}
                        currencySymbol={currencySymbol}
                        incomeColor={theme.colors.income}
                        expenseColor={theme.colors.expense}
                    />
                ),
            });
        }

        if (pieData.items.length > 0) {
            pages.push({
                title: "Income vs Expense",
                content: (
                    <DonutChart
                        data={pieData.items}
                        total={pieData.total}
                        currencySymbol={currencySymbol}
                    />
                ),
            });
        }

        return pages;
    }, [filteredTransactions, weeklyChartData, pieData, theme, currencySymbol]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <View>
                    <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
                        Welcome back,
                    </Text>
                    <Text style={[styles.userName, { color: theme.colors.text }]}>
                        {userProfile?.name || "John Doe"}
                    </Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <BalanceCard
                    currencies={currencyBalances}
                    weeklyGrowth={weeklyGrowth}
                    onPageChange={setActiveCurrencyIndex}
                />

                {chartPages.length > 0 && <ChartCarousel pages={chartPages} />}

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Your Cashbooks
                    </Text>
                    <Text style={[styles.sectionCount, { color: theme.colors.textSecondary }]}>
                        {businesses.length} total
                    </Text>
                </View>

                <View style={styles.cashbooksList}>
                    {businesses.map((business) => {
                        const bizTx = transactions.filter((t) => t.businessId === business.id);
                        const balance = bizTx.reduce(
                            (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
                            0,
                        );
                        const symbol = getCurrencySymbol(business.currency);
                        const txCount = bizTx.length;

                        return (
                            <TouchableOpacity
                                key={business.id}
                                style={[
                                    styles.cashbookItem,
                                    { backgroundColor: theme.colors.card },
                                ]}
                                onPress={() => setCurrentBusiness(business)}
                            >
                                <View
                                    style={[
                                        styles.cashbookIcon,
                                        { backgroundColor: theme.colors.surface },
                                    ]}
                                >
                                    <Users size={20} color={theme.colors.text} />
                                </View>
                                <View style={styles.cashbookInfo}>
                                    <Text
                                        style={[styles.cashbookName, { color: theme.colors.text }]}
                                    >
                                        {business.name}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.cashbookMeta,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        {txCount} transaction
                                        {txCount !== 1 ? "s" : ""} · {business.currency || "USD"}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.cashbookBalance,
                                        {
                                            color:
                                                balance >= 0
                                                    ? theme.colors.success
                                                    : theme.colors.error,
                                        },
                                    ]}
                                >
                                    {balance >= 0 ? "+" : "-"}
                                    {symbol}
                                    {Math.abs(balance).toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {businesses.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <View
                                style={[
                                    styles.emptyIcon,
                                    { backgroundColor: theme.colors.surface },
                                ]}
                            >
                                <Users size={40} color={theme.colors.textSecondary} />
                            </View>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                                Go to Cashbooks tab to add your first business!
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    userName: {
        fontSize: 26,
        fontWeight: "800",
        marginTop: 2,
        letterSpacing: -0.3,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: "500",
    },
    cashbooksList: {
        paddingHorizontal: 20,
    },
    cashbookItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
    },
    cashbookIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cashbookInfo: {
        flex: 1,
        marginLeft: 14,
    },
    cashbookName: {
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: -0.1,
    },
    cashbookMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    cashbookBalance: {
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    emptyContainer: {
        padding: 40,
        alignItems: "center",
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyText: {
        textAlign: "center",
        fontSize: 14,
        lineHeight: 20,
    },
});

interface DashboardScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
    saveTransactions: (transactions: Transaction[]) => void;
    userProfile: UserProfile | null;
}

export default function DashboardScreen({
    businesses,
    transactions,
    currentBusiness,
    setCurrentBusiness,
    saveTransactions,
    userProfile,
}: DashboardScreenProps) {
    if (currentBusiness) {
        return (
            <BusinessDetailView
                business={currentBusiness}
                transactions={transactions.filter((t) => t.businessId === currentBusiness.id)}
                allTransactions={transactions}
                onBack={() => setCurrentBusiness(null)}
                saveTransactions={saveTransactions}
            />
        );
    }

    return (
        <DashboardHome
            businesses={businesses}
            transactions={transactions}
            setCurrentBusiness={setCurrentBusiness}
            userProfile={userProfile}
        />
    );
}
