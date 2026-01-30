import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrendingUp, AlertCircle, Edit, Plus, PiggyBank, ChevronRight } from "lucide-react-native";
import { useTheme } from "../theme/theme";
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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(currentBusiness);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [budgetData, setBudgetData] = useState<CategoryBudgetSpent[]>([]);
    const [showSetup, setShowSetup] = useState(false);

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
    }, [selectedBusiness]);

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
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.emptyContainer}>
                    <PiggyBank size={64} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                        No Businesses Yet
                    </Text>
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                        Create a business first to set up budgets
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const totalSpent = calculateTotalSpent(budgetData);
    const totalLimit = budget?.totalLimit || calculateTotalLimit(budgetData);
    const healthScore = calculateBudgetHealthScore(totalSpent, totalLimit);
    const currencySymbol = getCurrencySymbol(selectedBusiness?.currency);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    Budget Tracker
                </Text>
            </View>

            <ScrollView
                style={styles.content}
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
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Select Business
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.businessScroll}
                        >
                            {businesses.map((business) => (
                                <TouchableOpacity
                                    key={business.id}
                                    onPress={() => handleBusinessSelect(business)}
                                    style={[
                                        styles.businessChip,
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
                                            styles.businessChipText,
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
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : !budget ? (
                    // No Budget Set
                    <View style={styles.noBudgetContainer}>
                        <View style={[styles.noBudgetCard, { backgroundColor: theme.colors.card }]}>
                            <PiggyBank size={48} color={theme.colors.primary} />
                            <Text style={[styles.noBudgetTitle, { color: theme.colors.text }]}>
                                No Budget Set
                            </Text>
                            <Text
                                style={[styles.noBudgetText, { color: theme.colors.textSecondary }]}
                            >
                                Set up a budget to track your spending and stay on target
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowSetup(true)}
                                style={[
                                    styles.setupButton,
                                    { backgroundColor: theme.colors.primary },
                                ]}
                            >
                                <Plus size={20} color="#fff" />
                                <Text style={styles.setupButtonText}>Set Budget</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        {/* Budget Health Score */}
                        <View
                            style={[
                                styles.healthCard,
                                {
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                        >
                            <View style={styles.healthHeader}>
                                <View>
                                    <Text
                                        style={[
                                            styles.healthLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        {getPeriodDisplayName(budget.period)}
                                    </Text>
                                    <Text
                                        style={[styles.healthTitle, { color: theme.colors.text }]}
                                    >
                                        Budget Health
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowSetup(true)}
                                    style={[
                                        styles.editButton,
                                        { backgroundColor: theme.colors.surface },
                                    ]}
                                >
                                    <Edit size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.healthScoreContainer}>
                                <View style={styles.scoreCircle}>
                                    <Text
                                        style={[
                                            styles.scoreText,
                                            {
                                                color:
                                                    healthScore >= 70
                                                        ? theme.colors.success
                                                        : healthScore >= 40
                                                          ? theme.colors.secondary
                                                          : theme.colors.error,
                                            },
                                        ]}
                                    >
                                        {healthScore.toFixed(0)}%
                                    </Text>
                                    <Text
                                        style={[
                                            styles.scoreLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        {healthScore >= 70
                                            ? "Excellent"
                                            : healthScore >= 40
                                              ? "Fair"
                                              : "Over Budget"}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.healthStats}>
                                <View style={styles.statItem}>
                                    <Text
                                        style={[
                                            styles.statLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        Spent
                                    </Text>
                                    <Text style={[styles.statValue, { color: theme.colors.error }]}>
                                        {currencySymbol}
                                        {totalSpent.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text
                                        style={[
                                            styles.statLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        Budget
                                    </Text>
                                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                        {currencySymbol}
                                        {totalLimit.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text
                                        style={[
                                            styles.statLabel,
                                            { color: theme.colors.textSecondary },
                                        ]}
                                    >
                                        Remaining
                                    </Text>
                                    <Text
                                        style={[styles.statValue, { color: theme.colors.success }]}
                                    >
                                        {currencySymbol}
                                        {Math.max(0, totalLimit - totalSpent).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Category Budgets */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                Category Breakdown
                            </Text>

                            {budgetData.length === 0 ? (
                                <View
                                    style={[
                                        styles.emptyCard,
                                        { backgroundColor: theme.colors.card },
                                    ]}
                                >
                                    <AlertCircle size={32} color={theme.colors.textSecondary} />
                                    <Text
                                        style={[
                                            styles.emptyCardText,
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
                                                styles.categoryCard,
                                                { backgroundColor: theme.colors.card },
                                            ]}
                                        >
                                            <View style={styles.categoryHeader}>
                                                <Text
                                                    style={[
                                                        styles.categoryName,
                                                        { color: theme.colors.text },
                                                    ]}
                                                >
                                                    {item.categoryName}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.categoryPercentage,
                                                        { color: statusColor },
                                                    ]}
                                                >
                                                    {item.percentage.toFixed(0)}%
                                                </Text>
                                            </View>

                                            {/* Progress Bar */}
                                            <View
                                                style={[
                                                    styles.progressBarBg,
                                                    { backgroundColor: theme.colors.surface },
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
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

                                            <View style={styles.categoryFooter}>
                                                <View>
                                                    <Text
                                                        style={[
                                                            styles.categoryAmount,
                                                            { color: theme.colors.text },
                                                        ]}
                                                    >
                                                        {currencySymbol}
                                                        {item.spent.toFixed(2)} / {currencySymbol}
                                                        {item.limit.toFixed(2)}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.categoryRemaining,
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
        fontFamily: "Outfit",
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
        fontWeight: "600",
        fontFamily: "Inter",
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
        fontFamily: "Inter",
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
        fontFamily: "Inter",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: "Inter",
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
        fontFamily: "Inter",
        marginTop: 16,
        marginBottom: 8,
    },
    noBudgetText: {
        fontSize: 14,
        fontFamily: "Inter",
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
        fontFamily: "Inter",
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
        marginBottom: 20,
    },
    healthLabel: {
        fontSize: 13,
        fontFamily: "Inter",
        marginBottom: 4,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: "600",
        fontFamily: "Inter",
    },
    editButton: {
        padding: 8,
        borderRadius: 8,
    },
    healthScoreContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    scoreCircle: {
        alignItems: "center",
    },
    scoreText: {
        fontSize: 48,
        fontWeight: "700",
        fontFamily: "Outfit",
    },
    scoreLabel: {
        fontSize: 14,
        fontFamily: "Inter",
        marginTop: 4,
    },
    healthStats: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: "Inter",
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Inter",
    },
    statDivider: {
        width: 1,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    categoryCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
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
        fontFamily: "Inter",
    },
    categoryPercentage: {
        fontSize: 15,
        fontWeight: "700",
        fontFamily: "Inter",
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
        fontFamily: "Inter",
        marginBottom: 2,
    },
    categoryRemaining: {
        fontSize: 12,
        fontFamily: "Inter",
    },
    emptyCard: {
        padding: 32,
        borderRadius: 12,
        alignItems: "center",
    },
    emptyCardText: {
        fontSize: 14,
        fontFamily: "Inter",
        marginTop: 8,
    },
});
