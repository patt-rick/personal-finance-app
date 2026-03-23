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
    Plus,
    PiggyBank,
    Target,
    BarChart3,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
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
    getDateRangeForPeriod,
} from "../utils/budgetCalculations";
import { getCurrencySymbol } from "../utils/_helpers";
import BudgetSetupScreen from "./BudgetSetupScreen";
import TourOverlay from "../components/TourOverlay";

const CATEGORY_COLORS = [
    "#2D6A4F", "#C17F59", "#4A7C8F", "#C4453A", "#8B7A9E",
    "#B07D94", "#5B8A72", "#C9A86C",
];

interface BudgetDashboardScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
}

function getDaysLeft(period: "weekly" | "monthly" | "yearly"): number {
    const { endDate } = getDateRangeForPeriod(period);
    const now = new Date();
    let periodEnd: Date;

    switch (period) {
        case "weekly": {
            const dayOfWeek = now.getDay();
            periodEnd = new Date(now);
            periodEnd.setDate(now.getDate() + (6 - dayOfWeek));
            periodEnd.setHours(23, 59, 59, 999);
            break;
        }
        case "monthly": {
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            periodEnd.setHours(23, 59, 59, 999);
            break;
        }
        case "yearly": {
            periodEnd = new Date(now.getFullYear(), 11, 31);
            periodEnd.setHours(23, 59, 59, 999);
            break;
        }
    }

    const diffMs = periodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
    const s = useMemo(() => createBudgetStyles(theme), [theme]);

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
                    <Text style={[s.emptyTitle, { color: theme.colors.text }]}>
                        No Businesses Yet
                    </Text>
                    <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>
                        Create a business first to set up budgets
                    </Text>
                </View>
            </View>
        );
    }

    const totalSpent = calculateTotalSpent(budgetData);
    const totalLimit = budget?.totalLimit || calculateTotalLimit(budgetData);
    const remaining = Math.max(0, totalLimit - totalSpent);
    const healthScore = calculateBudgetHealthScore(totalSpent, totalLimit);
    const currencySymbol = getCurrencySymbol(selectedBusiness?.currency);
    const daysLeft = budget ? getDaysLeft(budget.period) : 0;

    const healthColor = healthScore >= 70
        ? theme.colors.success
        : healthScore >= 40
            ? theme.colors.secondary
            : theme.colors.error;

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
                style={s.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
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
                    <View style={s.section}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 10 }}
                        >
                            {businesses.map((business) => (
                                <TouchableOpacity
                                    key={business.id}
                                    onPress={() => handleBusinessSelect(business)}
                                    style={[
                                        s.businessChip,
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
                                            s.businessChipText,
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
                    <View style={s.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : !budget ? (
                    <View style={s.noBudgetContainer}>
                        <View
                            style={[s.noBudgetCard, { backgroundColor: theme.colors.card }]}
                        >
                            <PiggyBank size={48} color={theme.colors.primary} />
                            <Text style={[s.noBudgetTitle, { color: theme.colors.text }]}>
                                No Budget Set
                            </Text>
                            <Text style={[s.noBudgetText, { color: theme.colors.textSecondary }]}>
                                Set up a budget to track your spending and stay on target
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowSetup(true)}
                                style={[s.setupButton, { backgroundColor: theme.colors.primary }]}
                            >
                                <Plus size={20} color="#fff" />
                                <Text style={s.setupButtonText}>Set Budget</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        {/* Summary Card */}
                        <View style={[s.summaryCard, { backgroundColor: theme.colors.card }]}>
                            <View style={s.summaryTop}>
                                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>
                                    Left for {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowSetup(true)}
                                    style={[s.editBudgetBtn, { borderColor: theme.colors.border }]}
                                >
                                    <Text style={[s.editBudgetText, { color: theme.colors.primary }]}>
                                        Edit budget
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[s.remainingAmount, { color: theme.colors.text }]}>
                                {currencySymbol}{remaining.toFixed(2)}
                            </Text>

                            <View
                                style={[s.summaryProgressBg, { backgroundColor: theme.colors.surface }]}
                            >
                                <View
                                    style={[
                                        s.summaryProgressFill,
                                        {
                                            backgroundColor: healthColor,
                                            width: `${Math.min(100, (totalSpent / Math.max(totalLimit, 1)) * 100)}%`,
                                        },
                                    ]}
                                />
                            </View>

                            <View style={s.summaryFooter}>
                                <Text style={[s.summaryFooterText, { color: theme.colors.textSecondary }]}>
                                    {currencySymbol}{totalSpent.toFixed(2)} already spent
                                </Text>
                                <Text style={[s.summaryFooterText, { color: theme.colors.textSecondary }]}>
                                    {currencySymbol}{totalLimit.toFixed(2)} set budget
                                </Text>
                            </View>
                        </View>

                        {/* Category List */}
                        <View style={s.categorySection}>
                            <Text style={[s.categorySectionTitle, { color: theme.colors.text }]}>
                                Budget categories
                            </Text>

                            {budgetData.length === 0 ? (
                                <View style={[s.emptyCard, { backgroundColor: theme.colors.card }]}>
                                    <AlertCircle size={32} color={theme.colors.textSecondary} />
                                    <Text style={[s.emptyCardText, { color: theme.colors.textSecondary }]}>
                                        No category budgets set
                                    </Text>
                                </View>
                            ) : (
                                <View style={[s.categoryList, { backgroundColor: theme.colors.card }]}>
                                    {budgetData.map((item, index) => {
                                        const isOver = item.spent > item.limit;
                                        const statusColor = getBudgetStatusColor(item.percentage, theme);
                                        const iconColor = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                                        const initial = item.categoryName.charAt(0).toUpperCase();
                                        const leftOrOver = isOver
                                            ? item.spent - item.limit
                                            : item.limit - item.spent;

                                        return (
                                            <View
                                                key={item.categoryId}
                                                style={[
                                                    s.categoryRow,
                                                    index < budgetData.length - 1 && {
                                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                                        borderBottomColor: theme.colors.borderLight,
                                                    },
                                                ]}
                                            >
                                                <View style={s.categoryIcon}>
                                                    <Svg width={40} height={40} viewBox="0 0 40 40">
                                                        <Circle
                                                            cx={20}
                                                            cy={20}
                                                            r={16}
                                                            stroke={theme.colors.surface}
                                                            strokeWidth={4}
                                                            fill="none"
                                                        />
                                                        <Circle
                                                            cx={20}
                                                            cy={20}
                                                            r={16}
                                                            stroke={statusColor}
                                                            strokeWidth={4}
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeDasharray={`${Math.min(item.percentage, 100) / 100 * 100.5} 100.5`}
                                                            rotation={-90}
                                                            origin="20,20"
                                                        />
                                                    </Svg>
                                                    <Text style={[s.categoryInitial, { color: iconColor }]}>
                                                        {initial}
                                                    </Text>
                                                </View>

                                                <View style={s.categoryInfo}>
                                                    <Text style={[s.categoryName, { color: theme.colors.text }]} numberOfLines={1}>
                                                        {item.categoryName}
                                                    </Text>
                                                    <Text style={[s.categorySpent, { color: theme.colors.textSecondary }]}>
                                                        {currencySymbol}{item.spent.toFixed(2)}{" "}
                                                        <Text style={{ fontWeight: "400" }}>of</Text>{" "}
                                                        {currencySymbol}{item.limit.toFixed(2)}
                                                    </Text>
                                                </View>

                                                <Text style={[s.categoryStatus, { color: statusColor }]}>
                                                    {currencySymbol}{leftOrOver.toFixed(2)} {isOver ? "over" : "left"}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
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
                        title: "Remaining Budget",
                        icon: <Target size={24} color={theme.colors.primary} />,
                        description:
                            "See how much you have left at a glance. The progress bar and color tell you if you're on track or overspending.",
                    },
                    {
                        title: "Category Breakdown",
                        icon: <BarChart3 size={24} color={theme.colors.primary} />,
                        description:
                            "Track spending per category. Each row shows how much you've spent vs your limit, and how much is left.",
                    },
                ]}
            />
        </View>
    );
}

const createBudgetStyles = (theme: any) =>
    StyleSheet.create({
        content: {
            flex: 1,
        },
        section: {
            marginBottom: 16,
            paddingHorizontal: 20,
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
            paddingHorizontal: 20,
        },
        noBudgetCard: {
            padding: 32,
            borderRadius: 20,
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

        // Summary Card
        summaryCard: {
            marginHorizontal: 20,
            marginBottom: 28,
            padding: 20,
            borderRadius: 20,
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
        },
        summaryTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
        },
        summaryLabel: {
            fontSize: 13,
            fontWeight: "500",
        },
        editBudgetBtn: {
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
        },
        editBudgetText: {
            fontSize: 12,
            fontWeight: "600",
        },
        remainingAmount: {
            fontSize: 36,
            fontWeight: "800",
            letterSpacing: -1,
            marginBottom: 16,
        },
        summaryProgressBg: {
            height: 8,
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 12,
        },
        summaryProgressFill: {
            height: "100%",
            borderRadius: 4,
        },
        summaryFooter: {
            flexDirection: "row",
            justifyContent: "space-between",
        },
        summaryFooterText: {
            fontSize: 12,
            fontWeight: "500",
        },

        // Category Section
        categorySection: {
            paddingHorizontal: 20,
        },
        categorySectionTitle: {
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
        },
        categoryList: {
            borderRadius: 20,
            overflow: "hidden",
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
        },
        categoryRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
        },
        categoryIcon: {
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
        },
        categoryInitial: {
            position: "absolute",
            fontSize: 13,
            fontWeight: "700",
        },
        categoryInfo: {
            flex: 1,
            marginLeft: 12,
        },
        categoryName: {
            fontSize: 15,
            fontWeight: "600",
            marginBottom: 2,
        },
        categorySpent: {
            fontSize: 12,
            fontWeight: "500",
        },
        categoryStatus: {
            fontSize: 13,
            fontWeight: "600",
            marginLeft: 8,
        },
        emptyCard: {
            padding: 32,
            borderRadius: 20,
            alignItems: "center",
        },
        emptyCardText: {
            fontSize: 14,
            marginTop: 8,
        },
    });
