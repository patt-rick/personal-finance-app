import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    BackHandler,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    Edit,
    Plus,
    PiggyBank,
    Target,
    BarChart3,
} from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createDashboardStyles } from "../styles/dashboardStyles";
import { Business, Budget, CategoryBudgetSpent, Transaction } from "../types";
import { loadCategories, getBudgetByBusinessId } from "../utils/storage";
import {
    calculateBudgetData,
    calculateTotalSpent,
    calculateTotalLimit,
    calculateBudgetHealthScore,
    getBudgetStatusColor,
    getPeriodDisplayName,
} from "../utils/budgetCalculations";
import { getCurrencySymbol } from "../utils/_helpers";
import BudgetSetupScreen from "./BudgetSetupScreen";
import ChartCarousel from "../components/ChartCarousel";
import DonutChart from "../components/dashboard/DonutChart";
import PairedBarChart from "../components/dashboard/PairedBarChart";
import TourOverlay from "../components/TourOverlay";

const BUDGET_CHART_COLORS = [
    "#2D6A4F", "#C17F59", "#4A7C8F", "#C4453A", "#8B7A9E",
    "#B07D94", "#5B8A72", "#C9A86C",
];

interface BudgetDashboardScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
}

export default function BudgetDashboardScreen({
    businesses,
    transactions,
    currentBusiness,
    setCurrentBusiness,
}: BudgetDashboardScreenProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(currentBusiness);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [budgetData, setBudgetData] = useState<CategoryBudgetSpent[]>([]);
    const [showSetup, setShowSetup] = useState(false);

    const styles = useMemo(() => createDashboardStyles(theme), [theme]);
    const budgetStyles = useMemo(() => createBudgetStyles(theme), [theme]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (showSetup) {
                    setShowSetup(false);
                    return true;
                }
                return false;
            };
            const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
            return () => subscription.remove();
        }, [showSetup])
    );

    useEffect(() => {
        if (currentBusiness) {
            setSelectedBusiness(currentBusiness);
        } else if (businesses.length > 0) {
            setSelectedBusiness(businesses[0]);
        }
    }, [currentBusiness, businesses]);

    useEffect(() => {
        if (selectedBusiness) {
            loadBudgetData();
        }
    }, [selectedBusiness, transactions]);

    const loadBudgetData = async () => {
        if (!selectedBusiness) return;

        setLoading(true);
        const budgetData = await getBudgetByBusinessId(selectedBusiness.id);
        setBudget(budgetData);

        if (budgetData) {
            const categories = await loadCategories();
            const businessTransactions = transactions.filter(
                (t) => t.businessId === selectedBusiness.id,
            );
            const data = calculateBudgetData(budgetData, businessTransactions, categories);
            setBudgetData(data);
        } else {
            setBudgetData([]);
        }

        setLoading(false);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadBudgetData();
        setRefreshing(false);
    }, [selectedBusiness]);

    const handleBusinessSelect = (business: Business) => {
        setSelectedBusiness(business);
        setCurrentBusiness(business);
    };

    const handleSetupComplete = () => {
        setShowSetup(false);
        loadBudgetData();
    };

    if (showSetup && selectedBusiness) {
        return (
            <BudgetSetupScreen
                business={selectedBusiness}
                onBack={() => setShowSetup(false)}
                onSave={handleSetupComplete}
            />
        );
    }

    if (businesses.length === 0) {
        return (
            <View style={styles.container}>
                <View style={[styles.headerDecoration, { height: 240 + insets.top }]} />
                <View style={[styles.modernHeader, { paddingTop: Math.max(insets.top, 40) }]}>
                    <View>
                        <Text style={styles.greetingText}>Financial Focus</Text>
                        <Text style={styles.userNameText}>Budgets</Text>
                    </View>
                </View>
                <View style={styles.emptyContainer}>
                    <PiggyBank size={64} color={theme.colors.textSecondary} />
                    <Text style={[budgetStyles.emptyTitle, { color: theme.colors.text }]}>
                        No Businesses Yet
                    </Text>
                    <Text style={[budgetStyles.emptyText, { color: theme.colors.textSecondary }]}>
                        Create a business first to set up budgets
                    </Text>
                </View>
            </View>
        );
    }

    const totalSpent = calculateTotalSpent(budgetData);
    const totalLimit = budget?.totalLimit || calculateTotalLimit(budgetData);
    const healthScore = calculateBudgetHealthScore(totalSpent, totalLimit);
    const currencySymbol = getCurrencySymbol(selectedBusiness?.currency);

    const healthColor = healthScore >= 70
        ? theme.colors.success
        : healthScore >= 40
            ? theme.colors.secondary
            : theme.colors.error;

    const healthDonutData = [
        { value: healthScore, color: healthColor, label: "Health" },
        { value: Math.min(100, 100 - healthScore), color: theme.colors.surface, label: "Remaining" },
    ];

    const budgetBarLabels = budgetData.map((item) =>
        item.categoryName.length > 6 ? item.categoryName.slice(0, 6) + ".." : item.categoryName,
    );
    const budgetBarLimits = budgetData.map((item) => item.limit);
    const budgetBarSpent = budgetData.map((item) => item.spent);

    const spendingPieItems = budgetData
        .filter((item) => item.spent > 0)
        .map((item, index) => ({
            value: item.spent,
            color: BUDGET_CHART_COLORS[index % BUDGET_CHART_COLORS.length],
            label: item.categoryName,
        }));
    const spendingPieTotal = spendingPieItems.reduce((sum, d) => sum + d.value, 0);

    return (
        <View style={styles.container}>
            <View style={[styles.headerDecoration, { height: 240 + insets.top }]} />

            <View style={[styles.modernHeader, { paddingTop: Math.max(insets.top, 40) }]}>
                <View>
                    <Text style={styles.greetingText}>Keep tracking,</Text>
                    <Text style={styles.userNameText}>Budgeting</Text>
                </View>
            </View>

            <ScrollView
                style={budgetStyles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                    />
                }
            >
                {/* Business Selector */}
                {businesses.length > 1 && (
                    <View style={budgetStyles.section}>
                        <Text style={[budgetStyles.sectionTitle, { color: theme.colors.text }]}>
                            Select Business
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={budgetStyles.businessScroll}
                            contentContainerStyle={{ paddingBottom: 10 }}
                        >
                            {businesses.map((business) => (
                                <TouchableOpacity
                                    key={business.id}
                                    onPress={() => handleBusinessSelect(business)}
                                    style={[
                                        budgetStyles.businessChip,
                                        {
                                            backgroundColor:
                                                selectedBusiness?.id === business.id
                                                    ? theme.colors.primary
                                                    : theme.colors.card,
                                            borderColor: theme.colors.border,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            budgetStyles.businessChipText,
                                            {
                                                color:
                                                    selectedBusiness?.id === business.id
                                                        ? "#fff"
                                                        : theme.colors.text,
                                            },
                                        ]}
                                    >
                                        {business.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {loading ? (
                    <View style={budgetStyles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : !budget ? (
                    <View style={budgetStyles.noBudgetContainer}>
                        <View
                            style={[
                                budgetStyles.noBudgetCard,
                                { backgroundColor: theme.colors.card },
                            ]}
                        >
                            <PiggyBank size={48} color={theme.colors.primary} />
                            <Text
                                style={[budgetStyles.noBudgetTitle, { color: theme.colors.text }]}
                            >
                                No Budget Set
                            </Text>
                            <Text
                                style={[
                                    budgetStyles.noBudgetText,
                                    { color: theme.colors.textSecondary },
                                ]}
                            >
                                Set up a budget to track your spending and stay on target
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowSetup(true)}
                                style={[
                                    budgetStyles.setupButton,
                                    { backgroundColor: theme.colors.primary },
                                ]}
                            >
                                <Plus size={20} color="#fff" />
                                <Text style={budgetStyles.setupButtonText}>Set Budget</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        {/* Budget Health Card with Donut Chart */}
                        <View
                            style={[
                                budgetStyles.healthCard,
                                {
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                        >
                            <View style={budgetStyles.healthHeader}>
                                <View>
                                    <Text
                                        style={[
                                            budgetStyles.healthLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        {getPeriodDisplayName(budget.period)}
                                    </Text>
                                    <Text
                                        style={[
                                            budgetStyles.healthTitle,
                                            { color: theme.colors.text },
                                        ]}
                                    >
                                        Budget Health
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowSetup(true)}
                                    style={[
                                        budgetStyles.editButton,
                                        { backgroundColor: theme.colors.surface },
                                    ]}
                                >
                                    <Edit size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={budgetStyles.healthScoreContainer}>
                                <DonutChart
                                    data={healthDonutData}
                                    total={100}
                                    currencySymbol=""
                                    centerOverride={
                                        <View style={{ alignItems: "center" }}>
                                            <Text
                                                style={{
                                                    fontSize: 26,
                                                    fontWeight: "800",
                                                    color: healthColor,
                                                }}
                                            >
                                                {healthScore.toFixed(0)}%
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: theme.colors.textSecondary,
                                                    fontWeight: "500",
                                                }}
                                            >
                                                {healthScore >= 70
                                                    ? "Excellent"
                                                    : healthScore >= 40
                                                        ? "Fair"
                                                        : "Over Budget"}
                                            </Text>
                                        </View>
                                    }
                                    hideLegend
                                />
                            </View>

                            <View style={budgetStyles.healthStats}>
                                <View style={budgetStyles.statItem}>
                                    <Text
                                        style={[
                                            budgetStyles.statLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        Spent
                                    </Text>
                                    <Text
                                        style={[
                                            budgetStyles.statValue,
                                            { color: theme.colors.error },
                                        ]}
                                    >
                                        {currencySymbol}
                                        {totalSpent.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={budgetStyles.statDivider} />
                                <View style={budgetStyles.statItem}>
                                    <Text
                                        style={[
                                            budgetStyles.statLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        Budget
                                    </Text>
                                    <Text
                                        style={[
                                            budgetStyles.statValue,
                                            { color: theme.colors.text },
                                        ]}
                                    >
                                        {currencySymbol}
                                        {totalLimit.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={budgetStyles.statDivider} />
                                <View style={budgetStyles.statItem}>
                                    <Text
                                        style={[
                                            budgetStyles.statLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        Remaining
                                    </Text>
                                    <Text
                                        style={[
                                            budgetStyles.statValue,
                                            { color: theme.colors.success },
                                        ]}
                                    >
                                        {currencySymbol}
                                        {Math.max(0, totalLimit - totalSpent).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {(budgetBarLabels.length > 0 || spendingPieItems.length > 0) && (
                            <ChartCarousel
                                pages={[
                                    ...(budgetBarLabels.length > 0
                                        ? [
                                              {
                                                  title: "Budget vs Spent",
                                                  legend: [
                                                      { label: "Budget", color: theme.colors.primary + "40" },
                                                      { label: "Spent", color: theme.colors.primary },
                                                  ],
                                                  content: (
                                                      <PairedBarChart
                                                          labels={budgetBarLabels}
                                                          primaryData={budgetBarLimits}
                                                          secondaryData={budgetBarSpent}
                                                          primaryColor={theme.colors.primary + "40"}
                                                          secondaryColor={theme.colors.primary}
                                                          currencySymbol={currencySymbol}
                                                      />
                                                  ),
                                              },
                                          ]
                                        : []),
                                    ...(spendingPieItems.length > 0
                                        ? [
                                              {
                                                  title: "Spending Allocation",
                                                  content: (
                                                      <DonutChart
                                                          data={spendingPieItems}
                                                          total={spendingPieTotal}
                                                          currencySymbol={currencySymbol}
                                                      />
                                                  ),
                                              },
                                          ]
                                        : []),
                                ]}
                            />
                        )}

                        {/* Category Budgets */}
                        <View style={budgetStyles.section}>
                            <Text style={[budgetStyles.sectionTitle, { color: theme.colors.text }]}>
                                Category Breakdown
                            </Text>

                            {budgetData.length === 0 ? (
                                <View
                                    style={[
                                        budgetStyles.emptyCard,
                                        { backgroundColor: theme.colors.card },
                                    ]}
                                >
                                    <AlertCircle size={32} color={theme.colors.textSecondary} />
                                    <Text
                                        style={[
                                            budgetStyles.emptyCardText,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        No category budgets set
                                    </Text>
                                </View>
                            ) : (
                                budgetData.map((item) => {
                                    const statusColor = getBudgetStatusColor(
                                        item.percentage,
                                        theme,
                                    );
                                    return (
                                        <View
                                            key={item.categoryId}
                                            style={[
                                                budgetStyles.categoryCard,
                                                { backgroundColor: theme.colors.card },
                                            ]}
                                        >
                                            <View style={budgetStyles.categoryHeader}>
                                                <Text
                                                    style={[
                                                        budgetStyles.categoryName,
                                                        { color: theme.colors.text },
                                                    ]}
                                                >
                                                    {item.categoryName}
                                                </Text>
                                                <Text
                                                    style={[
                                                        budgetStyles.categoryPercentage,
                                                        { color: statusColor },
                                                    ]}
                                                >
                                                    {item.percentage.toFixed(0)}%
                                                </Text>
                                            </View>

                                            <View
                                                style={[
                                                    budgetStyles.progressBarBg,
                                                    { backgroundColor: theme.colors.surface },
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        budgetStyles.progressBarFill,
                                                        {
                                                            width: `${Math.min(
                                                                100,
                                                                item.percentage,
                                                            )}%`,
                                                            backgroundColor: statusColor,
                                                        },
                                                    ]}
                                                />
                                            </View>

                                            <View style={budgetStyles.categoryFooter}>
                                                <View>
                                                    <Text
                                                        style={[
                                                            budgetStyles.categoryAmount,
                                                            { color: theme.colors.text },
                                                        ]}
                                                    >
                                                        {currencySymbol}
                                                        {item.spent.toFixed(2)} / {currencySymbol}
                                                        {item.limit.toFixed(2)}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            budgetStyles.categoryRemaining,
                                                            { color: theme.colors.textSecondary },
                                                        ]}
                                                    >
                                                        {currencySymbol}
                                                        {item.remaining.toFixed(2)} remaining
                                                    </Text>
                                                </View>
                                                {item.percentage >= 90 && (
                                                    <AlertCircle size={20} color={statusColor} />
                                                )}
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <TourOverlay
                page="budget"
                steps={[
                    {
                        title: "Budget Tracking",
                        icon: <PiggyBank size={24} color={theme.colors.primary} />,
                        description:
                            "Set spending limits for each cashbook to stay on top of your finances. Budgets can be weekly, monthly, or yearly.",
                    },
                    {
                        title: "Health Score",
                        icon: <Target size={24} color={theme.colors.primary} />,
                        description:
                            "Your budget health score shows how well you're staying within your limits. Green means great, yellow needs attention, red means over budget.",
                    },
                    {
                        title: "Category Breakdown",
                        icon: <BarChart3 size={24} color={theme.colors.primary} />,
                        description:
                            "Track spending per category with progress bars. Set individual limits for food, transport, and more to control where your money goes.",
                    },
                ]}
            />
        </View>
    );
}

const createBudgetStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
        },
        headerTitle: {
            fontSize: 24,
            fontWeight: "700",
        },
        content: {
            flex: 1,
            padding: 16,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
        },
        businessScroll: {
            marginBottom: 8,
        },
        businessChip: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            marginRight: 8,
            borderWidth: 1,
        },
        businessChipText: {
            fontSize: 14,
            fontWeight: "500",
        },
        loadingContainer: {
            paddingVertical: 60,
            alignItems: "center",
        },
        emptyContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
        },
        emptyTitle: {
            fontSize: 20,
            fontWeight: "600",
            marginTop: 16,
            marginBottom: 8,
        },
        emptyText: {
            fontSize: 14,
            textAlign: "center",
        },
        noBudgetContainer: {
            paddingVertical: 40,
        },
        noBudgetCard: {
            padding: 32,
            borderRadius: 16,
            alignItems: "center",
        },
        noBudgetTitle: {
            fontSize: 20,
            fontWeight: "600",
            marginTop: 16,
            marginBottom: 8,
        },
        noBudgetText: {
            fontSize: 14,
            textAlign: "center",
            marginBottom: 24,
        },
        setupButton: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
            gap: 8,
        },
        setupButtonText: {
            color: "#fff",
            fontSize: 16,
            fontWeight: "600",
        },
        healthCard: {
            padding: 20,
            borderRadius: 16,
            marginBottom: 24,
            borderWidth: 1,
        },
        healthHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
        },
        healthLabel: {
            fontSize: 13,
            marginBottom: 4,
        },
        healthTitle: {
            fontSize: 18,
            fontWeight: "700",
        },
        editButton: {
            padding: 8,
            borderRadius: 8,
        },
        healthScoreContainer: {
            alignItems: "center",
            marginBottom: 20,
        },
        healthStats: {
            flexDirection: "row",
            justifyContent: "space-around",
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
        },
        statItem: {
            alignItems: "center",
            flex: 1,
        },
        statLabel: {
            fontSize: 12,
            marginBottom: 4,
        },
        statValue: {
            fontSize: 16,
            fontWeight: "700",
        },
        statDivider: {
            width: 1,
            backgroundColor: theme.colors.border,
        },

        // Category cards
        categoryCard: {
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 2,
        },
        categoryHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
        },
        categoryName: {
            fontSize: 15,
            fontWeight: "600",
        },
        categoryPercentage: {
            fontSize: 15,
            fontWeight: "700",
        },
        progressBarBg: {
            height: 8,
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 12,
        },
        progressBarFill: {
            height: "100%",
            borderRadius: 4,
        },
        categoryFooter: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        categoryAmount: {
            fontSize: 14,
            fontWeight: "600",
            marginBottom: 2,
        },
        categoryRemaining: {
            fontSize: 12,
        },
        emptyCard: {
            padding: 32,
            borderRadius: 12,
            alignItems: "center",
        },
        emptyCardText: {
            fontSize: 14,
            marginTop: 8,
        },
    });
