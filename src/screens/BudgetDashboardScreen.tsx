import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    BackHandler,
    Animated,
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

interface BudgetDashboardScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
}

function getDaysLeft(period: "weekly" | "monthly" | "yearly"): number {
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

function BudgetRing({
    spent,
    limit,
    healthColor,
    theme,
    currencySymbol,
    remaining,
}: {
    spent: number;
    limit: number;
    healthColor: string;
    theme: any;
    currencySymbol: string;
    remaining: number;
}) {
    const size = 180;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(1, spent / Math.max(limit, 1));
    const strokeDashoffset = circumference * (1 - percentage);

    return (
        <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={theme.colors.surface}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={healthColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    rotation={-90}
                    origin={`${size / 2},${size / 2}`}
                />
            </Svg>
            <View style={{ position: "absolute", alignItems: "center" }}>
                <Text
                    style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: theme.colors.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 2,
                    }}
                >
                    Remaining
                </Text>
                <Text
                    style={{
                        fontSize: 26,
                        fontWeight: "800",
                        color: theme.colors.text,
                        letterSpacing: -0.5,
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    {currencySymbol}{remaining.toFixed(0)}
                </Text>
                <Text
                    style={{
                        fontSize: 11,
                        fontWeight: "500",
                        color: healthColor,
                        marginTop: 2,
                    }}
                >
                    {Math.round(percentage * 100)}% used
                </Text>
            </View>
        </View>
    );
}

function AnimatedCategoryRow({
    children,
    index,
}: {
    children: React.ReactNode;
    index: number;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: index * 50,
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
                        <Text style={styles.greetingText}>Financial focus,</Text>
                        <Text style={styles.userNameText}>Budgets</Text>
                    </View>
                </View>
                <View style={s.emptyCenter}>
                    <View style={[s.emptyIconOuter, { backgroundColor: theme.colors.surface }]}>
                        <View style={[s.emptyIconInner, { backgroundColor: theme.colors.incomeBg }]}>
                            <PiggyBank size={32} color={theme.colors.primary} />
                        </View>
                    </View>
                    <Text style={[s.emptyTitle, { color: theme.colors.text }]}>
                        No cashbooks yet
                    </Text>
                    <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>
                        Create a cashbook first to set up budgets
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

    const spentPercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    const healthColor = spentPercentage < 70
        ? theme.colors.success
        : spentPercentage < 90
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
                                                        ? theme.colors.textInverse
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
                        <View style={[s.noBudgetCard, { backgroundColor: theme.colors.card }]}>
                            <View
                                style={[
                                    s.emptyIconOuter,
                                    { backgroundColor: theme.colors.surface },
                                ]}
                            >
                                <View
                                    style={[
                                        s.emptyIconInner,
                                        { backgroundColor: theme.colors.incomeBg },
                                    ]}
                                >
                                    <PiggyBank size={32} color={theme.colors.primary} />
                                </View>
                            </View>
                            <Text style={[s.noBudgetTitle, { color: theme.colors.text }]}>
                                No Budget Set
                            </Text>
                            <Text style={[s.noBudgetText, { color: theme.colors.textSecondary }]}>
                                Set up a budget to track your spending and stay on target
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowSetup(true)}
                                style={[s.setupButton, { backgroundColor: theme.colors.primary }]}
                                activeOpacity={0.8}
                            >
                                <Plus size={20} color={theme.colors.textInverse} />
                                <Text style={[s.setupButtonText, { color: theme.colors.textInverse }]}>
                                    Set Budget
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={[s.summaryCard, { backgroundColor: theme.colors.card }]}>
                            <View style={s.summaryTop}>
                                <View>
                                    <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>
                                        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                                    </Text>
                                    <Text style={[s.periodLabel, { color: theme.colors.text }]}>
                                        {budget.period === "weekly"
                                            ? "This week"
                                            : budget.period === "monthly"
                                              ? "This month"
                                              : "This year"}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowSetup(true)}
                                    style={[s.editBudgetBtn, { borderColor: theme.colors.border }]}
                                >
                                    <Text style={[s.editBudgetText, { color: theme.colors.primary }]}>
                                        Edit
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <BudgetRing
                                spent={totalSpent}
                                limit={totalLimit}
                                healthColor={healthColor}
                                theme={theme}
                                currencySymbol={currencySymbol}
                                remaining={remaining}
                            />

                            <View style={s.summaryFooter}>
                                <View style={s.summaryFooterItem}>
                                    <View style={[s.summaryFooterDot, { backgroundColor: healthColor }]} />
                                    <Text style={[s.summaryFooterText, { color: theme.colors.textSecondary }]}>
                                        {currencySymbol}{totalSpent.toFixed(2)} spent
                                    </Text>
                                </View>
                                <View style={s.summaryFooterItem}>
                                    <View style={[s.summaryFooterDot, { backgroundColor: theme.colors.surface }]} />
                                    <Text style={[s.summaryFooterText, { color: theme.colors.textSecondary }]}>
                                        {currencySymbol}{totalLimit.toFixed(2)} budget
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={s.categorySection}>
                            <Text style={[s.categorySectionTitle, { color: theme.colors.text }]}>
                                By category
                            </Text>

                            {budgetData.length === 0 ? (
                                <View style={[s.emptyCard, { backgroundColor: theme.colors.card }]}>
                                    <AlertCircle size={28} color={theme.colors.textSecondary} />
                                    <Text style={[s.emptyCardText, { color: theme.colors.textSecondary }]}>
                                        No category budgets set
                                    </Text>
                                </View>
                            ) : (
                                <View style={[s.categoryList, { backgroundColor: theme.colors.card }]}>
                                    {budgetData.map((item, index) => {
                                        const isOver = item.spent > item.limit;
                                        const statusColor = getBudgetStatusColor(item.percentage, theme);
                                        const initial = item.categoryName.charAt(0).toUpperCase();
                                        const leftOrOver = isOver
                                            ? item.spent - item.limit
                                            : item.limit - item.spent;

                                        return (
                                            <AnimatedCategoryRow key={item.categoryId} index={index}>
                                                <View
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
                                                        <Text style={[s.categoryInitial, { color: statusColor }]}>
                                                            {initial}
                                                        </Text>
                                                    </View>

                                                    <View style={s.categoryInfo}>
                                                        <Text
                                                            style={[s.categoryName, { color: theme.colors.text }]}
                                                            numberOfLines={1}
                                                        >
                                                            {item.categoryName}
                                                        </Text>
                                                        <View style={s.categoryProgressRow}>
                                                            <View
                                                                style={[
                                                                    s.categoryProgressBg,
                                                                    { backgroundColor: theme.colors.surface },
                                                                ]}
                                                            >
                                                                <View
                                                                    style={[
                                                                        s.categoryProgressFill,
                                                                        {
                                                                            backgroundColor: statusColor,
                                                                            width: `${Math.min(100, item.percentage)}%`,
                                                                        },
                                                                    ]}
                                                                />
                                                            </View>
                                                            <Text
                                                                style={[
                                                                    s.categorySpentLabel,
                                                                    { color: theme.colors.textSecondary },
                                                                ]}
                                                            >
                                                                {currencySymbol}{item.spent.toFixed(0)} / {currencySymbol}{item.limit.toFixed(0)}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text style={[s.categoryStatus, { color: statusColor }]}>
                                                        {isOver ? "-" : ""}
                                                        {currencySymbol}{leftOrOver.toFixed(0)}
                                                    </Text>
                                                </View>
                                            </AnimatedCategoryRow>
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

        // Empty states
        emptyCenter: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 80,
        },
        emptyIconOuter: {
            width: 96,
            height: 96,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
        },
        emptyIconInner: {
            width: 64,
            height: 64,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyTitle: {
            fontSize: 19,
            fontWeight: "700",
            marginBottom: 8,
            letterSpacing: -0.2,
        },
        emptyText: {
            fontSize: 14,
            textAlign: "center",
            paddingHorizontal: 40,
        },

        // No budget
        noBudgetContainer: {
            paddingVertical: 40,
            paddingHorizontal: 20,
        },
        noBudgetCard: {
            padding: 32,
            borderRadius: 20,
            alignItems: "center",
            elevation: 1,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
        },
        noBudgetTitle: {
            fontSize: 19,
            fontWeight: "700",
            marginBottom: 8,
            letterSpacing: -0.2,
        },
        noBudgetText: {
            fontSize: 14,
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 20,
        },
        setupButton: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 13,
            borderRadius: 14,
            gap: 8,
            elevation: 2,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
        },
        setupButtonText: {
            fontSize: 16,
            fontWeight: "700",
        },

        // Summary Card
        summaryCard: {
            marginHorizontal: 20,
            marginBottom: 28,
            padding: 20,
            borderRadius: 20,
            alignItems: "center",
            elevation: 1,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
        },
        summaryTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
            marginBottom: 16,
        },
        summaryLabel: {
            fontSize: 12,
            fontWeight: "500",
        },
        periodLabel: {
            fontSize: 16,
            fontWeight: "700",
            letterSpacing: -0.2,
            marginTop: 2,
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
        summaryFooter: {
            flexDirection: "row",
            justifyContent: "center",
            gap: 24,
            marginTop: 16,
            width: "100%",
        },
        summaryFooterItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        summaryFooterDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
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
            letterSpacing: -0.1,
        },
        categoryList: {
            borderRadius: 20,
            overflow: "hidden",
            elevation: 1,
            shadowColor: theme.colors.shadow,
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
            fontSize: 14,
            fontWeight: "600",
            marginBottom: 6,
        },
        categoryProgressRow: {
            gap: 4,
        },
        categoryProgressBg: {
            height: 4,
            borderRadius: 2,
            overflow: "hidden",
        },
        categoryProgressFill: {
            height: "100%",
            borderRadius: 2,
        },
        categorySpentLabel: {
            fontSize: 11,
            fontWeight: "500",
            marginTop: 2,
        },
        categoryStatus: {
            fontSize: 13,
            fontWeight: "700",
            marginLeft: 8,
            letterSpacing: -0.2,
        },
        emptyCard: {
            padding: 32,
            borderRadius: 20,
            alignItems: "center",
            elevation: 1,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
        },
        emptyCardText: {
            fontSize: 14,
            marginTop: 8,
        },
    });
