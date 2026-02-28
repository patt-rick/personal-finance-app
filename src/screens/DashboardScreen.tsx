import { getCurrencySymbol } from "../utils/_helpers";
import { Bell, Users, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react-native";
import React, { useMemo } from "react";
import { Dimensions, ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { Business, Transaction, UserProfile } from "../types";
import BusinessDetailView from "./BusinessDetailView";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { LinearGradient } from "expo-linear-gradient";
import { PieChart, BarChart } from "react-native-gifted-charts";
import ChartCarousel from "../components/ChartCarousel";

const { width } = Dimensions.get("window");

const CHART_COLORS = [
    "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#06B6D4", "#84CC16",
];

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
    const styles = useMemo(() => createDashboardStyles(theme), [theme]);
    const localStyles = useMemo(() => createLocalStyles(theme), [theme]);

    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((acc, t) => acc + t.amount, 0);
    const totalBalance = totalIncome - totalExpense;

    const businessPieData = useMemo(() => {
        return businesses
            .map((biz, index) => {
                const bizExpense = transactions
                    .filter((t) => t.businessId === biz.id && t.type === "expense")
                    .reduce((acc, t) => acc + t.amount, 0);
                return {
                    value: bizExpense,
                    color: CHART_COLORS[index % CHART_COLORS.length],
                    text: biz.name,
                    label: biz.name,
                };
            })
            .filter((d) => d.value > 0);
    }, [businesses, transactions]);

    const weeklyBarData = useMemo(() => {
        const days: any[] = [];
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

    const hasTransactions = transactions.length > 0;

    // Build carousel pages
    const chartPages = useMemo(() => {
        const pages: { title: string; legend?: { label: string; color: string }[]; content: React.ReactNode }[] = [];

        if (hasTransactions) {
            pages.push({
                title: "Weekly Cash Flow",
                legend: [
                    { label: "In", color: "#6366F1" },
                    { label: "Out", color: "#F59E0B" },
                ],
                content: (
                    <BarChart
                        data={weeklyBarData}
                        barWidth={12}
                        spacing={16}
                        roundedTop
                        roundedBottom
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
                        noOfSections={4}
                        height={140}
                        width={width - 100}
                        hideRules
                        isAnimated
                    />
                ),
            });
        }

        if (businessPieData.length > 0) {
            pages.push({
                title: "Spending by Cashbook",
                content: (
                    <View style={localStyles.pieContent}>
                        <PieChart
                            data={businessPieData}
                            donut
                            radius={60}
                            innerRadius={38}
                            innerCircleColor={theme.colors.card}
                            centerLabelComponent={() => (
                                <View style={{ alignItems: "center" }}>
                                    <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.text }}>
                                        ${totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </Text>
                                    <Text style={{ fontSize: 9, color: theme.colors.textSecondary }}>Total</Text>
                                </View>
                            )}
                        />
                        <View style={localStyles.pieLegendContainer}>
                            {businessPieData.map((item, index) => (
                                <View key={index} style={localStyles.pieLegendItem}>
                                    <View style={[localStyles.pieLegendDot, { backgroundColor: item.color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[localStyles.pieLegendLabel, { color: theme.colors.text }]} numberOfLines={1}>
                                            {item.text}
                                        </Text>
                                        <Text style={[localStyles.pieLegendValue, { color: theme.colors.textSecondary }]}>
                                            ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ),
            });
        }

        return pages;
    }, [hasTransactions, weeklyBarData, businessPieData, totalExpense, theme, localStyles]);

    return (
        <View style={styles.container}>
            <View style={[styles.headerDecoration, { height: 240 + insets.top }]} />

            <View style={[styles.modernHeader, { paddingTop: Math.max(insets.top, 40) }]}>
                <View>
                    <Text style={styles.greetingText}>Welcome back,</Text>
                    <Text style={styles.userNameText}>{userProfile?.name || "John Doe"}</Text>
                </View>
                <TouchableOpacity style={styles.notificationBtn}>
                    <Bell size={22} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Balance Overview Card */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={["#3A5CFF", "#2F3FD4", "#1E2A8A"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroGlow} />
                        <View style={localStyles.balanceOverviewRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={localStyles.balanceLabel}>Total Balance</Text>
                                <Text style={localStyles.balanceAmount}>
                                    ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </View>
                            <View style={localStyles.balanceBadge}>
                                <Wallet size={20} color="rgba(255,255,255,0.9)" />
                            </View>
                        </View>

                        <View style={localStyles.miniStatsRow}>
                            <View style={localStyles.miniStat}>
                                <View style={localStyles.miniStatIcon}>
                                    <ArrowUpRight size={14} color="#4ADE80" />
                                </View>
                                <View>
                                    <Text style={localStyles.miniStatLabel}>Income</Text>
                                    <Text style={localStyles.miniStatValue}>
                                        ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </Text>
                                </View>
                            </View>
                            <View style={localStyles.miniStatDivider} />
                            <View style={localStyles.miniStat}>
                                <View style={[localStyles.miniStatIcon, { backgroundColor: "rgba(248,113,113,0.2)" }]}>
                                    <ArrowDownRight size={14} color="#F87171" />
                                </View>
                                <View>
                                    <Text style={localStyles.miniStatLabel}>Expenses</Text>
                                    <Text style={localStyles.miniStatValue}>
                                        ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Charts Carousel */}
                {chartPages.length > 0 && <ChartCarousel pages={chartPages} />}

                {/* Businesses / Cashbooks List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Your Cashbooks</Text>
                    <Text style={styles.viewAllText}>{businesses.length} total</Text>
                </View>

                <View style={styles.cashbooksListModern}>
                    {businesses.map((business) => {
                        const bizTransactions = transactions.filter(
                            (t) => t.businessId === business.id,
                        );
                        const balance = bizTransactions.reduce(
                            (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
                            0,
                        );
                        const symbol = getCurrencySymbol(business.currency);
                        const txCount = bizTransactions.length;

                        return (
                            <TouchableOpacity
                                key={business.id}
                                style={styles.modernCashbookItem}
                                onPress={() => setCurrentBusiness(business)}
                            >
                                <View style={styles.cashbookIconModern}>
                                    <Users size={22} color={theme.colors.primary} />
                                </View>
                                <View style={styles.cashbookInfoModern}>
                                    <Text style={styles.cashbookNameModern}>{business.name}</Text>
                                    <Text style={styles.cashbookMetaModern}>
                                        {txCount} transaction{txCount !== 1 ? "s" : ""} · {business.currency || "USD"}
                                    </Text>
                                </View>
                                <View style={styles.balanceContainerModern}>
                                    <Text
                                        style={[
                                            styles.cashbookBalanceModern,
                                            balance >= 0
                                                ? { color: theme.colors.success }
                                                : { color: theme.colors.error },
                                        ]}
                                    >
                                        {balance >= 0 ? "+" : "-"}
                                        {symbol}
                                        {Math.abs(balance).toLocaleString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    {businesses.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Users size={40} color={theme.colors.placeholder} />
                            </View>
                            <Text style={styles.emptyText}>
                                Go to Cashbooks tab to add your first business!
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const createLocalStyles = (theme: any) =>
    StyleSheet.create({
        balanceOverviewRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
        },
        balanceLabel: {
            fontSize: 13,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 4,
            fontWeight: "500",
            letterSpacing: 0.3,
        },
        balanceAmount: {
            fontSize: 30,
            fontWeight: "800",
            color: "white",
            letterSpacing: -0.5,
        },
        balanceBadge: {
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
        },
        miniStatsRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 14,
            padding: 12,
        },
        miniStat: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        miniStatIcon: {
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: "rgba(74,222,128,0.2)",
            alignItems: "center",
            justifyContent: "center",
        },
        miniStatLabel: {
            fontSize: 10,
            color: "rgba(255,255,255,0.6)",
            fontWeight: "500",
        },
        miniStatValue: {
            fontSize: 14,
            color: "white",
            fontWeight: "700",
        },
        miniStatDivider: {
            width: 1,
            height: 28,
            backgroundColor: "rgba(255,255,255,0.15)",
            marginHorizontal: 12,
        },
        pieContent: {
            flexDirection: "row",
            alignItems: "center",
        },
        pieLegendContainer: {
            flex: 1,
            marginLeft: 16,
            gap: 8,
        },
        pieLegendItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        pieLegendDot: {
            width: 9,
            height: 9,
            borderRadius: 4.5,
        },
        pieLegendLabel: {
            fontSize: 12,
            fontWeight: "600",
        },
        pieLegendValue: {
            fontSize: 10,
        },
    });

// --- Main Export ---

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
